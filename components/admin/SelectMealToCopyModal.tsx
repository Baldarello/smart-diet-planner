

import React from 'react';
import { t } from '../../i18n';
import { CloseIcon } from '../Icons';
// Fix: Import FormDayPlan and FormMealItem as named exports from ManualPlanEntryForm.
import { FormDayPlan, FormMealItem } from './ManualPlanEntryForm'; 

interface SelectMealToCopyModalProps {
    isOpen: boolean;
    onClose: () => void;
    planData: FormDayPlan[];
    currentMealContext: { dayIndex: number; mealIndex: number } | null;
    onSelectMeal: (mealData: { title: string; procedure: string; time: string; items: FormMealItem[]; isCheat?: boolean; cheatMealDescription?: string }) => void;
}

const SelectMealToCopyModal: React.FC<SelectMealToCopyModalProps> = ({
    isOpen,
    onClose,
    planData,
    currentMealContext,
    onSelectMeal,
}) => {
    if (!isOpen) return null;

    // Flatten all meals for display, excluding the current meal being edited
    const availableMeals = planData.flatMap((day, dayIndex) =>
        day.meals.map((meal, mealIndex) => ({
            dayName: day.day,
            dayIndex,
            mealName: meal.name,
            mealIndex,
            title: meal.title,
            procedure: meal.procedure,
            time: meal.time,
            items: meal.items,
            isCheat: meal.isCheat,
            cheatMealDescription: meal.procedure, // If it's a cheat meal, its procedure is the description
        }))
    ).filter(
        (meal) =>
            !(
                currentMealContext &&
                meal.dayIndex === currentMealContext.dayIndex &&
                meal.mealIndex === currentMealContext.mealIndex
            ) && (
                (meal.isCheat && meal.cheatMealDescription && meal.cheatMealDescription.trim().length > 0) ||
                (!meal.isCheat && meal.items.some(item => item.ingredientName.trim().length > 0))
            )
    );

    const handleMealSelect = (selectedMeal: (typeof availableMeals)[number]) => {
        // Deep copy items to avoid modifying the original planData state directly
        const copiedItems: FormMealItem[] = selectedMeal.items.map(item => ({ ...item }));

        onSelectMeal({
            title: selectedMeal.title,
            procedure: selectedMeal.procedure,
            time: selectedMeal.time,
            items: copiedItems,
            isCheat: selectedMeal.isCheat,
            cheatMealDescription: selectedMeal.cheatMealDescription,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6 animate-slide-in-up flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 id="modal-title" className="text-2xl font-bold text-gray-800 dark:text-gray-200">{t('selectMealToCopy')}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 -mt-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label={t('close')}
                    >
                        <CloseIcon />
                    </button>
                </header>
                
                <div className="overflow-y-auto pr-2 -mr-2">
                    {availableMeals.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('noMealsToCopy')}</p>
                    ) : (
                        <div className="space-y-3">
                            {availableMeals.map((meal, index) => (
                                <button
                                    key={`${meal.dayIndex}-${meal.mealIndex}-${index}`} // Include index for uniqueness within map
                                    onClick={() => handleMealSelect(meal)}
                                    className="w-full text-left p-3 rounded-lg bg-slate-50 dark:bg-gray-700/50 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 capitalize">
                                        {meal.dayName.toLowerCase()} - {meal.mealName}
                                    </p>
                                    <p className="text-gray-800 dark:text-gray-200 mt-1">
                                        {meal.title || (meal.isCheat ? meal.cheatMealDescription || t('cheatMealBadge') : t('noTitleAvailable'))}
                                    </p>
                                    <ul className="text-xs text-gray-500 dark:text-gray-400 mt-2 list-disc list-inside">
                                        {meal.isCheat ? (
                                            meal.cheatMealDescription && <li>{meal.cheatMealDescription}</li>
                                        ) : (
                                            meal.items.slice(0, 2).map((item, i) => (
                                                <li key={i} className="truncate">{item.ingredientName}</li>
                                            ))
                                        )}
                                        {!meal.isCheat && meal.items.length > 2 && <li>...</li>}
                                    </ul>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <footer className="mt-6 border-t dark:border-gray-700 pt-4 flex-shrink-0 flex justify-end">
                    <button onClick={onClose} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold px-6 py-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                        {t('cancel')}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default SelectMealToCopyModal;