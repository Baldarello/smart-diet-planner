import React from 'react';
import { observer } from 'mobx-react-lite';
import { DayPlan } from '../types';
import MealItemChecklist from './MealItemChecklist';
import { mealPlanStore } from '../stores/MealPlanStore';
import MealTimeEditor from './MealTimeEditor';
import NutritionInfoDisplay from './NutritionInfoDisplay';
import DailyNutritionSummary from './DailyNutritionSummary';
import MealModificationControl from './MealModificationControl';

const MealPlanView: React.FC<{ plan: DayPlan[], isMasterPlanView?: boolean }> = observer(({ plan, isMasterPlanView = false }) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {plan.map((day, dayIndex) => {
            const summary = mealPlanStore.getDayNutritionSummary(day);

            return (
                <div key={dayIndex} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    <h3 className="text-2xl font-bold text-violet-700 dark:text-violet-400 mb-4 capitalize">{day.day.toLowerCase()}</h3>
                    
                    {mealPlanStore.onlineMode && <DailyNutritionSummary summary={summary} showTitle={false} className="mb-4" />}

                    <div className="space-y-4 flex-grow">
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
            )
        })}
    </div>
));

export default MealPlanView;