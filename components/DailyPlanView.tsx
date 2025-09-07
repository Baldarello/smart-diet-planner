import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import MealItemChecklist from './MealItemChecklist';
import { t } from '../i18n';

const DailyPlanView: React.FC = observer(() => {
    const { dailyPlan, mealPlan } = mealPlanStore;
    if (!dailyPlan) {
        return ( <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg text-center max-w-2xl mx-auto"><h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('noPlanToday')}</h2><p className="text-gray-500 dark:text-gray-400">{t('noPlanTodaySubtitle')}</p></div> );
    }
    const dayIndex = mealPlan.findIndex(d => d.day.toUpperCase() === dailyPlan.day.toUpperCase());
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8 hover:shadow-xl transition-all duration-300 max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold text-violet-700 dark:text-violet-400 mb-6 capitalize border-b dark:border-gray-700 pb-4">{t('todaysPlan')} {dailyPlan.day.toLowerCase()}</h3>
            <div className="space-y-5">
                {dailyPlan.meals.map((meal, mealIndex) => (
                    <div key={mealIndex} className="bg-slate-50 dark:bg-gray-700/50 p-4 rounded-lg">
                        <h4 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{meal.name}</h4>
                        {meal.title && <p className="text-md font-medium text-violet-600 dark:text-violet-400 mt-1">{meal.title}</p>}
                        <MealItemChecklist items={meal.items} dayIndex={dayIndex} mealIndex={mealIndex} />
                    </div>
                ))}
            </div>
        </div>
    );
});

export default DailyPlanView;