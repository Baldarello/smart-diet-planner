import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { DayPlan } from '../types';
import MealItemChecklist from './MealItemChecklist';
import { mealPlanStore } from '../stores/MealPlanStore';
import MealTimeEditor from './MealTimeEditor';
import NutritionInfoDisplay from './NutritionInfoDisplay';
import DailyNutritionSummary from './DailyNutritionSummary';
import MealModificationControl from './MealModificationControl';

const MealPlanView: React.FC<{ plan: DayPlan[], isMasterPlanView?: boolean }> = observer(({ plan, isMasterPlanView = false }) => {
    const [openDayIndex, setOpenDayIndex] = useState<number | null>(null);

    const handleToggle = (dayIndex: number) => {
        setOpenDayIndex(prevIndex => (prevIndex === dayIndex ? null : dayIndex));
    };
    
    return (
        <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
            {plan.map((day, dayIndex) => {
                const summary = mealPlanStore.getDayNutritionSummary(day);
                const isOpen = openDayIndex === dayIndex;

                return (
                    <details 
                        key={dayIndex} 
                        className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 group"
                        open={isOpen}
                    >
                        <summary 
                            className="font-bold text-2xl text-violet-700 dark:text-violet-400 cursor-pointer list-none flex items-center p-6 capitalize"
                            onClick={(e) => {
                                e.preventDefault();
                                handleToggle(dayIndex);
                            }}
                        >
                            <span className="text-sm text-violet-500 dark:text-violet-400 mr-4 transform transition-transform duration-200 group-open:rotate-90">&#9656;</span>
                            {day.day.toLowerCase()}
                        </summary>
                        <div className="px-6 pb-6 pt-0">
                            {mealPlanStore.onlineMode && <DailyNutritionSummary summary={summary} showTitle={false} className="mb-4" />}

                            <div className="space-y-4">
                                {day.meals.map((meal, mealIndex) => (
                                    <div key={mealIndex} className={`border-t border-gray-100 dark:border-gray-700 pt-3`}>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="flex items-center gap-x-2">
                                                    <h4 className={`font-semibold text-gray-800 dark:text-gray-200`}>{meal.name}</h4>
                                                    {isMasterPlanView && <MealTimeEditor dayIndex={dayIndex} mealIndex={mealIndex} />}
                                                    {isMasterPlanView && <MealModificationControl dayIndex={dayIndex} mealIndex={mealIndex} />}
                                                </div>
                                                {meal.title && <p className={`text-sm font-medium text-violet-600 dark:text-violet-400`}>{meal.title}</p>}
                                            </div>
                                        </div>
                                        <MealItemChecklist 
                                            items={meal.items} 
                                            dayIndex={dayIndex} 
                                            mealIndex={mealIndex} 
                                            mealIsDone={false} 
                                            isMasterPlanView={isMasterPlanView}
                                        />
                                        {mealPlanStore.onlineMode && <NutritionInfoDisplay nutrition={meal.nutrition} dayIndex={dayIndex} mealIndex={mealIndex} isMasterPlanView={isMasterPlanView} />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </details>
                )
            })}
        </div>
    );
});

export default MealPlanView;