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
import { Meal } from '../types';
import MealModificationControl from './MealModificationControl';
import Snackbar from './Snackbar';
import ActualNutrition from './ActualNutrition';
import StepTracker from './StepTracker';
import BodyMetricsTracker from './BodyMetricsTracker';
import SkeletonLoader from './SkeletonLoader';

const DailyPlanView: React.FC = observer(() => {
    const { dailyPlan, toggleMealDone, dailyNutritionSummary, onlineMode, currentDate, setCurrentDate, startDate, endDate, toggleAllItemsInMeal } = mealPlanStore;

    const todayDateString = new Date().toLocaleDateString('en-CA');
    const isToday = currentDate === todayDateString;

    if (!dailyPlan) {
        return ( 
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg text-center max-w-2xl mx-auto">
                <SkeletonLoader className="h-8 w-48 mx-auto mb-4"/>
                <SkeletonLoader className="h-4 w-64 mx-auto mb-6"/>
                <SkeletonLoader className="h-48 w-full"/>
            </div>
        );
    }
    
    if (!dailyPlan.meals || dailyPlan.meals.length === 0) {
        return ( <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg text-center max-w-2xl mx-auto"><h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('noPlanToday')}</h2><p className="text-gray-500 dark:text-gray-400">{t('noPlanTodaySubtitle')}</p></div> );
    }

    const dayIndex = mealPlanStore.masterMealPlan.findIndex(d => d.day.toUpperCase() === dailyPlan.day.toUpperCase());

    const getSortKey = (meal: { done: boolean; time?: string }) => {
      const primary = meal.done ? 1 : 0;
      const secondary = meal.time || '99:99';
      return `${primary}-${secondary}`;
    };

    const sortedMeals = [...dailyPlan.meals]
      .map((meal, index) => ({ ...meal, originalIndex: index }))
      .sort((a, b) => getSortKey(a).localeCompare(getSortKey(b)));
      
    const changeDate = (offset: number) => {
        const newDate = new Date(currentDate);
        newDate.setDate(newDate.getDate() + offset);
        setCurrentDate(newDate.toISOString().split('T')[0]);
    };
    
    const isFirstDay = startDate ? currentDate <= startDate : false;
    const isLastDay = endDate ? currentDate >= endDate : false;

    const displayDate = new Date(currentDate).toLocaleDateString(
        mealPlanStore.locale === 'it' ? 'it-IT' : mealPlanStore.locale,
        mealPlanStore.locale === 'it'
            ? { day: '2-digit', month: '2-digit', year: 'numeric' }
            : { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }
    );

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8 hover:shadow-xl transition-all duration-300 max-w-4xl mx-auto">
            <div className="flex justify-between items-center border-b dark:border-gray-700 pb-4 mb-4">
                <button onClick={() => changeDate(-1)} disabled={isFirstDay} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">&lt;</button>
                <h3 className={`text-2xl sm:text-3xl font-bold text-violet-700 dark:text-violet-400 text-center ${mealPlanStore.locale !== 'it' ? 'capitalize' : ''}`}>
                    {displayDate}
                </h3>
                <button onClick={() => changeDate(1)} disabled={isLastDay} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">&gt;</button>
            </div>
            
            {isToday && <Snackbar />}
            {onlineMode && <DailyNutritionSummary summary={dailyNutritionSummary} className="my-6" />}
            
            <HydrationTracker />
            <StepTracker />
            <BodyMetricsTracker />

            <div className="space-y-5 mt-6">
                {sortedMeals.map((meal) => {
                    const allItemsUsed = meal.items.length > 0 && meal.items.every(item => item.used);
                    const someItemsUsed = meal.items.some(item => item.used) && !allItemsUsed;

                    return (
                        <div key={meal.originalIndex} className={`bg-slate-50 dark:bg-gray-700/50 p-4 rounded-lg transition-all duration-500 ease-in-out ${meal.done ? 'opacity-60' : 'opacity-100'}`}>
                            <div className="flex justify-between items-start">
                                 <div>
                                    <div className="flex items-center gap-x-3">
                                        <input
                                            type="checkbox"
                                            checked={allItemsUsed}
                                            onChange={() => toggleAllItemsInMeal(meal.originalIndex)}
                                            ref={el => { if (el) el.indeterminate = someItemsUsed; }}
                                            className="h-5 w-5 rounded border-gray-300 dark:border-gray-500 text-violet-600 focus:ring-violet-500 cursor-pointer bg-transparent dark:bg-gray-600 flex-shrink-0"
                                            title={t('toggleAllMealItemsTitle')}
                                            aria-label={t('toggleAllMealItemsTitle')}
                                        />
                                        <h4 className={`text-xl font-semibold text-gray-800 dark:text-gray-200 transition-all ${meal.done ? 'line-through' : ''}`}>{meal.name}</h4>
                                        <MealTimeEditor dayIndex={dayIndex} mealIndex={meal.originalIndex} />
                                        <MealModificationControl dayIndex={dayIndex} mealIndex={meal.originalIndex} />
                                    </div>
                                    {meal.title && <p className={`text-md font-medium text-violet-600 dark:text-violet-400 mt-1 transition-all ${meal.done ? 'line-through' : ''}`}>{meal.title}</p>}
                                 </div>
                                 <button
                                    onClick={() => toggleMealDone(meal.originalIndex)}
                                    title={meal.done ? t('markAsToDo') : t('markAsDone')}
                                    className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0"
                                    aria-label={meal.done ? t('markAsToDo') : t('markAsDone')}
                                 >
                                    {meal.done ? <UndoIcon /> : <CheckCircleIcon />}
                                 </button>
                            </div>

                            <MealItemChecklist items={meal.items} mealIndex={meal.originalIndex} mealIsDone={meal.done} />
                            {onlineMode && <NutritionInfoDisplay nutrition={meal.nutrition} dayIndex={dayIndex} mealIndex={meal.originalIndex} />}
                            {onlineMode && <ActualNutrition dayIndex={dayIndex} mealIndex={meal.originalIndex} />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
});

export default DailyPlanView;