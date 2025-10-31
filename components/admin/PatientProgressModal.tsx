import React, { useState, useMemo, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Patient, ProgressRecord } from '../../types';
import { t } from '../../i18n';
import { patientStore } from '../../stores/PatientStore';
import { CloseIcon } from '../Icons';
import ProgressChart from '../ProgressChart';
import SkeletonLoader from '../SkeletonLoader';
import Switch from '../Switch';

interface PatientProgressModalProps {
    patient: Patient;
    onClose: () => void;
}

type DateRange = 7 | 30 | 90 | 'all';

const PatientProgressModal: React.FC<PatientProgressModalProps> = observer(({ patient, onClose }) => {
    const [progressHistory, setProgressHistory] = useState<ProgressRecord[]>([]);
    const [status, setStatus] = useState<'loading' | 'ready' | 'empty'>('loading');
    const [dateRange, setDateRange] = useState<DateRange>(30);
    const [unitMode, setUnitMode] = useState<'absolute' | 'percentage'>('absolute');

    useEffect(() => {
        const fetchHistory = async () => {
            setStatus('loading');
            const history = await patientStore.getProgressHistoryForPatient(patient.id!);
            setProgressHistory(history);
            setStatus(history.length > 1 ? 'ready' : 'empty');
        };
        fetchHistory();
    }, [patient.id]);

    const formatDateForChart = (dateStr: string) => {
        try {
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}`;
        } catch {
            return dateStr;
        }
    };

    const filteredData = useMemo(() => {
        if (dateRange === 'all' || progressHistory.length < 2) return progressHistory;
        
        const lastDateStr = progressHistory.length > 0 ? progressHistory[progressHistory.length - 1].date : new Date().toLocaleDateString('en-CA');
        const endDate = new Date(lastDateStr);
        
        const startDate = new Date(endDate);
        startDate.setDate(endDate.getDate() - dateRange + 1);
        
        const startDateStr = startDate.toLocaleDateString('en-CA');
        
        return progressHistory.filter(record => record.date >= startDateStr && record.date <= lastDateStr);
    }, [progressHistory, dateRange]);

    const chartData = useMemo(() => {
        const labels = filteredData.map(d => formatDateForChart(d.date));
        const weight = filteredData.map(d => d.weightKg);

        const fatMassData = filteredData.map(d => {
            if (unitMode === 'percentage') {
                return d.bodyFatPercentage ?? (d.weightKg && d.bodyFatKg != null ? (d.bodyFatKg / d.weightKg) * 100 : null);
            }
            return d.bodyFatKg;
        });

        const leanMassData = filteredData.map((d, i) => {
            const weightKg = d.weightKg;
            if (unitMode === 'percentage') {
                const fatPct = fatMassData[i];
                return fatPct != null ? 100 - fatPct : null;
            }
            // Absolute mode
            if (d.leanMassKg != null) return d.leanMassKg;
            const fatKg = fatMassData[i];
            if (weightKg != null && fatKg != null) return weightKg - fatKg;
            return null;
        });

        const bodyWater = filteredData.map(d => {
            const weightKg = d.weightKg;
            if (!weightKg) return null;

            if (unitMode === 'percentage') {
                if (d.bodyWaterPercentage != null) return d.bodyWaterPercentage;
                if (d.bodyWaterLiters != null) return (d.bodyWaterLiters / weightKg) * 100;
                return null;
            } else { // absolute (Liters)
                if (d.bodyWaterLiters != null) return d.bodyWaterLiters;
                if (d.bodyWaterPercentage != null) return (d.bodyWaterPercentage / 100) * weightKg;
                return null;
            }
        });

        return {
            labels,
            weight,
            fatMass: fatMassData,
            leanMass: leanMassData,
            bodyWater,
        };
    }, [filteredData, unitMode]);


    const hasData = (data: (number | null | undefined)[]) => data.some(d => d != null && !isNaN(d as number));
    const hasAnyChartData = hasData(chartData.weight) || hasData(chartData.fatMass) || hasData(chartData.leanMass) || hasData(chartData.bodyWater);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl flex flex-col h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">{t('progressTitle')} - {patient.firstName} {patient.lastName}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label={t('close')}>
                        <CloseIcon />
                    </button>
                </header>
                <main className="overflow-y-auto p-6 space-y-8">
                    {status === 'loading' && <SkeletonLoader className="h-64 w-full" />}
                    {status === 'empty' && (
                         <div className="text-center py-16">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">{t('noProgressDataTitle')}</h3>
                            <p className="text-gray-500 dark:text-gray-400 mt-2">{t('noProgressDataSubtitle')}</p>
                        </div>
                    )}
                    {status === 'ready' && (
                        <>
                            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="bg-gray-200 dark:bg-gray-700 rounded-full p-1 flex items-center">
                                    {( [7, 30, 90] as DateRange[]).map(range => (
                                        <button
                                            key={range}
                                            onClick={() => setDateRange(range)}
                                            className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${dateRange === range ? 'bg-violet-600 text-white shadow' : 'text-gray-600 dark:text-gray-300'}`}
                                        >
                                            {t(range === 7 ? 'last7Days' : range === 30 ? 'last30Days' : 'last90Days')}
                                        </button>
                                    ))}
                                    <button
                                        key="all"
                                        onClick={() => setDateRange('all')}
                                        className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${dateRange === 'all' ? 'bg-violet-600 text-white shadow' : 'text-gray-600 dark:text-gray-300'}`}
                                    >
                                        {t('allTimeRange')}
                                    </button>
                                </div>
                                <div className="flex justify-end items-center gap-2">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('unitKg')}/{t('unitLiters')}</span>
                                    <Switch
                                        checked={unitMode === 'percentage'}
                                        onChange={checked => setUnitMode(checked ? 'percentage' : 'absolute')}
                                    />
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('unitPercent')}</span>
                                </div>
                            </div>
                            
                            {hasAnyChartData ? (
                                <>
                                    {hasData(chartData.weight) && (
                                        <div>
                                            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('weightChartTitle')}</h3>
                                            <ProgressChart
                                                type="line"
                                                labels={chartData.labels}
                                                datasets={[{
                                                    label: t('weight'),
                                                    data: chartData.weight,
                                                    color: 'rgba(139, 92, 246, 1)',
                                                    unit: t('unitKg'),
                                                }]}
                                            />
                                        </div>
                                    )}
                                    {(hasData(chartData.fatMass) || hasData(chartData.leanMass)) && (
                                        <div>
                                            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('bodyCompositionChartTitle')}</h3>
                                            <ProgressChart
                                                type={'area'}
                                                stacked={true}
                                                labels={chartData.labels}
                                                yAxisMin={unitMode === 'percentage' ? 0 : undefined}
                                                yAxisMax={unitMode === 'percentage' ? 100 : undefined}
                                                datasets={[
                                                    ...(hasData(chartData.leanMass) ? [{
                                                        label: t('leanMass'),
                                                        data: chartData.leanMass,
                                                        color: 'rgba(14, 165, 233, 1)',
                                                        unit: unitMode === 'absolute' ? t('unitKg') : t('unitPercent'),
                                                    }] : []),
                                                    ...(hasData(chartData.fatMass) ? [{
                                                        label: t('bodyFat'),
                                                        data: chartData.fatMass,
                                                        color: 'rgba(236, 72, 153, 1)',
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
                                                datasets={[{
                                                    label: t('bodyWater'),
                                                    data: chartData.bodyWater,
                                                    color: 'rgba(20, 184, 166, 1)',
                                                    unit: unitMode === 'absolute' ? t('unitLiters') : t('unitPercent'),
                                                }]}
                                            />
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-16">
                                    <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">No data available in the selected date range.</p>
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
});

export default PatientProgressModal;