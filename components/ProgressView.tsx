import React, { useState, useMemo, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';
import ProgressChart from './ProgressChart';
import { ProgressRecord, DailyLog } from '../types';
import { ProgressIcon, RefreshIcon } from './Icons';
import { db } from '../services/db';

type DateRange = 7 | 30 | 90;

const ProgressView: React.FC = observer(() => {
    const { progressHistory, locale, recalculateAllProgress, recalculatingProgress } = mealPlanStore;
    const [dateRange, setDateRange] = useState<DateRange>(30);
    const [cheatMealData, setCheatMealData] = useState<(number | null)[]>([]);

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
    
    useEffect(() => {
        const fetchCheatMeals = async () => {
            if (filteredData.length === 0) {
                setCheatMealData([]);
                return;
            }
            const dates = filteredData.map(d => d.date);
            try {
                // Fix: Explicitly type the result from Dexie to prevent `log` from being inferred as `unknown`.
                // This resolves the error "Property 'meals' does not exist on type 'unknown'".
                const logs: DailyLog[] = await db.dailyLogs.where('date').anyOf(dates).toArray();
                const logMap = new Map(logs.map(log => [log.date, log]));

                const counts = filteredData.map(record => {
                    const log = logMap.get(record.date);
                    if (!log) return 0;
                    return log.meals.filter(meal => meal.cheat).length;
                });
                setCheatMealData(counts);
            } catch (error) {
                console.error("Failed to fetch cheat meal data:", error);
                setCheatMealData([]);
            }
        };

        fetchCheatMeals();
    }, [filteredData]);


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
        cheatMeals: cheatMealData,
    };
    
    const hasData = (data: (number | null | undefined)[]) => data.some(d => d != null && d > 0);


    return (
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg transition-all duration-300 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center border-b dark:border-gray-700 pb-4 mb-6 gap-4">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 self-start md:self-center">{t('progressTitle')}</h2>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 hidden sm:inline">{t('dateRange')}:</span>
                         <div className="bg-gray-200 dark:bg-gray-700 rounded-full p-1 flex items-center flex-grow sm:flex-grow-0">
                            {( [7, 30, 90] as DateRange[]).map(range => (
                                <button
                                    key={range}
                                    onClick={() => setDateRange(range)}
                                    className={`w-full text-center px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${dateRange === range ? 'bg-violet-600 text-white shadow-md' : 'bg-transparent text-gray-600 dark:text-gray-300'}`}
                                >
                                    {t(range === 7 ? 'last7Days' : range === 30 ? 'last30Days' : 'last90Days')}
                                </button>
                            ))}
                        </div>
                    </div>
                     <button
                        onClick={() => recalculateAllProgress()}
                        disabled={recalculatingProgress}
                        className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-violet-600 text-white hover:bg-violet-700 transition-colors disabled:bg-violet-400 disabled:opacity-75 disabled:cursor-wait text-sm font-semibold shadow-md w-full sm:w-auto"
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
                
                {hasData(chartData.cheatMeals) && (
                     <div>
                        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('cheatMealChartTitle')}</h3>
                        <ProgressChart
                            type="bar"
                            labels={chartData.labels}
                            datasets={[{
                                label: t('cheatMeals'),
                                data: chartData.cheatMeals,
                                color: 'rgba(234, 88, 12, 0.8)',
                                unit: t('unitCount'),
                            }]}
                        />
                    </div>
                )}

                {hasData(chartData.adherence) && (
                     <div>
                        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('adherenceChartTitle')}</h3>
                        <ProgressChart
                            type="line"
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