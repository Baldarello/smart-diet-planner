import React, { useState, useMemo, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';
import ProgressChart from './ProgressChart';
import { ProgressRecord, DailyLog } from '../types';
import { ProgressIcon, RefreshIcon } from './Icons';
import { db } from '../services/db';
import Switch from './Switch';

type DateRange = 7 | 30 | 90;

const ProgressView: React.FC = observer(() => {
    const { progressHistory, locale, recalculateAllProgress, recalculatingProgress, showMacros, showCheatMealButton } = mealPlanStore;
    const [dateRange, setDateRange] = useState<DateRange>(30);
    const [cheatMealData, setCheatMealData] = useState<(number | null)[]>([]);
    const [unitMode, setUnitMode] = useState<'absolute' | 'percentage'>('absolute');

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

    const chartData = useMemo(() => {
        const labels = filteredData.map(d => formatDateForChart(d.date));
        const weight = filteredData.map(d => d.weightKg);
        const waterIntake = filteredData.map(d => d.waterIntakeMl);

        const fatMass = filteredData.map(d => {
            if (unitMode === 'percentage') {
                return d.bodyFatPercentage ?? (d.weightKg && d.bodyFatKg ? (d.bodyFatKg / d.weightKg) * 100 : null);
            }
            return d.bodyFatKg;
        });
    
        const leanMass = filteredData.map(d => {
            if (unitMode === 'percentage') {
                return d.weightKg && d.leanMassKg ? (d.leanMassKg / d.weightKg) * 100 : null;
            }
            return d.leanMassKg;
        });
    
        const bodyWater = filteredData.map(d => {
            if (unitMode === 'percentage') {
                return d.bodyWaterPercentage ?? (d.weightKg && d.bodyWaterLiters ? (d.bodyWaterLiters / d.weightKg) * 100 : null);
            }
            return d.bodyWaterLiters;
        });

        return {
            labels,
            weight,
            fatMass,
            leanMass,
            bodyWater,
            waterIntake,
            adherence: filteredData.map(d => d.adherence),
            plannedCalories: filteredData.map(d => d.plannedCalories),
            actualCalories: filteredData.map(d => d.actualCalories),
            steps: filteredData.map(d => d.stepsTaken),
            caloriesBurned: filteredData.map(d => d.estimatedCaloriesBurned),
            cheatMeals: cheatMealData,
        };
    }, [filteredData, locale, cheatMealData, unitMode]);


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
                </div>
            </div>

            <div className="flex justify-end items-center gap-2 mb-6">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('unitKg')}/{t('unitLiters')}</span>
                <Switch
                    checked={unitMode === 'percentage'}
                    onChange={checked => setUnitMode(checked ? 'percentage' : 'absolute')}
                />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('unitPercent')}</span>
            </div>

            <div className="space-y-8">
                {hasData(chartData.weight) && (
                     <div>
                        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('weightChartTitle')}</h3>
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
                            ]}
                        />
                    </div>
                )}

                {(hasData(chartData.fatMass) || hasData(chartData.leanMass)) && (
                    <div>
                        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('bodyCompositionChartTitle')}</h3>
                        <ProgressChart
                            type="line"
                            labels={chartData.labels}
                            datasets={[
                                ...(hasData(chartData.fatMass) ? [{
                                    label: t('bodyFat'),
                                    data: chartData.fatMass,
                                    color: 'rgba(236, 72, 153, 1)',
                                    unit: unitMode === 'absolute' ? t('unitKg') : t('unitPercent'),
                                }] : []),
                                ...(hasData(chartData.leanMass) ? [{
                                    label: t('leanMass'),
                                    data: chartData.leanMass,
                                    color: 'rgba(14, 165, 233, 1)',
                                    unit: unitMode === 'absolute' ? t('unitKg') : t('unitPercent'),
                                }] : [])
                            ]}
                        />
                    </div>
                )}

                {hasData(chartData.bodyWater) && (
                    <div>
                        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('bodyWaterChartTitle')}</h3>
                        <ProgressChart
                            type="line"
                            labels={chartData.labels}
                            datasets={[
                                {
                                    label: t('bodyWater'),
                                    data: chartData.bodyWater,
                                    color: 'rgba(20, 184, 166, 1)',
                                    unit: unitMode === 'absolute' ? t('unitLiters') : t('unitPercent'),
                                }
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
                            ]}
                        />
                    </div>
                )}
                
                {hasData(chartData.cheatMeals) && showCheatMealButton && (
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
                
                {hasData(chartData.plannedCalories) && showMacros && (
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