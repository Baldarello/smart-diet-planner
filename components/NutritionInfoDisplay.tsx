import React from 'react';
import { observer } from 'mobx-react-lite';
import { NutritionInfo } from '../types';
import { t } from '../i18n';
import SkeletonLoader from './SkeletonLoader';
import { mealPlanStore } from '../stores/MealPlanStore';
import { RefreshIcon } from './Icons';

const NutritionItem: React.FC<{ label: string, value: number, unit: string }> = ({ label, value, unit }) => (
    <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="font-semibold text-gray-700 dark:text-gray-200">{Math.round(value)}{unit}</p>
    </div>
);

interface NutritionInfoDisplayProps {
    nutrition: NutritionInfo | null | undefined;
    dayIndex: number;
    mealIndex: number;
    isMasterPlanView?: boolean;
    onRecalcClick?: () => void;
}

const NutritionInfoDisplay: React.FC<NutritionInfoDisplayProps> = observer(({ nutrition, dayIndex, mealIndex, isMasterPlanView = false, onRecalcClick }) => {
    const { onlineMode, recalculatingMeal } = mealPlanStore;

    const isRecalculatingThisMeal = recalculatingMeal?.dayIndex === dayIndex && recalculatingMeal.mealIndex === mealIndex;

    if (nutrition === undefined || isRecalculatingThisMeal) {
        return (
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50 grid grid-cols-4 gap-2">
                <div className="flex flex-col items-center"><SkeletonLoader className="h-2 w-10 mb-1" /><SkeletonLoader className="h-3 w-8" /></div>
                <div className="flex flex-col items-center"><SkeletonLoader className="h-2 w-10 mb-1" /><SkeletonLoader className="h-3 w-8" /></div>
                <div className="flex flex-col items-center"><SkeletonLoader className="h-2 w-10 mb-1" /><SkeletonLoader className="h-3 w-8" /></div>
                <div className="flex flex-col items-center"><SkeletonLoader className="h-2 w-10 mb-1" /><SkeletonLoader className="h-3 w-8" /></div>
            </div>
        );
    }
    
    if (!nutrition) {
        return null; // Don't render anything if nutrition analysis failed or is not applicable
    }
    
    return (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50 flex justify-between items-center">
            <div className="grid grid-cols-4 gap-2 flex-grow">
                <NutritionItem label={t('nutritionCarbs')} value={nutrition.carbs} unit={t('nutritionUnitG')} />
                <NutritionItem label={t('nutritionProtein')} value={nutrition.protein} unit={t('nutritionUnitG')} />
                <NutritionItem label={t('nutritionFat')} value={nutrition.fat} unit={t('nutritionUnitG')} />
                <NutritionItem label={t('nutritionCalories')} value={nutrition.calories} unit={t('nutritionUnitKcal')} />
            </div>
            {onlineMode && !isMasterPlanView && (
                <button
                    onClick={onRecalcClick}
                    className="ml-2 p-1.5 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                    title={t('recalculateNutritionTitle')}
                    aria-label={t('recalculateNutritionTitle')}
                >
                    <RefreshIcon />
                </button>
            )}
        </div>
    );
});

export default NutritionInfoDisplay;