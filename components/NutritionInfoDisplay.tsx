import React from 'react';
import { NutritionInfo } from '../types';
import { t } from '../i18n';

const NutritionItem: React.FC<{ label: string, value: number, unit: string }> = ({ label, value, unit }) => (
    <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="font-semibold text-gray-700 dark:text-gray-200">{Math.round(value)}{unit}</p>
    </div>
);

const NutritionInfoDisplay: React.FC<{ nutrition: NutritionInfo }> = ({ nutrition }) => {
    return (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50 grid grid-cols-4 gap-2">
            <NutritionItem label={t('nutritionCarbs')} value={nutrition.carbs} unit={t('nutritionUnitG')} />
            <NutritionItem label={t('nutritionProtein')} value={nutrition.protein} unit={t('nutritionUnitG')} />
            <NutritionItem label={t('nutritionFat')} value={nutrition.fat} unit={t('nutritionUnitG')} />
            <NutritionItem label={t('nutritionCalories')} value={nutrition.calories} unit={t('nutritionUnitKcal')} />
        </div>
    );
};

export default NutritionInfoDisplay;