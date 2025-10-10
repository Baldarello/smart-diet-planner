import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';
import { BodyIcon } from './Icons';

interface MetricInputProps {
    label: string;
    value: number | undefined;
    onSave: (value: number | undefined) => void;
    unit: string;
}

const MetricInput: React.FC<MetricInputProps> = ({ label, value: propValue, onSave, unit }) => {
    const [value, setValue] = useState(propValue?.toString() ?? '');

    useEffect(() => {
        setValue(propValue?.toString() ?? '');
    }, [propValue]);

    const handleBlur = () => {
        const numericValue = parseFloat(value.replace(',', '.'));
        if (!isNaN(numericValue)) {
            onSave(numericValue);
        } else if (value.trim() === '') {
            onSave(undefined);
        } else {
            setValue(propValue?.toString() ?? ''); // Revert on invalid input
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
};


const BodyMetricsTracker: React.FC = observer(() => {
    const { currentDayProgress, updateCurrentDayProgress } = mealPlanStore;

    return (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg mt-6">
            <div className="flex items-center mb-4">
                <BodyIcon />
                <h4 className="font-semibold text-indigo-800 dark:text-indigo-300 ml-3">{t('bodyMetricsTitle')}</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <MetricInput 
                    label={t('weight')} 
                    unit={t('unitKg')}
                    value={currentDayProgress?.weightKg}
                    onSave={(val) => updateCurrentDayProgress('weightKg', val)}
                />
                <MetricInput 
                    label={t('bodyFat')} 
                    unit={t('unitPercent')}
                    value={currentDayProgress?.bodyFatPercentage}
                    onSave={(val) => updateCurrentDayProgress('bodyFatPercentage', val)}
                />
                <MetricInput 
                    label={t('leanMass')} 
                    unit={t('unitKg')}
                    value={currentDayProgress?.leanMassKg}
                    onSave={(val) => updateCurrentDayProgress('leanMassKg', val)}
                />
                <MetricInput 
                    label={t('bodyWater')} 
                    unit={t('unitPercent')}
                    value={currentDayProgress?.bodyWaterPercentage}
                    onSave={(val) => updateCurrentDayProgress('bodyWaterPercentage', val)}
                />
            </div>
        </div>
    );
});

export default BodyMetricsTracker;