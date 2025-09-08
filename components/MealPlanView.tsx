import React from 'react';
import { observer } from 'mobx-react-lite';
import { DayPlan } from '../types';
import MealItemChecklist from './MealItemChecklist';
import { CheckCircleIcon, UndoIcon } from './Icons';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';
import MealTimeEditor from './MealTimeEditor';
import NutritionInfoDisplay from './NutritionInfoDisplay';

const MealPlanView: React.FC<{ plan: DayPlan[] }> = observer(({ plan }) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {plan.map((day, dayIndex) => {
            const mealsWithOriginalIndex = day.meals.map((meal, index) => ({ ...meal, originalIndex: index }));
            const sortedMeals = mealsWithOriginalIndex.sort((a, b) => Number(a.done) - Number(b.done));

            return (
                <div key={dayIndex} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <h3 className="text-2xl font-bold text-violet-700 dark:text-violet-400 mb-4 capitalize">{day.day.toLowerCase()}</h3>
                    <div className="space-y-4 flex-grow">
                        {sortedMeals.map((meal) => (
                            <div key={meal.originalIndex} className={`border-t border-gray-100 dark:border-gray-700 pt-3 transition-opacity ${meal.done ? 'opacity-60' : ''}`}>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-x-2">
                                            <h4 className={`font-semibold text-gray-800 dark:text-gray-200 transition-all ${meal.done ? 'line-through' : ''}`}>{meal.name}</h4>
                                            <MealTimeEditor dayIndex={dayIndex} mealIndex={meal.originalIndex} />
                                        </div>
                                        {meal.title && <p className={`text-sm font-medium text-violet-600 dark:text-violet-400 transition-all ${meal.done ? 'line-through' : ''}`}>{meal.title}</p>}
                                    </div>
                                    <button
                                        onClick={() => mealPlanStore.toggleMealDone(dayIndex, meal.originalIndex)}
                                        title={meal.done ? t('markAsToDo') : t('markAsDone')}
                                        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0 -mr-1"
                                        aria-label={meal.done ? t('markAsToDo') : t('markAsDone')}
                                     >
                                        {meal.done ? <UndoIcon /> : <CheckCircleIcon />}
                                    </button>
                                </div>
                                <MealItemChecklist items={meal.items} dayIndex={dayIndex} mealIndex={meal.originalIndex} />
                                {mealPlanStore.onlineMode && meal.nutrition && <NutritionInfoDisplay nutrition={meal.nutrition} />}
                            </div>
                        ))}
                    </div>
                </div>
            )
        })}
    </div>
));

export default MealPlanView;