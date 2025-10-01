import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';
import { CheckCircleIcon, CloseIcon, UndoIcon } from './Icons';
import MealItemChecklist from './MealItemChecklist';
import MealTimeEditor from './MealTimeEditor';
import NutritionInfoDisplay from './NutritionInfoDisplay';
import ActualNutrition from './ActualNutrition';
import MealModificationControl from './MealModificationControl';

interface MealDetailModalProps {
    dayIndex: number;
    mealIndex: number;
    onClose: () => void;
}

const MealDetailModal: React.FC<MealDetailModalProps> = observer(({ dayIndex, mealIndex, onClose }) => {
    // Fix: Replaced non-existent 'activeMealPlan' with 'masterMealPlan'.
    const { masterMealPlan, toggleMealDone, onlineMode } = mealPlanStore;
    const meal = masterMealPlan[dayIndex]?.meals[mealIndex];

    if (!meal) return null;

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" 
            role="dialog" 
            aria-modal="true" 
            onClick={onClose}
        >
            <div 
                className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-lg w-full p-6 animate-slide-in-up flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-start mb-4 flex-shrink-0">
                    <div>
                        <div className="flex items-center gap-x-2">
                             <h4 className={`text-2xl font-bold text-gray-800 dark:text-gray-200 transition-all ${meal.done ? 'line-through' : ''}`}>{meal.name}</h4>
                             <MealTimeEditor dayIndex={dayIndex} mealIndex={mealIndex} />
                             <MealModificationControl dayIndex={dayIndex} mealIndex={mealIndex} />
                        </div>
                         {meal.title && <p className={`text-lg font-medium text-violet-600 dark:text-violet-400 mt-1 transition-all ${meal.done ? 'line-through' : ''}`}>{meal.title}</p>}
                    </div>
                     <button
                        onClick={onClose}
                        className="p-2 -mt-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label="Close"
                    >
                        <CloseIcon />
                    </button>
                </div>
                
                <div className="overflow-y-auto pr-2 -mr-2">
                    <MealItemChecklist items={meal.items} dayIndex={dayIndex} mealIndex={mealIndex} mealIsDone={meal.done} />
                    {onlineMode && <NutritionInfoDisplay nutrition={meal.nutrition} dayIndex={dayIndex} mealIndex={mealIndex} />}
                    {onlineMode && <ActualNutrition dayIndex={dayIndex} mealIndex={mealIndex} />}
                </div>

                <div className="mt-6 border-t dark:border-gray-700 pt-4 flex-shrink-0">
                     <button
                        // Fix: Corrected function call to match signature 'toggleMealDone(mealIndex: number)'.
                        onClick={() => toggleMealDone(mealIndex)}
                        title={meal.done ? t('markAsToDo') : t('markAsDone')}
                        className={`w-full flex items-center justify-center font-semibold px-6 py-3 rounded-full transition-colors ${meal.done ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-200' : 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 hover:bg-green-200'}`}
                        aria-label={meal.done ? t('markAsToDo') : t('markAsDone')}
                     >
                        {meal.done ? <UndoIcon /> : <CheckCircleIcon />}
                        <span className="ml-2">{meal.done ? t('markAsToDo') : t('markAsDone')}</span>
                     </button>
                </div>
            </div>
        </div>
    );
});

export default MealDetailModal;
