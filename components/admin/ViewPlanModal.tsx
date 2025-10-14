import React from 'react';
import { NutritionistPlan } from '../../types';
import { t } from '../../i18n';
import { CloseIcon } from '../Icons';
import MealPlanView from '../MealPlanView';

interface ViewPlanModalProps {
    plan: NutritionistPlan;
    onClose: () => void;
}

const ViewPlanModal: React.FC<ViewPlanModalProps> = ({ plan, onClose }) => {
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" 
            role="dialog" 
            aria-modal="true" 
            onClick={onClose}
        >
            <div 
                className="bg-slate-50 dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-4xl flex flex-col h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 rounded-t-2xl">
                    <h2 id="modal-title" className="text-xl font-bold text-gray-800 dark:text-gray-200">{plan.name}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label={t('close')}
                    >
                        <CloseIcon />
                    </button>
                </header>
                <main className="overflow-y-auto p-6">
                    <MealPlanView plan={plan.planData.weeklyPlan} isMasterPlanView={false} />
                </main>
            </div>
        </div>
    );
};

export default ViewPlanModal;