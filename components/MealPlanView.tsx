import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { DayPlan } from '../types';
import MealItemChecklist from './MealItemChecklist';
import { mealPlanStore } from '../stores/MealPlanStore';
import MealTimeEditor from './MealTimeEditor';
import NutritionInfoDisplay from './NutritionInfoDisplay';
import DailyNutritionSummary from './DailyNutritionSummary';
import MealModificationControl from './MealModificationControl';
import { MoreVertIcon } from './Icons';
import MealActionsPopup from './MealActionsPopup';
import ConfirmationModal from './ConfirmationModal';
import { t } from '../i18n';

const MealPlanView: React.FC<{ plan: DayPlan[], isMasterPlanView?: boolean }> = observer(({ plan, isMasterPlanView = false }) => {
    const [openDayIndex, setOpenDayIndex] = useState<number | null>(0);
    const [actionsMenu, setActionsMenu] = useState<{ dayIndex: number; mealIndex: number } | null>(null);
    const [resettingMeal, setResettingMeal] = useState<{ dayIndex: number; mealIndex: number } | null>(null);

    const handleToggle = (dayIndex: number) => {
        setOpenDayIndex(prevIndex => (prevIndex === dayIndex ? null : dayIndex));
    };
    
    const commonInputProps = {
        className: "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent sm:text-sm appearance-none"
    };

    return (
        <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
            {isMasterPlanView && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                        <label htmlFor="start-date-editor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('startDateLabel')}</label>
                        <input
                            type="date"
                            id="start-date-editor"
                            value={mealPlanStore.startDate || ''}
                            onChange={(e) => mealPlanStore.setPlanStartDate(e.target.value)}
                            {...commonInputProps}
                        />
                    </div>
                    <div>
                        <label htmlFor="end-date-editor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('endDateLabel')}</label>
                        <input
                            type="date"
                            id="end-date-editor"
                            value={mealPlanStore.endDate || ''}
                            onChange={(e) => mealPlanStore.setPlanEndDate(e.target.value)}
                            min={mealPlanStore.startDate || ''}
                            {...commonInputProps}
                        />
                    </div>
                </div>
            )}
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
                            {mealPlanStore.onlineMode && mealPlanStore.showMacros && <DailyNutritionSummary summary={summary} showTitle={false} className="mb-4" />}

                            <div className="space-y-4">
                                {day.meals.map((meal, mealIndex) => {
                                    const isMenuOpen = actionsMenu?.dayIndex === dayIndex && actionsMenu.mealIndex === mealIndex;
                                    return (
                                        <div key={mealIndex} className={`border-t border-gray-100 dark:border-gray-700 pt-3`}>
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <h4 className={`font-semibold text-gray-800 dark:text-gray-200`}>{meal.name}</h4>
                                                    {meal.title && <p className={`text-sm font-medium text-violet-600 dark:text-violet-400 truncate`}>{meal.title}</p>}
                                                </div>
                                                {isMasterPlanView && (
                                                    <div className="flex items-center gap-1 sm:gap-2">
                                                        <div className="hidden sm:flex items-center gap-2">
                                                            <MealTimeEditor dayIndex={dayIndex} mealIndex={mealIndex} />
                                                            <MealModificationControl dayIndex={dayIndex} mealIndex={mealIndex} onResetClick={() => setResettingMeal({ dayIndex, mealIndex })} />
                                                        </div>
                                                        <div className="relative sm:hidden">
                                                            <button onClick={(e) => { e.stopPropagation(); setActionsMenu({ dayIndex, mealIndex }); }} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600">
                                                                <MoreVertIcon />
                                                            </button>
                                                            {isMenuOpen && (
                                                                <MealActionsPopup
                                                                    dayIndex={dayIndex}
                                                                    mealIndex={mealIndex}
                                                                    onClose={() => setActionsMenu(null)}
                                                                    onResetClick={() => setResettingMeal({ dayIndex, mealIndex })}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                            <MealItemChecklist 
                                                items={meal.items} 
                                                dayIndex={dayIndex} 
                                                mealIndex={mealIndex} 
                                                mealIsDone={false} 
                                                isEditable={isMasterPlanView}
                                                showCheckbox={false}
                                            />
                                            {mealPlanStore.onlineMode && mealPlanStore.showMacros && <NutritionInfoDisplay nutrition={meal.nutrition} dayIndex={dayIndex} mealIndex={mealIndex} isMasterPlanView={isMasterPlanView} />}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </details>
                )
            })}
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

export default MealPlanView;