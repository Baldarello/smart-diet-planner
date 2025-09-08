import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import MealItemChecklist from './MealItemChecklist';
import { t } from '../i18n';
import { CheckCircleIcon, UndoIcon } from './Icons';
import HydrationTracker from './HydrationTracker';
import MealTimeEditor from './MealTimeEditor';
import DailyNutritionSummary from './DailyNutritionSummary';
import NutritionInfoDisplay from './NutritionInfoDisplay';

const DailyPlanView: React.FC = observer(() => {
    const { dailyPlan, toggleMealDone, dailyNutritionSummary, onlineMode } = mealPlanStore;

    if (!dailyPlan) {
        return ( <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg text-center max-w-2xl mx-auto"><h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('noPlanToday')}</h2><p className="text-gray-500 dark:text-gray-400">{t('noPlanTodaySubtitle')}</p></div> );
    }

    const dayIndex = mealPlanStore.mealPlan.findIndex(d => d.day.toUpperCase() === dailyPlan.day.toUpperCase());

    const sortedMeals = [...dailyPlan.meals]
      .map((meal, index) => ({ ...meal, originalIndex: index }))
      .sort((a, b) => {
        if (a.done !== b.done) {
            return Number(a.done) - Number(b.done);
        }
        if (a.time && b.time) {
            return a.time.localeCompare(b.time);
        }
        return 0;
    });

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8 hover:shadow-xl transition-all duration-300 max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold text-violet-700 dark:text-violet-400 mb-4 capitalize border-b dark:border-gray-700 pb-4">{t('todaysPlan')} {dailyPlan.day.toLowerCase()}</h3>
            
            {onlineMode && <DailyNutritionSummary summary={dailyNutritionSummary} className="my-6" />}
            
            <HydrationTracker />

            <div className="space-y-5 mt-6">
                {sortedMeals.map((meal) => (
                    <div key={meal.originalIndex} className={`bg-slate-50 dark:bg-gray-700/50 p-4 rounded-lg transition-all duration-500 ease-in-out ${meal.done ? 'opacity-60' : 'opacity-100'}`}>
                        <div className="flex justify-between items-start">
                             <div>
                                <div className="flex items-center gap-x-2">
                                    <h4 className={`text-xl font-semibold text-gray-800 dark:text-gray-200 transition-all ${meal.done ? 'line-through' : ''}`}>{meal.name}</h4>
                                    <MealTimeEditor dayIndex={dayIndex} mealIndex={meal.originalIndex} />
                                </div>
                                {meal.title && <p className={`text-md font-medium text-violet-600 dark:text-violet-400 mt-1 transition-all ${meal.done ? 'line-through' : ''}`}>{meal.title}</p>}
                             </div>
                             <button
                                onClick={() => toggleMealDone(dayIndex, meal.originalIndex)}
                                title={meal.done ? t('markAsToDo') : t('markAsDone')}
                                className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
                                aria-label={meal.done ? t('markAsToDo') : t('markAsDone')}
                             >
                                {meal.done ? <UndoIcon /> : <CheckCircleIcon />}
                             </button>
                        </div>

                        <MealItemChecklist items={meal.items} dayIndex={dayIndex} mealIndex={meal.originalIndex} />
                        {onlineMode && <NutritionInfoDisplay nutrition={meal.nutrition} />}
                    </div>
                ))}
            </div>
        </div>
    );
});

export default DailyPlanView;