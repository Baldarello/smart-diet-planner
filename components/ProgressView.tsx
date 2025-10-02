import React, { useState, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';
import ProgressChart from './ProgressChart';
import { ProgressRecord } from '../types';
import { ProgressIcon, RefreshIcon } from './Icons';

type DateRange = 7 | 30 | 90;

const ProgressView: React.FC = observer(() => {
    const { progressHistory, locale, recalculateAllProgress, recalculatingProgress } = mealPlanStore;
    const [dateRange, setDateRange] = useState<DateRange>(30);

    const formatDateForChart = (dateStr: string) => {
        const date = new Date(dateStr);
        if (locale === 'it') {
            return date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
        }
        return date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    };

    const filteredData = useMemo(() => {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - dateRange);
        
        return progressHistory.filter(record => {
            const recordDate = new Date(record.date);
            return recordDate >= startDate && recordDate <= endDate;
        });
    }, [progressHistory, dateRange]);

    if (progressHistory.length < 2) {
        return (
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg text-center max-w-2xl mx-auto">
                <div className="flex justify-center mb-4">
                    <ProgressIcon />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('noProgressDataTitle')}</h2>
                <p className="text-gray-500 dark:text-gray-400">{t('noProgressDataSubtitle')}</p>
            </div>
        );
    }

    const chartData = {
        labels: filteredData.map(d => formatDateForChart(d.date)),
        weight: filteredData.map(d => d.weightKg),
        fat: filteredData.map(d => d.bodyFatPercentage),
        adherence: filteredData.map(d => d.adherence),
        plannedCalories: filteredData.map(d => d.plannedCalories),
        actualCalories: filteredData.map(d => d.actualCalories),
        waterIntake: filteredData.map(d => d.waterIntakeMl),
        bodyWater: filteredData.map(d => d.bodyWaterPercentage),
        steps: filteredData.map(d => d.stepsTaken),
        caloriesBurned: filteredData.map(d => d.estimatedCaloriesBurned),
    };
    
    const hasData = (data: (number | null | undefined)[]) => data.some(d => d != null && d > 0);


    return (
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg transition-all duration-300 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-center border-b dark:border-gray-700 pb-4 mb-6">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">{t('progressTitle')}</h2>
                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('dateRange')}:</span>
                        <div>
                            {( [7, 30, 90] as DateRange[]).map(range => (
                                <button
                                    key={range}
                                    onClick={() => setDateRange(range)}
                                    className={`px-3 py-1 text-sm font-semibold rounded-full transition-colors ${dateRange === range ? 'bg-violet-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
                                >
                                    {t(range === 7 ? 'last7Days' : range === 30 ? 'last30Days' : 'last90Days')}
                                </button>
                            ))}
                        </div>
                    </div>
                     <button
                        onClick={() => recalculateAllProgress()}
                        disabled={recalculatingProgress}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:bg-violet-400 disabled:cursor-wait text-sm font-semibold shadow-md"
                        title={t('recalculateProgressTitle')}
                    >
                        {recalculatingProgress
                            ? <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"></div>
                            : <RefreshIcon className="h-5 w-5" />
                        }
                        <span>{recalculatingProgress ? t('recalculatingProgressButtonTextLoading') : t('recalculateProgressButtonText')}</span>
                    </button>
                </div>
            </div>

            <div className="space-y-8">
                {hasData(chartData.weight) && (
                     <div>
                        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('weightAndFatChartTitle')}</h3>
                        <ProgressChart
                            type="line"
                            labels={chartData.labels}
                            datasets={[
                                {
                                    label: t('weight'),
                                    data: chartData.weight,
                                    color: 'rgba(139, 92, 246, 1)',
                                    unit: t('unitKg'),
                                },
                                ...(hasData(chartData.fat) ? [{
                                    label: t('bodyFat'),
                                    data: chartData.fat,
                                    color: 'rgba(236, 72, 153, 1)',
                                    unit: t('unitPercent'),
                                }] : [])
                            ]}
                        />
                    </div>
                )}
                
                {hasData(chartData.steps) && (
                     <div>
                        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('stepsChartTitle')}</h3>
                        <ProgressChart
                            type="bar"
                            labels={chartData.labels}
                            datasets={[
                                {
                                    label: t('steps'),
                                    data: chartData.steps,
                                    color: 'rgba(22, 163, 74, 0.8)',
                                    unit: t('stepsUnit'),
                                },
                                ...(hasData(chartData.caloriesBurned) ? [{
                                    label: t('caloriesBurned'),
                                    data: chartData.caloriesBurned,
                                    color: 'rgba(249, 115, 22, 0.8)',
                                    unit: t('caloriesUnit'),
                                }] : [])
                            ]}
                        />
                    </div>
                )}

                {hasData(chartData.waterIntake) && (
                     <div>
                        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('hydrationChartTitle')}</h3>
                        <ProgressChart
                            type="line"
                            labels={chartData.labels}
                            datasets={[
                                {
                                    label: t('waterIntake'),
                                    data: chartData.waterIntake,
                                    color: 'rgba(59, 130, 246, 1)',
                                    unit: t('hydrationUnitMl'),
                                },
                                ...(hasData(chartData.bodyWater) ? [{
                                    label: t('bodyWater'),
                                    data: chartData.bodyWater,
                                    color: 'rgba(20, 184, 166, 1)',
                                    unit: t('unitPercent'),
                                }] : [])
                            ]}
                        />
                    </div>
                )}

                {hasData(chartData.adherence) && (
                     <div>
                        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('adherenceChartTitle')}</h3>
                        <ProgressChart
                            type="area"
                            labels={chartData.labels}
                            datasets={[{
                                label: t('adherence'),
                                data: chartData.adherence,
                                color: 'rgba(16, 185, 129, 1)',
                                unit: '%',
                            }]}
                        />
                    </div>
                )}
                
                {hasData(chartData.plannedCalories) && (
                    <div>
                        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('calorieIntakeChartTitle')}</h3>
                        <ProgressChart
                            type="bar"
                            labels={chartData.labels}
                            datasets={[
                                {
                                    label: t('planned'),
                                    data: chartData.plannedCalories,
                                    color: 'rgba(167, 139, 250, 0.6)',
                                    unit: t('nutritionUnitKcal'),
                                },
                                {
                                    label: t('actual'),
                                    data: chartData.actualCalories,
                                    color: 'rgba(59, 130, 246, 0.8)',
                                    unit: t('nutritionUnitKcal'),
                                }
                            ]}
                        />
                    </div>
                )}

            </div>
        </div>
    );
});

export default ProgressView;