import React, { useState } from 'react';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';

interface CheatMealModalProps {
    mealIndex: number;
    onClose: () => void;
}

const CheatMealModal: React.FC<CheatMealModalProps> = ({ mealIndex, onClose }) => {
    const [description, setDescription] = useState('');

    const handleSave = () => {
        if (description.trim()) {
            mealPlanStore.logCheatMeal(mealIndex, description.trim());
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-slide-in-up">
                <h2 id="modal-title" className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('cheatMealModalTitle')}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{t('cheatMealModalPrompt')}</p>
                
                <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={t('cheatMealModalPlaceholder')}
                    className="w-full h-32 p-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
                    autoFocus
                />

                <div className="flex justify-end gap-4 mt-6">
                    <button onClick={onClose} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold px-6 py-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                        {t('cancel')}
                    </button>
                    <button onClick={handleSave} disabled={!description.trim()} className="bg-violet-600 text-white font-semibold px-6 py-2 rounded-full hover:bg-violet-700 transition-colors disabled:bg-violet-400 disabled:cursor-not-allowed">
                        {t('save')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CheatMealModal;
