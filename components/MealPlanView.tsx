

import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { DayPlan, Meal } from '../types';
import MealItemChecklist from './MealItemChecklist';
import { mealPlanStore } from '../stores/MealPlanStore';
import MealTimeEditor from './MealTimeEditor';
import NutritionInfoDisplay from './NutritionInfoDisplay';
import DailyNutritionSummary from './DailyNutritionSummary';
import MealModificationControl from './MealModificationControl';
import { MoreVertIcon, ClockIcon, CheckIcon, CloseIcon } from './Icons';
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

    const toggleSelection = (sectionKey: string, index: number) => {
        const currentSelections = preferences[sectionKey] || [];
        // If empty/undefined, it means "ALL". So if we toggle one, we are moving to "Custom" mode.
        // But wait, if it's currently "ALL", and I click one, do I select ONLY that one, or deselect it?
        // Let's assume standard checkbox logic:
        // If "ALL" (undefined), all are visually checked. Clicking one unchecks it -> so we need to store the *included* ones.
        
        let newSelections: number[];
        
        if (currentSelections.length === 0) {
            // Currently selecting ALL. 
            // If we are clicking one, we probably want to *keep* the others? 
            // Or maybe the user wants to pick just *this* one?
            // "Select Options to Consume": Usually implies picking what you want.
            // Let's initialize with just this one selected.
            newSelections = [index];
        } else {
            if (currentSelections.includes(index)) {
                newSelections = currentSelections.filter(i => i !== index);
            } else {
                newSelections = [...currentSelections, index];
            }
        }
        
        // If we deselected the last one, should we revert to "All" or leave empty (nothing)? 
        // Let's leave empty (nothing selected).
        // To revert to "All", maybe a specific button?
        
        setGenericPlanPreference(dayName, sectionKey, newSelections);
    };
    
    const selectAll = (sectionKey: string, totalItems: number) => {
        // We can represent "All" by either an array of all indices OR undefined/empty.
        // Our store logic uses "if selectedIndices ... include". So to include all, we can remove the key or fill the array.
        // Let's remove the key from preferences for cleanliness (default state).
        // However, `setGenericPlanPreference` expects an array. Let's send an empty array but handle it?
        // No, let's explicitely select all indices for clarity in UI, or delete the key.
        // Store implementation: `this.genericPlanPreferences[day][sectionKey] = selectedIndices;`
        // Update store logic: if array is empty or null, it might mean "Nothing selected".
        // Let's look at `generateDailyLogFromGeneric`: 
        // `if (selectedIndices && !selectedIndices.includes(index)) return;`
        // This implies if `selectedIndices` is undefined (key missing), checks are skipped -> SHOW ALL.
        // So to select all, we pass `undefined` (or handle it in store).
        // Let's pass all indices.
        const allIndices = Array.from({length: totalItems}, (_, i) => i);
        setGenericPlanPreference(dayName, sectionKey, allIndices);
    };
    
    const clearSection = (sectionKey: string) => {
        setGenericPlanPreference(dayName, sectionKey, []);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">Opzioni per {dayName.toLowerCase()}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <CloseIcon />
                    </button>
                </header>
                <div className="overflow-y-auto p-6 space-y-6">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Seleziona le opzioni che desideri visualizzare nel piano giornaliero per questo giorno. Se nessuna opzione è selezionata per una categoria, non verrà mostrata alcuna opzione.</p>
                    {sections.map((section, idx) => {
                        if (section.items.length === 0) return null;
                        const selectedIndices = preferences[section.key];
                        // If undefined, it acts as "Show All" in the generator logic? 
                        // Wait, looking at generator: `const selectedIndices = preferences[sectionKey];`
                        // `if (selectedIndices && !selectedIndices.includes(index)) return;`
                        // If `selectedIndices` is undefined (key missing), checks are skipped -> SHOW ALL.
                        // If `selectedIndices` is [], it exists, checks happen -> includes fails -> returns -> SHOW NONE.
                        
                        const isAllSelected = selectedIndices === undefined;
                        
                        return (
                            <div key={idx} className="bg-slate-50 dark:bg-gray-700/30 rounded-lg p-4">
                                <div className="flex justify-between items-center mb-3">
                                    <h3 className="font-bold text-gray-700 dark:text-gray-300 text-sm">{section.title}</h3>
                                    <div className="flex gap-2">
                                        <button onClick={() => setGenericPlanPreference(dayName, section.key, undefined as any)} className="text-xs text-violet-600 hover:underline">Tutti</button>
                                        <button onClick={() => clearSection(section.key)} className="text-xs text-red-500 hover:underline">Nessuno</button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {section.items.map((item, itemIdx) => {
                                        const isSelected = isAllSelected || selectedIndices?.includes(itemIdx);
                                        return (
                                            <div 
                                                key={itemIdx} 
                                                className={`flex items-center p-3 rounded-md border cursor-pointer transition-colors ${isSelected ? 'bg-white dark:bg-gray-600 border-violet-300 dark:border-violet-500' : 'bg-transparent border-gray-200 dark:border-gray-600 opacity-60'}`}
                                                onClick={() => {
                                                    // If we are in "Show All" state (undefined), and click one, we assume the user wants to toggle THAT one off?
                                                    // No, "Checkbox logic" implies clicking an unchecked box selects it.
                                                    // But here everything starts "Selected".
                                                    // If "All Selected", clicking one should probably Deselect it.
                                                    let newSel;
                                                    if (isAllSelected) {
                                                        // All are selected. Deselecting this one.
                                                        const allOthers = section.items.map((_, i) => i).filter(i => i !== itemIdx);
                                                        newSel = allOthers;
                                                    } else {
                                                        // Explicit list exists. Toggle.
                                                        if (selectedIndices.includes(itemIdx)) {
                                                            newSel = selectedIndices.filter(i => i !== itemIdx);
                                                        } else {
                                                            newSel = [...selectedIndices, itemIdx];
                                                        }
                                                    }
                                                    setGenericPlanPreference(dayName, section.key, newSel);
                                                }}
                                            >
                                                <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-3 ${isSelected ? 'bg-violet-600 border-violet-600' : 'border-gray-400'}`}>
                                                    {isSelected && <CheckIcon className="w-3 h-3 text-white" />}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-800 dark:text-gray-200 text-sm">{item.name || `Opzione ${itemIdx + 1}`}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.items.map(i => i.ingredientName).join(', ')}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
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
                                className="p-4 bg-slate-50 dark:bg-gray-700/50 rounded-xl border border-slate-200 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-500 transition-all flex justify-between items-center group"
                            >
                                <span className="font-bold text-gray-700 dark:text-gray-300 capitalize">{day.toLowerCase()}</span>
                                <span className="p-2 bg-white dark:bg-gray-600 rounded-full text-gray-400 group-hover:text-violet-600 transition-colors">
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
