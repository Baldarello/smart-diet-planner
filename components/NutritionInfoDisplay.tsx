import React from 'react';
import { NutritionInfo } from '../types';
import { t } from '../i18n';
import SkeletonLoader from './SkeletonLoader';

const NutritionItem: React.FC<{ label: string, value: number, unit: string }> = ({ label, value, unit }) => (
    <div className="text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
        <p className="font-semibold text-gray-700 dark:text-gray-200">{Math.round(value)}{unit}</p>
    </div>
);

const NutritionInfoDisplay: React.FC<{ nutrition: NutritionInfo | null | undefined }> = ({ nutrition }) => {
    if (nutrition === undefined) {
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
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50 grid grid-cols-4 gap-2">
            <NutritionItem label={t('nutritionCarbs')} value={nutrition.carbs} unit={t('nutritionUnitG')} />
            <NutritionItem label={t('nutritionProtein')} value={nutrition.protein} unit={t('nutritionUnitG')} />
            <NutritionItem label={t('nutritionFat')} value={nutrition.fat} unit={t('nutritionUnitG')} />
            <NutritionItem label={t('nutritionCalories')} value={nutrition.calories} unit={t('nutritionUnitKcal')} />
        </div>
    );
};

export default NutritionInfoDisplay;