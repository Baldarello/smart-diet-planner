import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { useNavigate } from 'react-router-dom';
import { mealPlanStore } from '../stores/MealPlanStore';
import MealItemChecklist from './MealItemChecklist';
import { t } from '../i18n';
import { CheckCircleIcon, UndoIcon, WarningIcon, MoreVertIcon } from './Icons';
import HydrationTracker from './HydrationTracker';
import MealTimeEditor from './MealTimeEditor';
import DailyNutritionSummary from './DailyNutritionSummary';
import NutritionInfoDisplay from './NutritionInfoDisplay';
import { Meal } from '../types';
import MealModificationControl from './MealModificationControl';
import Snackbar from './Snackbar';
import StepTracker from './StepTracker';
import BodyMetricsTracker from './BodyMetricsTracker';
import SkeletonLoader from './SkeletonLoader';
import CheatMealModal from './CheatMealModal';
import MealActionsPopup from './MealActionsPopup';
import ConfirmationModal from './ConfirmationModal';

const DailyPlanView: React.FC = observer(() => {
    const { dailyPlan, toggleMealDone, dailyNutritionSummary, currentDate, setCurrentDate, startDate, endDate, toggleAllItemsInMeal, undoCheatMeal } = mealPlanStore;
    const navigate = useNavigate();
    const [cheatingMealIndex, setCheatingMealIndex] = useState<number | null>(null);
    const [actionsMenuMealIndex, setActionsMenuMealIndex] = useState<number | null>(null);
    const [resettingMeal, setResettingMeal] = useState<{ dayIndex: number; mealIndex: number } | null>(null);
    const [activeMobileTab, setActiveMobileTab] = useState<'meals' | 'trackers'>('meals');


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

    const getSortKey = (meal: { done: boolean; cheat?: boolean; time?: string }) => {
      const primary = (meal.done || meal.cheat) ? 1 : 0;
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
    const formattedDayName = dailyPlan.day.charAt(0) + dailyPlan.day.slice(1).toLowerCase();

    const MealsContent = (
        <div className="space-y-5 mt-6">
            {sortedMeals.map((meal) => {
                const allItemsUsed = meal.items.length > 0 && meal.items.every(item => item.used);
                const someItemsUsed = meal.items.some(item => item.used) && !allItemsUsed;

                const containerClasses = meal.done
                    ? 'opacity-60 bg-slate-50 dark:bg-gray-700/50'
                    : meal.cheat
                    ? 'bg-orange-50 dark:bg-orange-900/30'
                    : 'bg-slate-50 dark:bg-gray-700/50';

                return (
                    <div key={meal.originalIndex} className={`p-4 rounded-lg transition-all duration-500 ease-in-out ${containerClasses}`}>
                        <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-x-2">
                                    {!meal.cheat && (
                                        <input
                                            type="checkbox"
                                            checked={allItemsUsed}
                                            onChange={() => toggleAllItemsInMeal(meal.originalIndex)}
                                            ref={el => { if (el) el.indeterminate = someItemsUsed; }}
                                            className="h-5 w-5 rounded border-gray-300 dark:border-gray-500 text-violet-600 focus:ring-violet-500 cursor-pointer bg-transparent dark:bg-gray-600 flex-shrink-0"
                                            title={t('toggleAllMealItemsTitle')}
                                            aria-label={t('toggleAllMealItemsTitle')}
                                        />
                                    )}
                                    <h4 className={`text-xl font-semibold text-gray-800 dark:text-gray-200 transition-all ${meal.done ? 'line-through' : ''}`}>{meal.name}</h4>
                                    {meal.cheat && <span className="text-xs font-bold uppercase text-orange-500 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50 px-2 py-1 rounded-full">{t('cheatMealBadge')}</span>}
                                </div>
                                {meal.title && <p className={`text-md font-medium text-violet-600 dark:text-violet-400 mt-1 transition-all truncate ${meal.done ? 'line-through' : ''}`}>{meal.title}</p>}
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2">
                                {/* Desktop-only actions */}
                                <div className="hidden sm:flex items-center gap-2">
                                    <MealTimeEditor dayIndex={dayIndex} mealIndex={meal.originalIndex} />
                                    <MealModificationControl dayIndex={dayIndex} mealIndex={meal.originalIndex} onResetClick={() => setResettingMeal({ dayIndex, mealIndex: meal.originalIndex })} />
                                    {mealPlanStore.showCheatMealButton && !meal.done && !meal.cheat && (
                                        <button onClick={() => setCheatingMealIndex(meal.originalIndex)} title={t('logCheatMealTitle')} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0" aria-label={t('logCheatMealTitle')}>
                                            <WarningIcon />
                                        </button>
                                    )}
                                </div>

                                {/* Common done/undo actions */}
                                {meal.cheat ? (
                                    <button onClick={() => undoCheatMeal(meal.originalIndex)} title={t('undoCheatMealTitle')} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0" aria-label={t('undoCheatMealTitle')}>
                                        <UndoIcon />
                                    </button>
                                ) : (
                                    <button onClick={() => toggleMealDone(meal.originalIndex)} title={meal.done ? t('markAsToDo') : t('markAsDone')} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex-shrink-0" aria-label={meal.done ? t('markAsToDo') : t('markAsDone')}>
                                        {meal.done ? <UndoIcon /> : <CheckCircleIcon />}
                                    </button>
                                )}
                                
                                {/* Mobile-only menu */}
                                {!meal.done && !meal.cheat && (
                                    <div className="relative sm:hidden">
                                        <button onClick={(e) => { e.stopPropagation(); setActionsMenuMealIndex(meal.originalIndex); }} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
                                            <MoreVertIcon />
                                        </button>
                                        {actionsMenuMealIndex === meal.originalIndex && (
                                            <MealActionsPopup 
                                                dayIndex={dayIndex}
                                                mealIndex={meal.originalIndex}
                                                onClose={() => setActionsMenuMealIndex(null)}
                                                onLogCheatMeal={() => setCheatingMealIndex(meal.originalIndex)}
                                                onResetClick={() => setResettingMeal({ dayIndex, mealIndex: meal.originalIndex })}
                                            />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {meal.cheat && meal.cheatMealDescription && (
                            <div className="mt-2 p-3 bg-white dark:bg-gray-800 rounded-lg">
                                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{meal.cheatMealDescription}</p>
                            </div>
                        )}

                        {!meal.cheat && (
                             <>
                                {meal.procedure && (
                                    <div className="mt-3 p-3 bg-slate-100 dark:bg-gray-700 rounded-lg border dark:border-gray-600">
                                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{meal.procedure}</p>
                                    </div>
                                )}
                                <MealItemChecklist items={meal.items} dayIndex={dayIndex} mealIndex={meal.originalIndex} mealIsDone={meal.done} isEditable={true} showCheckbox={true} />
                            </>
                        )}
                        {mealPlanStore.showMacros && !meal.cheat && <NutritionInfoDisplay nutrition={meal.nutrition} dayIndex={dayIndex} mealIndex={meal.originalIndex} />}
                    </div>
                );
            })}
        </div>
    );

    const TrackersContent = (
        <>
            <HydrationTracker />
            <StepTracker />
            <BodyMetricsTracker />
        </>
    );

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8 hover:shadow-xl transition-all duration-300 max-w-4xl mx-auto">
            <div className="flex justify-between items-center border-b dark:border-gray-700 pb-4 mb-4">
                <button onClick={() => changeDate(-1)} disabled={isFirstDay} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">&lt;</button>
                <button 
                    onClick={() => navigate('/calendar')}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title={t('tabCalendar')}
                >
                    <h3 className="text-2xl sm:text-3xl font-bold text-violet-700 dark:text-violet-400 text-center capitalize">
                        {mealPlanStore.locale === 'it' ? `${formattedDayName}, ${displayDate}` : displayDate}
                    </h3>
                </button>
                <button onClick={() => changeDate(1)} disabled={isLastDay} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">&gt;</button>
            </div>
            
            {isToday && <Snackbar />}

            {/* Mobile Tab Nav */}
            <div className="sm:hidden border-b border-gray-200 dark:border-gray-700">
                 <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button
                        onClick={() => setActiveMobileTab('meals')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeMobileTab === 'meals'
                                ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                        }`}
                        aria-current={activeMobileTab === 'meals' ? 'page' : undefined}
                    >
                        {t('mealsTab')}
                    </button>
                    <button
                        onClick={() => setActiveMobileTab('trackers')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                            activeMobileTab === 'trackers'
                                ? 'border-violet-500 text-violet-600 dark:text-violet-400'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:border-gray-500'
                        }`}
                        aria-current={activeMobileTab === 'trackers' ? 'page' : undefined}
                    >
                        {t('trackersTab')}
                    </button>
                </nav>
            </div>

            {/* Desktop View */}
            <div className="hidden sm:block">
                {mealPlanStore.showMacros && <DailyNutritionSummary summary={dailyNutritionSummary} className="my-6" />}
                {TrackersContent}
                {MealsContent}
            </div>

            {/* Mobile View */}
            <div className="sm:hidden">
                {activeMobileTab === 'meals' && (
                    <>
                        {mealPlanStore.showMacros && <DailyNutritionSummary summary={dailyNutritionSummary} className="my-6" />}
                        {MealsContent}
                    </>
                )}
                {activeMobileTab === 'trackers' && TrackersContent}
            </div>

            {cheatingMealIndex !== null && (
                <CheatMealModal
                    mealIndex={cheatingMealIndex}
                    onClose={() => setCheatingMealIndex(null)}
                />
            )}
            {resettingMeal && (
                <ConfirmationModal
                    isOpen={!!resettingMeal}
                    onClose={() => setResettingMeal(null)}
                    onConfirm={() => mealPlanStore.resetMealToPreset(resettingMeal.dayIndex, resettingMeal.mealIndex)}
                    title={t('resetMealModalTitle')}
                >
                    <p>{t('resetMealModalContent')}</p>
                </ConfirmationModal>
            )}
        </div>
    );
});

export default DailyPlanView;