import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';
import { BodyIcon } from './Icons';
import { BodyMetrics } from '../types';

interface MetricInputProps {
    label: string;
    metricKey: keyof BodyMetrics;
    unit: string;
}

const MetricInput: React.FC<MetricInputProps> = observer(({ label, metricKey, unit }) => {
    const { bodyMetrics, setBodyMetric } = mealPlanStore;
    const [value, setValue] = useState(bodyMetrics[metricKey]?.toString() ?? '');

    useEffect(() => {
        setValue(bodyMetrics[metricKey]?.toString() ?? '');
    }, [bodyMetrics, metricKey]);

    const handleBlur = () => {
        const numericValue = parseFloat(value.replace(',', '.'));
        if (!isNaN(numericValue)) {
            setBodyMetric(metricKey, numericValue);
        } else if (value.trim() === '') {
            setBodyMetric(metricKey, undefined);
        } else {
            setValue(bodyMetrics[metricKey]?.toString() ?? ''); // Revert on invalid input
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    return (
        <div className="flex items-center justify-between bg-slate-100 dark:bg-gray-700/50 p-3 rounded-lg">
            <label className="font-medium text-indigo-800 dark:text-indigo-300">{label}</label>
            <div className="flex items-center">
                <input
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    className="w-20 text-right font-bold bg-transparent border-b-2 border-indigo-200 dark:border-indigo-700 focus:border-indigo-500 dark:focus:border-indigo-400 outline-none text-indigo-700 dark:text-indigo-200"
                    aria-label={label}
                />
                <span className="ml-2 w-6 font-semibold text-indigo-700 dark:text-indigo-300">{unit}</span>
            </div>
        </div>
    );
});


const BodyMetricsTracker: React.FC = observer(() => {
    return (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg mt-6">
            <div className="flex items-center mb-4">
                <BodyIcon />
                <h4 className="font-semibold text-indigo-800 dark:text-indigo-300 ml-3">{t('bodyMetricsTitle')}</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <MetricInput label={t('weight')} metricKey="weightKg" unit={t('unitKg')} />
                <MetricInput label={t('height')} metricKey="heightCm" unit={t('unitCm')} />
                <MetricInput label={t('bodyFat')} metricKey="bodyFatPercentage" unit={t('unitPercent')} />
                <MetricInput label={t('leanMass')} metricKey="leanMassKg" unit={t('unitKg')} />
                <MetricInput label={t('bodyWater')} metricKey="bodyWaterPercentage" unit={t('unitPercent')} />
            </div>
        </div>
    );
});

export default BodyMetricsTracker;
