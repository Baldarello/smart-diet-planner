import React from 'react';
import { observer } from 'mobx-react-lite';
import { DayPlan } from '../types';
import MealItemChecklist from './MealItemChecklist';

const MealPlanView: React.FC<{ plan: DayPlan[] }> = observer(({ plan }) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {plan.map((day, dayIndex) => (
            <div key={dayIndex} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <h3 className="text-2xl font-bold text-violet-700 dark:text-violet-400 mb-4 capitalize">{day.day.toLowerCase()}</h3>
                <div className="space-y-4 flex-grow">
                    {day.meals.map((meal, mealIndex) => (
                        <div key={mealIndex} className="border-t border-gray-100 dark:border-gray-700 pt-3">
                            <h4 className="font-semibold text-gray-800 dark:text-gray-200">{meal.name}</h4>
                            {meal.title && <p className="text-sm font-medium text-violet-600 dark:text-violet-400">{meal.title}</p>}
                            <MealItemChecklist items={meal.items} dayIndex={dayIndex} mealIndex={mealIndex} />
                        </div>
                    ))}
                </div>
            </div>
        ))}
    </div>
));

export default MealPlanView;