import React, { useState, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { DayPlan, Meal, MealItem } from '../types';
import { t } from '../i18n';
import { DAY_KEYWORDS, MEAL_KEYWORDS, MEAL_TIMES } from '../services/offlineParser';
import { getPlanDetailsAndShoppingList } from '../services/geminiService';
import { uploadAndShareFile } from '../services/driveService';
import { handleSignIn } from '../services/authService';
import { authStore } from '../stores/AuthStore';
import { PlusCircleIcon, TrashIcon, ShareIcon } from './Icons';
import UnitPicker from './UnitPicker';
import { ingredientStore } from '../stores/IngredientStore';
import ShareLinkModal from './ShareLinkModal';

// New interfaces for form state
interface FormMealItem {
  ingredientName: string;
  quantityValue: string;
  quantityUnit: string;
}

// Define more specific types for the form state to avoid using properties that aren't part of the form
interface FormMeal extends Omit<Meal, 'items' | 'done' | 'nutrition' | 'actualNutrition' | 'cheat' | 'cheatMealDescription' | 'procedure'> {
    items: FormMealItem[];
    procedure: string;
}

interface FormDayPlan extends Omit<DayPlan, 'meals'> {
    meals: FormMeal[];
}

const createInitialPlan = (): FormDayPlan[] => 
    DAY_KEYWORDS.map(day => ({
        day,
        meals: MEAL_KEYWORDS.map(name => ({
            name,
            title: '',
            procedure: '',
            items: [{ ingredientName: '', quantityValue: '', quantityUnit: 'g' }],
            time: MEAL_TIMES[name] || ''
        }))
    }));

const ManualPlanEntryForm: React.FC<{ onCancel: () => void }> = observer(({ onCancel }) => {
    const [planData, setPlanData] = useState<FormDayPlan[]>(createInitialPlan());
    const [planName, setPlanName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);

    // Autocomplete state
    const [activeAutocomplete, setActiveAutocomplete] = useState<{ dayIndex: number; mealIndex: number; itemIndex: number } | null>(null);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const autocompleteRef = useRef<HTMLDivElement>(null);


    const handleMealTitleChange = (dayIndex: number, mealIndex: number, value: string) => {
        setPlanData(currentPlan => 
            currentPlan.map((day, dIdx) => {
                if (dIdx !== dayIndex) return day;
                return {
                    ...day,
                    meals: day.meals.map((meal, mIdx) => {
                        if (mIdx !== mealIndex) return meal;
                        return { ...meal, title: value };
                    })
                };
            })
        );
    };

    const handleMealProcedureChange = (dayIndex: number, mealIndex: number, value: string) => {
        setPlanData(currentPlan => 
            currentPlan.map((day, dIdx) => {
                if (dIdx !== dayIndex) return day;
                return {
                    ...day,
                    meals: day.meals.map((meal, mIdx) => {
                        if (mIdx !== mealIndex) return meal;
                        return { ...meal, procedure: value };
                    })
                };
            })
        );
    };

    const updateSuggestions = (inputValue: string) => {
        if (inputValue.length >= 3) {
            const suggestions = ingredientStore.ingredients.filter(s =>
                s.toLowerCase().includes(inputValue.toLowerCase())
            );
            setFilteredSuggestions(suggestions);
        } else {
            setFilteredSuggestions([]);
        }
    };
    
    const handleItemChange = (dayIndex: number, mealIndex: number, itemIndex: number, field: keyof FormMealItem, value: string) => {
        setPlanData(currentPlan =>
            currentPlan.map((day, dIdx) => {
                if (dIdx !== dayIndex) return day;
                return {
                    ...day,
                    meals: day.meals.map((meal, mIdx) => {
                        if (mIdx !== mealIndex) return meal;
                        return {
                            ...meal,
                            items: meal.items.map((item, iIdx) => {
                                if (iIdx !== itemIndex) return item;
                                return { ...item, [field]: value };
                            })
                        };
                    })
                };
            })
        );
        
        if (field === 'ingredientName') {
            setActiveAutocomplete({ dayIndex, mealIndex, itemIndex });
            updateSuggestions(value);
        }
    };
    
    const handleIngredientFocus = (dayIndex: number, mealIndex: number, itemIndex: number, value: string) => {
        setActiveAutocomplete({ dayIndex, mealIndex, itemIndex });
        updateSuggestions(value);
    };
    
    const handleIngredientBlur = (ingredientName: string) => {
        setTimeout(() => {
            if (autocompleteRef.current && !autocompleteRef.current.contains(document.activeElement)) {
                setActiveAutocomplete(null);
            }
        }, 150);

        const trimmedName = ingredientName.trim();
        if (trimmedName) {
            ingredientStore.addIngredient(trimmedName);
        }
    };

    const handleSuggestionClick = (dayIndex: number, mealIndex: number, itemIndex: number, suggestion: string) => {
        handleItemChange(dayIndex, mealIndex, itemIndex, 'ingredientName', suggestion);
        setActiveAutocomplete(null);
        const trimmedName = suggestion.trim();
        if (trimmedName) {
            ingredientStore.addIngredient(trimmedName);
        }
    };
    
    const handleAddItem = (dayIndex: number, mealIndex: number) => {
        setPlanData(currentPlan =>
            currentPlan.map((day, dIdx) => {
                if (dIdx !== dayIndex) return day;
                return {
                    ...day,
                    meals: day.meals.map((meal, mIdx) => {
                        if (mIdx !== mealIndex) return meal;
                        return { ...meal, items: [...meal.items, { ingredientName: '', quantityValue: '', quantityUnit: 'g' }] };
                    })
                };
            })
        );
    };
    
    const handleRemoveItem = (dayIndex: number, mealIndex: number, itemIndex: number) => {
        setPlanData(currentPlan =>
            currentPlan.map((day, dIdx) => {
                if (dIdx !== dayIndex) return day;
                return {
                    ...day,
                    meals: day.meals.map((meal, mIdx) => {
                        if (mIdx !== mealIndex) return meal;
                        let newItems = meal.items.filter((_, iIdx) => iIdx !== itemIndex);
                        if (newItems.length === 0) {
                            newItems.push({ ingredientName: '', quantityValue: '', quantityUnit: 'g' });
                        }
                        return { ...meal, items: newItems };
                    })
                };
            })
        );
    };

    const generatePlanData = () => {
        const initialWeeklyPlan: DayPlan[] = planData.map(day => ({
            day: day.day,
            meals: day.meals.map(meal => {
                const newItems: MealItem[] = meal.items
                    .filter(item => item.ingredientName.trim() !== '')
                    .map(item => ({
                        ingredientName: item.ingredientName.trim(),
                        fullDescription: `${item.quantityValue.trim() || ''}${item.quantityUnit.trim()} ${item.ingredientName.trim()}`.trim(),
                        used: false,
                    }));
                
                return {
                    name: meal.name,
                    title: meal.title,
                    procedure: meal.procedure,
                    time: meal.time,
                    items: newItems,
                    done: false,
                };
            }).filter(meal => meal.items.length > 0 || (meal.title && meal.title.trim() !== '') || (meal.procedure && meal.procedure.trim() !== ''))
        })).filter(day => day.meals.length > 0);

        if (initialWeeklyPlan.length === 0) {
            alert(t('planEmptyError'));
            return null;
        }
        return initialWeeklyPlan;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const initialWeeklyPlan = generatePlanData();
        if (!initialWeeklyPlan) return;

        setIsLoading(true);
        try {
            const enrichedData = await getPlanDetailsAndShoppingList(initialWeeklyPlan);
            if (!enrichedData) {
                throw new Error("Failed to get enriched data from AI service.");
            }

            const dataToExport = {
                planName: planName.trim() || 'Nuovo Piano Dietetico',
                weeklyPlan: enrichedData.weeklyPlan,
                shoppingList: enrichedData.shoppingList,
            };

            const jsonString = JSON.stringify(dataToExport, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const safePlanName = dataToExport.planName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
            a.download = `diet-plan-${safePlanName}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

        } catch (error) {
            console.error("Error during plan generation:", error);
            alert("An error occurred while generating the plan with AI. Please check the console and try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleShare = async () => {
        const initialWeeklyPlan = generatePlanData();
        if (!initialWeeklyPlan) return;

        const shareAction = async () => {
            if (!authStore.accessToken) {
                alert("Login session is not valid. Please log in again.");
                return;
            }
            setIsSharing(true);
            try {
                const enrichedData = await getPlanDetailsAndShoppingList(initialWeeklyPlan);
                if (!enrichedData) throw new Error("Failed to get enriched data from AI service.");
                
                const dataToShare = {
                    planName: planName.trim() || 'Nuovo Piano Dietetico',
                    weeklyPlan: enrichedData.weeklyPlan,
                    shoppingList: enrichedData.shoppingList,
                };

                const fileId = await uploadAndShareFile(dataToShare, dataToShare.planName, authStore.accessToken);
                if (!fileId) throw new Error("Failed to get shareable file ID from Google Drive.");

                const url = `${window.location.origin}${window.location.pathname}#/?plan_id=${fileId}`;
                setShareUrl(url);

            } catch (error) {
                console.error("Error during plan sharing:", error);
                alert(`An error occurred while sharing the plan: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
                setIsSharing(false);
            }
        };

        if (!authStore.isLoggedIn) {
            authStore.setLoginRedirectAction(shareAction);
            handleSignIn();
        } else {
            await shareAction();
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            {shareUrl && <ShareLinkModal url={shareUrl} onClose={() => setShareUrl(null)} />}
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6 text-center">{t('manualEntryTitle')}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
                 <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm">
                    <label htmlFor="plan-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('planNameLabel')}</label>
                    <input
                        id="plan-name"
                        type="text"
                        value={planName}
                        onChange={(e) => setPlanName(e.target.value)}
                        placeholder={t('planNamePlaceholder')}
                        className="w-full mt-1 p-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-violet-500 focus:border-violet-500"
                        required
                    />
                </div>
                {planData.map((day, dayIndex) => (
                    <details key={day.day} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-all duration-300 group">
                        <summary className="font-semibold text-lg text-violet-700 dark:text-violet-400 cursor-pointer list-none flex items-center p-4">
                           <span className="transform transition-transform duration-200 group-open:rotate-90 text-violet-500 dark:text-violet-400 mr-3">&#9656;</span>
                           <span className="capitalize">{day.day.toLowerCase()}</span>
                        </summary>
                        <div className="p-4 pt-2 space-y-4">
                            {day.meals.map((meal, mealIndex) => (
                                <div key={meal.name} className="bg-slate-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                    <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{meal.name}</h4>
                                    <input
                                        type="text"
                                        placeholder={t('mealTitleLabel')}
                                        value={meal.title}
                                        onChange={(e) => handleMealTitleChange(dayIndex, mealIndex, e.target.value)}
                                        className="w-full mt-2 p-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md focus:ring-violet-500 focus:border-violet-500"
                                    />
                                    <textarea
                                        placeholder={t('procedurePlaceholder')}
                                        value={meal.procedure}
                                        onChange={(e) => handleMealProcedureChange(dayIndex, mealIndex, e.target.value)}
                                        className="w-full mt-2 p-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md focus:ring-violet-500 focus:border-violet-500 text-sm h-24"
                                    />
                                    <div className="mt-3 space-y-2">
                                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('ingredientsLabel')}</label>
                                        {meal.items.map((item, itemIndex) => (
                                            <div key={itemIndex} className="grid grid-cols-1 sm:grid-cols-[1fr,auto,auto,auto] items-center gap-2">
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder={t('ingredientPlaceholder')}
                                                        value={item.ingredientName}
                                                        onChange={e => handleItemChange(dayIndex, mealIndex, itemIndex, 'ingredientName', e.target.value)}
                                                        onFocus={e => handleIngredientFocus(dayIndex, mealIndex, itemIndex, e.target.value)}
                                                        onBlur={() => handleIngredientBlur(item.ingredientName)}
                                                        className="w-full p-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md focus:ring-violet-500 focus:border-violet-500"
                                                        autoComplete="off"
                                                    />
                                                    {activeAutocomplete?.dayIndex === dayIndex &&
                                                     activeAutocomplete?.mealIndex === mealIndex &&
                                                     activeAutocomplete?.itemIndex === itemIndex &&
                                                     filteredSuggestions.length > 0 && (
                                                        <div 
                                                            ref={autocompleteRef}
                                                            className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-lg z-10 max-h-48 overflow-y-auto"
                                                        >
                                                            {filteredSuggestions.map((suggestion, sIndex) => (
                                                                <button
                                                                    key={sIndex}
                                                                    type="button"
                                                                    onMouseDown={() => handleSuggestionClick(dayIndex, mealIndex, itemIndex, suggestion)}
                                                                    className="w-full text-left px-3 py-2 hover:bg-violet-100 dark:hover:bg-gray-700"
                                                                >
                                                                    {suggestion}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    placeholder={t('quantityPlaceholder')}
                                                    value={item.quantityValue}
                                                    onChange={e => handleItemChange(dayIndex, mealIndex, itemIndex, 'quantityValue', e.target.value)}
                                                    className="w-24 p-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md focus:ring-violet-500 focus:border-violet-500"
                                                />
                                                <UnitPicker 
                                                    value={item.quantityUnit} 
                                                    onChange={unit => handleItemChange(dayIndex, mealIndex, itemIndex, 'quantityUnit', unit)}
                                                />
                                                 <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(dayIndex, mealIndex, itemIndex)}
                                                    title={t('removeIngredient')}
                                                    className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400 transition-colors"
                                                 >
                                                    <TrashIcon />
                                                 </button>
                                            </div>
                                        ))}
                                         <button
                                            type="button"
                                            onClick={() => handleAddItem(dayIndex, mealIndex)}
                                            className="mt-2 flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300"
                                         >
                                            <PlusCircleIcon /> {t('addIngredient')}
                                         </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </details>
                ))}
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6">
                    <button type="button" onClick={onCancel} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold px-6 py-3 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors shadow-lg w-full sm:w-auto">
                        {t('cancel')}
                    </button>
                    <button type="submit" disabled={isLoading || isSharing} className="bg-violet-600 text-white font-semibold px-6 py-3 rounded-full hover:bg-violet-700 transition-colors shadow-lg flex items-center justify-center disabled:bg-violet-400 disabled:cursor-not-allowed w-full sm:w-auto">
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                <span>{t('recalculating')}...</span>
                            </>
                        ) : (
                            t('savePlan')
                        )}
                    </button>
                    <button type="button" onClick={handleShare} disabled={isLoading || isSharing} className="bg-green-600 text-white font-semibold px-6 py-3 rounded-full hover:bg-green-700 transition-colors shadow-lg flex items-center justify-center disabled:bg-green-400 disabled:cursor-not-allowed w-full sm:w-auto">
                        {isSharing ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                <span>{t('sharing')}...</span>
                            </>
                        ) : (
                            <>
                                <ShareIcon />
                                <span className="ml-2">{t('sharePlan')}</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
});

export default ManualPlanEntryForm;