import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { DAY_KEYWORDS } from '../services/offlineParser';
import MealDetailModal from './MealDetailModal';
import { DayPlan } from '../types';

const WeeklyCalendarView: React.FC = observer(() => {
    // Fix: Replaced non-existent 'activeMealPlan' with 'masterMealPlan'.
    const { masterMealPlan } = mealPlanStore;
    const [selectedMeal, setSelectedMeal] = useState<{ dayIndex: number; mealIndex: number } | null>(null);

    const planMap = new Map<string, DayPlan>();
    masterMealPlan.forEach(dayPlan => {
        planMap.set(dayPlan.day.toUpperCase(), dayPlan);
    });

    const getDayIndex = (dayName: string) => {
        return masterMealPlan.findIndex(d => d.day.toUpperCase() === dayName.toUpperCase());
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-4 sm:p-6 rounded-2xl shadow-lg transition-all duration-300 max-w-full mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1">
                {DAY_KEYWORDS.map((dayName) => (
                    <div key={dayName} className="flex flex-col">
                        <h3 className="font-bold text-center text-sm uppercase text-violet-700 dark:text-violet-400 p-2 border-b-2 border-violet-200 dark:border-violet-700 mb-2">
                            {dayName.slice(0, 3)}
                        </h3>
                        <div className="space-y-2 flex-grow min-h-[200px]">
                            {planMap.has(dayName) ? (
                                planMap.get(dayName)!.meals.map((meal, mealIndex) => {
                                    const dayIndex = getDayIndex(dayName);
                                    if (dayIndex === -1) return null;
                                    
                                    return (
                                        <button
                                            key={mealIndex}
                                            onClick={() => setSelectedMeal({ dayIndex, mealIndex })}
                                            className={`w-full text-left p-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md hover:-translate-y-0.5 ${
                                                meal.done
                                                    ? 'bg-slate-200 dark:bg-gray-700 opacity-60'
                                                    : 'bg-slate-50 dark:bg-gray-700/50'
                                            }`}
                                        >
                                            <p className={`font-semibold text-xs uppercase text-gray-500 dark:text-gray-400 ${meal.done ? 'line-through' : ''}`}>
                                                {meal.name}
                                            </p>
                                            {meal.title && (
                                                <p className={`text-sm font-medium mt-1 text-gray-800 dark:text-gray-200 ${meal.done ? 'line-through' : ''}`}>
                                                    {meal.title}
                                                </p>
                                            )}
                                        </button>
                                    );
                                })
                            ) : (
                                <div className="p-2 text-center text-xs text-gray-400 dark:text-gray-500"></div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            {selectedMeal && (
                <MealDetailModal
                    dayIndex={selectedMeal.dayIndex}
                    mealIndex={selectedMeal.mealIndex}
                    onClose={() => setSelectedMeal(null)}
                />
            )}
        </div>
    );
});

export default WeeklyCalendarView;
