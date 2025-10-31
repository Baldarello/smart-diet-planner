import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { Patient, BodyMetrics } from '../../types';
import { t } from '../../i18n';
import { CloseIcon, BodyIcon } from '../Icons';
import { patientStore } from '../../stores/PatientStore';

interface BodyDataModalProps {
    patient: Patient;
    onClose: () => void;
}

const BodyDataModal: React.FC<BodyDataModalProps> = observer(({ patient, onClose }) => {
    const [bodyMetrics, setBodyMetrics] = useState<BodyMetrics>(patient.bodyMetrics || {});
    const [showInApp, setShowInApp] = useState(patient.showBodyMetricsInApp || false);
    const [isSaving, setIsSaving] = useState(false);

    const handleMetricChange = (metric: keyof BodyMetrics, value: string) => {
        const numericValue = value === '' ? undefined : parseFloat(value.replace(',', '.'));
        setBodyMetrics(prev => ({ ...prev, [metric]: numericValue }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await patientStore.updatePatient(patient.id!, {
                bodyMetrics,
                showBodyMetricsInApp: showInApp
            });
            onClose();
        } catch (error) {
            console.error("Failed to save body data", error);
            // Optionally show an error message to the user
        } finally {
            setIsSaving(false);
        }
    };

    const MetricInput: React.FC<{ label: string; unit: string; value: number | undefined; onChange: (value: string) => void; }> = 
    ({ label, unit, value, onChange }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
            <div className="mt-1 flex items-center">
                <input
                    type="text"
                    inputMode="decimal"
                    value={value === undefined ? '' : String(value)}
                    onChange={e => onChange(e.target.value)}
                    className="flex-grow p-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-violet-500 focus:border-violet-500"
                />
                <span className="ml-2 font-semibold text-gray-500 dark:text-gray-400">{unit}</span>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6 animate-slide-in-up" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">{t('bodyDataModalTitle', { name: `${patient.firstName} ${patient.lastName}` })}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><CloseIcon /></button>
                </header>
                
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <MetricInput label={t('weight')} unit={t('unitKg')} value={bodyMetrics.weightKg} onChange={v => handleMetricChange('weightKg', v)} />
                        <MetricInput label={t('height')} unit={t('unitCm')} value={bodyMetrics.heightCm} onChange={v => handleMetricChange('heightCm', v)} />
                        <MetricInput label={t('bodyFat')} unit={t('unitPercent')} value={bodyMetrics.bodyFatPercentage} onChange={v => handleMetricChange('bodyFatPercentage', v)} />
                        <MetricInput label={t('leanMass')} unit={t('unitKg')} value={bodyMetrics.leanMassKg} onChange={v => handleMetricChange('leanMassKg', v)} />
                        <MetricInput label={t('bodyWater')} unit={t('unitPercent')} value={bodyMetrics.bodyWaterPercentage} onChange={v => handleMetricChange('bodyWaterPercentage', v)} />
                    </div>
                    <div className="flex items-center p-3 bg-slate-50 dark:bg-gray-700/50 rounded-lg">
                        <input
                            id="show-metrics-toggle"
                            type="checkbox"
                            checked={showInApp}
                            onChange={e => setShowInApp(e.target.checked)}
                            className="h-5 w-5 rounded border-gray-300 dark:border-gray-500 text-violet-600 focus:ring-violet-500"
                        />
                        <label htmlFor="show-metrics-toggle" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('showBodyMetricsInAppLabel')}</label>
                    </div>
                </div>

                <footer className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="bg-gray-200 dark:bg-gray-600 font-semibold px-4 py-2 rounded-full">{t('cancel')}</button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-violet-600 text-white font-semibold px-4 py-2 rounded-full disabled:bg-violet-400">
                        {isSaving ? t('recalculating') : t('save')}
                    </button>
                </footer>
            </div>
        </div>
    );
});

export default BodyDataModal;