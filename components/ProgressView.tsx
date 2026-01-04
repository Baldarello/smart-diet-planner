import React, { useState, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';
import ProgressChart from './ProgressChart';
import { ProgressIcon } from './Icons';

type DateRange = 7 | 30 | 90;

const ProgressView: React.FC = observer(() => {
    const { progressHistory, locale } = mealPlanStore;
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
    
    const chartData = useMemo(() => {
        const labels = filteredData.map(d => formatDateForChart(d.date));
        const waterIntake = filteredData.map(d => d.waterIntakeMl);
        const steps = filteredData.map(d => d.stepsTaken);

        return {
            labels,
            waterIntake,
            steps,
        };
    }, [filteredData, locale]);


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

            <div className="space-y-8">
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

                {hasData(chartData.steps) && (
                     <div>
                        <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('steps')}</h3>
                        <ProgressChart
                            type="bar"
                            labels={chartData.labels}
                            datasets={[
                                {
                                    label: t('steps'),
                                    data: chartData.steps,
                                    color: 'rgba(22, 163, 74, 0.8)',
                                    unit: t('stepsUnit'),
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