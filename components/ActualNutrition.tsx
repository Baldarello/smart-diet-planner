import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { NutritionInfo } from '../types';
import { t } from '../i18n';
import { RefreshIcon } from './Icons';

const NutritionComparisonItem: React.FC<{ label: string, unit: string, plannedValue: number, actualValue: number }> = ({ label, unit, plannedValue, actualValue }) => {
    const diff = actualValue - plannedValue;
    const sign = diff > 0 ? '+' : '';
    let diffColor = 'text-gray-500 dark:text-gray-400';
    if (diff < -0.5) diffColor = 'text-red-500';
    if (diff > 0.5) diffColor = 'text-green-500';

    return (
        <div className="text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
            <p className="font-semibold text-lg text-gray-700 dark:text-gray-200">{Math.round(actualValue)}{unit}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 h-4">
                {t('plannedShort')}: {Math.round(plannedValue)}{unit}
                {Math.abs(diff) >= 1 && (
                    <span className={`font-medium ml-1 ${diffColor}`}>
                        ({sign}{Math.round(diff)})
                    </span>
                )}
            </p>
        </div>
    );
};


const NutritionComparison: React.FC<{ planned: NutritionInfo | null | undefined, actual: NutritionInfo }> = ({ planned, actual }) => {
    if (!planned) return null;

    return (
        <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-700/50">
            <h5 className="font-semibold text-sm text-center text-green-800 dark:text-green-300 mb-2">{t('actualIntakeTitle')}</h5>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                <NutritionComparisonItem label={t('nutritionCarbs')} unit={t('nutritionUnitG')} plannedValue={planned.carbs} actualValue={actual.carbs} />
                <NutritionComparisonItem label={t('nutritionProtein')} unit={t('nutritionUnitG')} plannedValue={planned.protein} actualValue={actual.protein} />
                <NutritionComparisonItem label={t('nutritionFat')} unit={t('nutritionUnitG')} plannedValue={planned.fat} actualValue={actual.fat} />
                <NutritionComparisonItem label={t('nutritionCalories')} unit={t('nutritionUnitKcal')} plannedValue={planned.calories} actualValue={actual.calories} />
            </div>
            <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">{t('nutritionDisclaimer')}</p>
        </div>
    );
};


const ActualNutrition: React.FC<{ dayIndex: number, mealIndex: number }> = observer(({ dayIndex, mealIndex }) => {
    const { dailyPlan, recalculateActualMealNutrition, recalculatingActualMeal } = mealPlanStore;
    const meal = dailyPlan?.meals[mealIndex];

    if (!meal) return null;

    const usedItemsCount = meal.items.filter(i => i.used).length;
    const totalItemsCount = meal.items.length;
    
    const shouldShow = meal.done && usedItemsCount > 0 && usedItemsCount < totalItemsCount;
    const isRecalculating = recalculatingActualMeal?.mealIndex === mealIndex;

    if (!shouldShow) return null;

    if (meal.actualNutrition) {
        return <NutritionComparison planned={meal.nutrition} actual={meal.actualNutrition} />;
    }
    
    if (isRecalculating) {
        return (
            <div className="mt-3 flex items-center justify-center p-2 text-sm text-gray-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-700/50 rounded-lg">
                <div className="animate-spin h-4 w-4 border-b-2 border-violet-600 rounded-full mr-2"></div>
                {t('recalculatingActuals')}
            </div>
        );
    }

    return (
        <div className="mt-3 text-center">
            <button
                onClick={() => recalculateActualMealNutrition()}
                className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 font-semibold px-4 py-2 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors text-sm flex items-center mx-auto"
            >
                <RefreshIcon />
                <span className="ml-2">{t('recalculateActualsButton')}</span>
            </button>
        </div>
    );
});

export default ActualNutrition;