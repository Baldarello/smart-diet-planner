import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { Patient } from '../../types';
import { t } from '../../i18n';
import { CloseIcon } from '../Icons';
import { patientStore } from '../../stores/PatientStore';

interface PatientSettingsModalProps {
    patient: Patient;
    onClose: () => void;
}

const PatientSettingsModal: React.FC<PatientSettingsModalProps> = observer(({ patient, onClose }) => {
    const [showInApp, setShowInApp] = useState(patient.showBodyMetricsInApp ?? true);
    const [stepGoal, setStepGoal] = useState(patient.stepGoal?.toString() ?? '6000');
    const [hydrationGoal, setHydrationGoal] = useState(patient.hydrationGoalLiters?.toString() ?? '3');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const stepGoalNum = parseInt(stepGoal, 10);
            const hydrationGoalNum = parseFloat(hydrationGoal.replace(',', '.'));
            
            await patientStore.updatePatient(patient.id!, {
                showBodyMetricsInApp: showInApp,
                stepGoal: isNaN(stepGoalNum) ? undefined : stepGoalNum,
                hydrationGoalLiters: isNaN(hydrationGoalNum) ? undefined : hydrationGoalNum,
            });
            onClose();
        } catch (error) {
            console.error("Failed to save patient settings", error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6 animate-slide-in-up" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{t('patientSettingsModalTitle', { name: `${patient.firstName} ${patient.lastName}` })}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><CloseIcon /></button>
                </header>
                
                <div className="space-y-6">
                    <div className="flex items-center p-4 bg-slate-50 dark:bg-gray-700/50 rounded-lg">
                        <input id="show-metrics-toggle" type="checkbox" checked={showInApp} onChange={e => setShowInApp(e.target.checked)} className="h-5 w-5 rounded border-gray-300 dark:border-gray-500 text-violet-600 focus:ring-violet-500"/>
                        <label htmlFor="show-metrics-toggle" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('showBodyMetricsInAppLabel')}</label>
                    </div>
                    
                    <div>
                        <label htmlFor="step-goal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('patientStepGoalLabel')}</label>
                        <div className="mt-1 flex items-center">
                            <input
                                id="step-goal"
                                type="number"
                                value={stepGoal}
                                onChange={e => setStepGoal(e.target.value)}
                                className="flex-grow p-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
                            />
                            <span className="ml-2 font-semibold text-gray-500 dark:text-gray-400">{t('stepsUnit')}</span>
                        </div>
                    </div>
                    
                    <div>
                        <label htmlFor="hydration-goal" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('patientHydrationGoalLabel')}</label>
                        <div className="mt-1 flex items-center">
                            <input
                                id="hydration-goal"
                                type="text"
                                inputMode="decimal"
                                value={hydrationGoal}
                                onChange={e => setHydrationGoal(e.target.value)}
                                className="flex-grow p-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
                            />
                            <span className="ml-2 font-semibold text-gray-500 dark:text-gray-400">{t('hydrationUnit')}</span>
                        </div>
                    </div>
                </div>

                <footer className="mt-8 flex justify-end gap-4">
                    <button onClick={onClose} className="bg-gray-200 dark:bg-gray-600 font-semibold px-6 py-2 rounded-full">{t('cancel')}</button>
                    <button onClick={handleSave} disabled={isSaving} className="bg-violet-600 text-white font-semibold px-6 py-2 rounded-full disabled:bg-violet-400">
                        {isSaving ? `${t('recalculating')}...` : t('save')}
                    </button>
                </footer>
            </div>
        </div>
    );
});

export default PatientSettingsModal;
