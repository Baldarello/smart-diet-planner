import React from 'react';
import { NutritionInfo } from '../types';
import { t } from '../i18n';
import { FlameIcon, CarbsIcon, ProteinIcon, FatIcon } from './Icons';
import SkeletonLoader from './SkeletonLoader';

interface SummaryItemProps {
    icon: React.ReactNode;
    label: string;
    value: number;
    unit: string;
    colorClasses: string;
}

const SummaryItem: React.FC<SummaryItemProps> = ({ icon, label, value, unit, colorClasses }) => (
    <div className={`p-4 rounded-lg flex items-center ${colorClasses}`}>
        <div className="mr-3 flex-shrink-0">{icon}</div>
        <div>
            <p className="font-semibold text-lg">{Math.round(value)}{unit}</p>
            <p className="text-sm opacity-80">{label}</p>
        </div>
    </div>
);

const SkeletonSummaryItem: React.FC<{ colorClasses: string }> = ({ colorClasses }) => (
     <div className={`p-4 rounded-lg flex items-center ${colorClasses}`}>
        <SkeletonLoader className="h-6 w-6 rounded-full mr-3" />
        <div>
            <SkeletonLoader className="h-5 w-16 mb-1" />
            <SkeletonLoader className="h-3 w-20" />
        </div>
    </div>
);

interface DailyNutritionSummaryProps {
  summary: NutritionInfo | null | undefined;
  showTitle?: boolean;
  className?: string;
}

const DailyNutritionSummary: React.FC<DailyNutritionSummaryProps> = ({ summary, showTitle = true, className = 'my-6' }) => {
    
    if (summary === undefined) {
        return (
             <div className={className}>
                {showTitle && <h4 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">{t('dailySummaryTitle')}</h4>}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <SkeletonSummaryItem colorClasses="bg-orange-100 dark:bg-orange-900/40" />
                    <SkeletonSummaryItem colorClasses="bg-sky-100 dark:bg-sky-900/40" />
                    <SkeletonSummaryItem colorClasses="bg-amber-100 dark:bg-amber-900/40" />
                    <SkeletonSummaryItem colorClasses="bg-red-100 dark:bg-red-900/40" />
                </div>
            </div>
        );
    }
    
    if (!summary) {
        return null;
    }

    return (
        <div className={className}>
            {showTitle && <h4 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">{t('dailySummaryTitle')}</h4>}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryItem
                    icon={<CarbsIcon />}
                    label={t('nutritionCarbs')}
                    value={summary.carbs}
                    unit={t('nutritionUnitG')}
                    colorClasses="bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-200"
                />
                <SummaryItem
                    icon={<ProteinIcon />}
                    label={t('nutritionProtein')}
                    value={summary.protein}
                    unit={t('nutritionUnitG')}
                    colorClasses="bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-200"
                />
                <SummaryItem
                    icon={<FatIcon />}
                    label={t('nutritionFat')}
                    value={summary.fat}
                    unit={t('nutritionUnitG')}
                    colorClasses="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-200"
                />
                 <SummaryItem
                    icon={<FlameIcon />}
                    label={t('nutritionCalories')}
                    value={summary.calories}
                    unit={t('nutritionUnitKcal')}
                    colorClasses="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200"
                />
            </div>
        </div>
    );
};

export default DailyNutritionSummary;