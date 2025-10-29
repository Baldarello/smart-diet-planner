import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { nutritionistStore } from '../../stores/NutritionistStore';
import { Patient } from '../../types';
import { t } from '../../i18n';
import { CloseIcon } from '../Icons';
import { patientStore } from '../../stores/PatientStore';

interface AssignPlanModalProps {
    patient: Patient;
    onClose: () => void;
    onAssign: (planId: number) => void;
}

const AssignPlanModal: React.FC<AssignPlanModalProps> = observer(({ patient, onClose, onAssign }) => {
    const { plans } = nutritionistStore;
    const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endDate, setEndDate] = useState(() => {
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        return nextMonth.toISOString().split('T')[0];
    });
    const [error, setError] = useState('');

    const handleAssign = async () => {
        if (selectedPlanId === null) return;
        setError('');
    
        if (new Date(endDate) <= new Date(startDate)) {
            setError(t('dateValidationError'));
            return;
        }
    
        try {
            await patientStore.assignPlanToPatient(patient.id!, selectedPlanId, startDate, endDate);
            onClose();
        } catch (e) {
            if (e instanceof Error) {
                setError(e.message);
            } else {
                setError("An unknown error occurred.");
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6 animate-slide-in-up" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">{t('assignExistingPlan')}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><CloseIcon /></button>
                </header>
                <p className="mb-4 text-gray-600 dark:text-gray-400">{t('selectPlanToAssign')} per <strong>{patient.firstName} {patient.lastName}</strong></p>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('startDateLabel')}</label>
                        <input type="date" id="start-date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full mt-1 p-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-violet-500 focus:border-violet-500" />
                    </div>
                    <div>
                        <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('endDateLabel')}</label>
                        <input type="date" id="end-date" value={endDate} min={startDate} onChange={e => setEndDate(e.target.value)} className="w-full mt-1 p-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-violet-500 focus:border-violet-500" />
                    </div>
                </div>
                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
                
                <div className="max-h-64 overflow-y-auto space-y-2 border-y dark:border-gray-700 py-2">
                    {plans.map(plan => (
                        <div key={plan.id} className="flex items-center p-2 rounded-md hover:bg-slate-100 dark:hover:bg-gray-700">
                            <input
                                type="radio"
                                id={`plan-${plan.id}`}
                                name="plan-selection"
                                value={plan.id}
                                checked={selectedPlanId === plan.id}
                                onChange={() => setSelectedPlanId(plan.id!)}
                                className="h-4 w-4 text-violet-600 border-gray-300 focus:ring-violet-500"
                            />
                            <label htmlFor={`plan-${plan.id}`} className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300 w-full cursor-pointer">
                                {plan.name}
                                <span className="text-xs text-gray-500 dark:text-gray-400 block">
                                    {t('createdOn')} {new Date(plan.creationDate).toLocaleDateString()}
                                </span>
                            </label>
                        </div>
                    ))}
                </div>
                <footer className="mt-6 flex justify-end gap-3">
                    <button onClick={onClose} className="bg-gray-200 dark:bg-gray-600 font-semibold px-4 py-2 rounded-full">{t('cancel')}</button>
                    <button onClick={handleAssign} disabled={selectedPlanId === null} className="bg-violet-600 text-white font-semibold px-4 py-2 rounded-full disabled:bg-violet-400">{t('assignPlan')}</button>
                </footer>
            </div>
        </div>
    );
});

export default AssignPlanModal;