import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import MealItemChecklist from './MealItemChecklist';

const DailyPlanView: React.FC = observer(() => {
    const { dailyPlan, mealPlan } = mealPlanStore;
    if (!dailyPlan) {
        return ( <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-2xl mx-auto"><h2 className="text-2xl font-bold text-gray-800 mb-2">No Plan for Today</h2><p className="text-gray-500">There's no meal scheduled for today in your current plan.</p></div> );
    }
    const dayIndex = mealPlan.findIndex(d => d.day.toUpperCase() === dailyPlan.day.toUpperCase());
    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 hover:shadow-xl transition-all duration-300 max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold text-violet-700 mb-6 capitalize border-b pb-4">Today's Plan: {dailyPlan.day.toLowerCase()}</h3>
            <div className="space-y-5">
                {dailyPlan.meals.map((meal, mealIndex) => (
                    <div key={mealIndex} className="bg-slate-50 p-4 rounded-lg">
                        <h4 className="text-xl font-semibold text-gray-800">{meal.name}</h4>
                        {meal.title && <p className="text-md font-medium text-violet-600 mt-1">{meal.title}</p>}
                        <MealItemChecklist items={meal.items} dayIndex={dayIndex} mealIndex={mealIndex} />
                    </div>
                ))}
            </div>
        </div>
    );
});

export default DailyPlanView;
