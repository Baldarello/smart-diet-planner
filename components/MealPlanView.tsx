
import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { DayPlan, Meal } from '../types';
import MealItemChecklist from './MealItemChecklist';
import { mealPlanStore } from '../stores/MealPlanStore';
import MealTimeEditor from './MealTimeEditor';
import NutritionInfoDisplay from './NutritionInfoDisplay';
import DailyNutritionSummary from './DailyNutritionSummary';
import MealModificationControl from './MealModificationControl';
import { MoreVertIcon, ClockIcon, CheckIcon, CloseIcon, ChevronRightIcon } from './Icons';
import MealActionsPopup from './MealActionsPopup';
import ConfirmationModal from './ConfirmationModal';
import { t } from '../i18n';
import { DAY_KEYWORDS } from '../services/offlineParser';

const GenericPlanDayConfig: React.FC<{ dayName: string; onClose: () => void }> = observer(({ dayName, onClose }) => {
    const { genericPlanData, genericPlanPreferences, setGenericPlanPreference } = mealPlanStore;
    if (!genericPlanData) return null;

    const allSnacks = [...(genericPlanData.snacks || []), ...(genericPlanData.snack1 || []), ...(genericPlanData.snack2 || [])];

    const sections = [
        { title: "COLAZIONE", key: "breakfast", items: genericPlanData.breakfast },
        { title: "SPUNTINI", key: "snacks", items: allSnacks },
        { title: "PRANZO - CARBOIDRATI", key: "lunch_carbs", items: genericPlanData.lunch.carbs },
        { title: "PRANZO - PROTEINE", key: "lunch_protein", items: genericPlanData.lunch.protein },
        { title: "PRANZO - VERDURE", key: "lunch_vegetables", items: genericPlanData.lunch.vegetables },
        { title: "PRANZO - GRASSI", key: "lunch_fats", items: genericPlanData.lunch.fats },
        { title: "CENA - CARBOIDRATI", key: "dinner_carbs", items: genericPlanData.dinner.carbs },
        { title: "CENA - PROTEINE", key: "dinner_protein", items: genericPlanData.dinner.protein },
        { title: "CENA - VERDURE", key: "dinner_vegetables", items: genericPlanData.dinner.vegetables },
        { title: "CENA - GRASSI", key: "dinner_fats", items: genericPlanData.dinner.fats },
    ];

    const preferences = genericPlanPreferences[dayName] || {};

    const clearSection = (sectionKey: string) => {
        setGenericPlanPreference(dayName, sectionKey, []);
    };

    return (
        <div className="fixed inset-0 z-[60] bg-white dark:bg-gray-900 flex flex-col" onClick={e => e.stopPropagation()}>
            <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800 shadow-sm shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 capitalize">Opzioni per {dayName.toLowerCase()}</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Espandi le sezioni per configurare il piano.</p>
                </div>
                <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    <CloseIcon />
                </button>
            </header>
            <div className="overflow-y-auto p-4 space-y-3 flex-grow bg-slate-50 dark:bg-gray-900">
                {sections.map((section, idx) => {
                    if (section.items.length === 0) return null;
                    const selectedIndices = preferences[section.key];
                    // If undefined, it means "Show All"
                    const isAllSelected = selectedIndices === undefined;
                    const selectionCount = isAllSelected ? section.items.length : selectedIndices.length;
                    
                    return (
                        <details key={idx} className="group bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
                            <summary className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors list-none select-none">
                                <div className="flex items-center gap-3">
                                    <span className="transform transition-transform duration-200 group-open:rotate-90 text-violet-500 dark:text-violet-400">
                                        <ChevronRightIcon />
                                    </span>
                                    <div>
                                        <h3 className="font-bold text-gray-700 dark:text-gray-300 text-sm">{section.title}</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                            {selectionCount === 0 ? "Nessuna opzione selezionata" : 
                                             isAllSelected ? "Tutte le opzioni attive" : 
                                             `${selectionCount} opzioni selezionate`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                                    <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setGenericPlanPreference(dayName, section.key, undefined as any); }} 
                                        className={`text-xs px-2 py-1 rounded border transition-colors ${isAllSelected ? 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-500'}`}
                                    >
                                        Tutti
                                    </button>
                                    <button 
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); clearSection(section.key); }} 
                                        className="text-xs px-2 py-1 rounded border border-gray-300 bg-white text-red-500 hover:bg-red-50 hover:border-red-200 dark:bg-gray-700 dark:border-gray-500 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        Nessuno
                                    </button>
                                </div>
                            </summary>
                            <div className="p-4 pt-0 border-t border-gray-100 dark:border-gray-700 mt-2">
                                <div className="space-y-2 mt-2">
                                    {section.items.map((item, itemIdx) => {
                                        const isSelected = isAllSelected || selectedIndices?.includes(itemIdx);
                                        return (
                                            <div 
                                                key={itemIdx} 
                                                className={`flex items-start p-3 rounded-md border cursor-pointer transition-all ${isSelected ? 'bg-violet-50 dark:bg-gray-700/50 border-violet-300 dark:border-violet-500 shadow-sm' : 'bg-transparent border-gray-200 dark:border-gray-600 opacity-60 grayscale-[0.5]'}`}
                                                onClick={() => {
                                                    let newSel;
                                                    if (isAllSelected) {
                                                        const allOthers = section.items.map((_, i) => i).filter(i => i !== itemIdx);
                                                        newSel = allOthers;
                                                    } else {
                                                        if (selectedIndices.includes(itemIdx)) {
                                                            newSel = selectedIndices.filter(i => i !== itemIdx);
                                                        } else {
                                                            newSel = [...selectedIndices, itemIdx];
                                                        }
                                                    }
                                                    setGenericPlanPreference(dayName, section.key, newSel);
                                                }}
                                            >
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center mr-3 mt-0.5 flex-shrink-0 transition-colors ${isSelected ? 'bg-violet-600 border-violet-600' : 'border-gray-400 bg-white dark:bg-gray-700'}`}>
                                                    {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium text-gray-800 dark:text-gray-200 text-sm truncate">{item.name || `Opzione ${itemIdx + 1}`}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 break-words whitespace-normal leading-relaxed mt-1">
                                                        {item.items.map(i => i.ingredientName).join(', ')}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </details>
                    );
                })}
            </div>
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 shrink-0 text-right safe-area-bottom">
                <button onClick={onClose} className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-6 py-2 rounded-full transition-colors shadow-sm">
                    Chiudi
                </button>
            </div>
        </div>
    );
});

const MealPlanView: React.FC<{ plan: DayPlan[], isMasterPlanView?: boolean }> = observer(({ plan, isMasterPlanView = false }) => {
    const { isGenericPlan, startDate, endDate } = mealPlanStore;
    const [openDayIndex, setOpenDayIndex] = useState<number | null>(0);
    const [actionsMenu, setActionsMenu] = useState<{ dayIndex: number; mealIndex: number } | null>(null);
    const [resettingMeal, setResettingMeal] = useState<{ dayIndex: number; mealIndex: number } | null>(null);
    
    // Generic Plan State
    const [configuringDay, setConfiguringDay] = useState<string | null>(null);

    const handleToggle = (dayIndex: number) => {
        setOpenDayIndex(prevIndex => (prevIndex === dayIndex ? null : dayIndex));
    };
    
    const commonInputProps = {
        readOnly: true,
        className: "mt-1 block w-full px-3 py-2 bg-slate-100 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-transparent focus:border-transparent sm:text-sm appearance-none cursor-not-allowed"
    };

    const formatDate = (dateString: string | null): string => {
        if (!dateString) return '';
        try {
            const [year, month, day] = dateString.split('-');
            return `${day}/${month}/${year}`;
        } catch(e) {
            return dateString;
        }
    };

    if (isGenericPlan && isMasterPlanView) {
        return (
            <div className="max-w-4xl mx-auto">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">Pianificazione Settimanale</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">Seleziona un giorno per personalizzare quali opzioni del tuo piano mostrare. Di default, vengono mostrate tutte le opzioni.</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {DAY_KEYWORDS.map(day => (
                            <button 
                                key={day} 
                                onClick={() => setConfiguringDay(day)}
                                className="p-4 bg-slate-50 dark:bg-gray-700/50 rounded-xl border border-slate-200 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-500 transition-all flex justify-between items-center group shadow-sm hover:shadow-md"
                            >
                                <span className="font-bold text-gray-700 dark:text-gray-300 capitalize">{day.toLowerCase()}</span>
                                <span className="p-2 bg-white dark:bg-gray-600 rounded-full text-gray-400 group-hover:text-violet-600 transition-colors shadow-sm">
                                    <MoreVertIcon />
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
                {configuringDay && <GenericPlanDayConfig dayName={configuringDay} onClose={() => setConfiguringDay(null)} />}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-6 max-w-4xl mx-auto">
            {isMasterPlanView && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div>
                        <label htmlFor="start-date-editor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('startDateLabel')}</label>
                        <input
                            type="text"
                            id="start-date-editor"
                            value={formatDate(mealPlanStore.startDate)}
                            {...commonInputProps}
                        />
                    </div>
                    <div>
                        <label htmlFor="end-date-editor" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('endDateLabel')}</label>
                        <input
                            type="text"
                            id="end-date-editor"
                            value={formatDate(mealPlanStore.endDate)}
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
                                                     {meal.cheat && <span className="text-xs font-bold uppercase text-orange-500 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/50 px-2 py-1 rounded-full mt-1 inline-block">{t('cheatMealBadge')}</span>}
                                                </div>
                                                {meal.time && !meal.cheat && (
                                                    <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
                                                        <ClockIcon />
                                                        <span>{meal.time}</span>
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {meal.cheat && meal.cheatMealDescription ? (
                                                <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                                                    {meal.time && (
                                                        <div className="flex items-center font-semibold text-sm text-orange-800 dark:text-orange-300 mb-2">
                                                            <ClockIcon />
                                                            <span>{meal.time}</span>
                                                        </div>
                                                    )}
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{meal.cheatMealDescription}</p>
                                                </div>
                                            ) : (
                                                <>
                                                    <MealItemChecklist 
                                                        items={meal.items} 
                                                        dayIndex={dayIndex} 
                                                        mealIndex={mealIndex} 
                                                        mealIsDone={false} 
                                                        isEditable={false}
                                                        showCheckbox={false}
                                                    />
                                                    {meal.procedure && (
                                                        <details className="mt-3 group">
                                                            <summary className="cursor-pointer list-none flex items-center text-sm font-semibold text-violet-600 dark:text-violet-400">
                                                                <span className="transform transition-transform duration-200 group-open:rotate-90 mr-2 text-violet-400 dark:text-violet-500">&#9656;</span>
                                                                {t('procedureLabel')}
                                                            </summary>
                                                            <div className="mt-2 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                                                                <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{meal.procedure}</p>
                                                            </div>
                                                        </details>
                                                    )}
                                                </>
                                            )}

                                            {mealPlanStore.onlineMode && mealPlanStore.showMacros && !meal.cheat && <NutritionInfoDisplay nutrition={meal.nutrition} dayIndex={dayIndex} mealIndex={mealIndex} isMasterPlanView={isMasterPlanView} />}
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
