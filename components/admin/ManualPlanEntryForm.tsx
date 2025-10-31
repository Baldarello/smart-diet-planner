import React, { useState, useRef, useEffect, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { DayPlan, Meal, MealItem, ShoppingListCategory, ShoppingListItem, NutritionistPlan, NutritionInfo, Patient, AssignedPlan, PlanCreationData } from '../../types';
import { t } from '../../i18n';
import { DAY_KEYWORDS, MEAL_KEYWORDS, MEAL_TIMES } from '../../services/offlineParser';
import { getCategoriesForIngredients } from '../../services/geminiService';
import { PlusCircleIcon, TrashIcon, CookieIcon } from '../Icons';
import UnitPicker from '../UnitPicker';
import { ingredientStore } from '../../stores/IngredientStore';
import { nutritionistStore } from '../../stores/NutritionistStore';
import { uiStore } from '../../stores/UIStore';
import { parseQuantity } from '../../utils/quantityParser';
import { recipeStore } from '../../stores/RecipeStore';
import LiveNutritionSummary from './LiveNutritionSummary';
import { patientStore } from '../../stores/PatientStore';

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
    isCheat?: boolean;
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
            time: MEAL_TIMES[name] || '',
            isCheat: false,
        }))
    }));

interface ManualPlanEntryFormProps {
    onCancel: () => void;
    onPlanSaved: (planId?: number) => void;
    planToEdit?: NutritionistPlan | AssignedPlan | null;
    patientForPlan?: Patient | null;
    onDirtyStateChange: (isDirty: boolean) => void;
}

function useDebounce(value: any, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => {
            clearTimeout(handler);
        };
    }, [JSON.stringify(value), delay]); // Stringify to compare deep value
    return debouncedValue;
}

const MealNutritionSummaryDisplay: React.FC<{ summary: NutritionInfo }> = ({ summary }) => {
    if (summary.calories === 0) return null;
    return (
        <div className="grid grid-cols-4 gap-1 text-xs text-center mt-3 p-2 bg-slate-200 dark:bg-gray-600 rounded-md">
            <div>
                <div className="text-gray-500 dark:text-gray-400 font-medium">{t('nutritionCalories')}</div>
                <div className="font-bold text-sm text-red-600 dark:text-red-400">{Math.round(summary.calories)}</div>
            </div>
            <div>
                <div className="text-gray-500 dark:text-gray-400 font-medium">{t('nutritionCarbs')}</div>
                <div className="font-bold text-sm text-orange-600 dark:text-orange-400">{Math.round(summary.carbs)}g</div>
            </div>
            <div>
                <div className="text-gray-500 dark:text-gray-400 font-medium">{t('nutritionProtein')}</div>
                <div className="font-bold text-sm text-sky-600 dark:text-sky-400">{Math.round(summary.protein)}g</div>
            </div>
            <div>
                <div className="text-gray-500 dark:text-gray-400 font-medium">{t('nutritionFat')}</div>
                <div className="font-bold text-sm text-amber-600 dark:text-amber-400">{Math.round(summary.fat)}g</div>
            </div>
        </div>
    );
};

const DayNutritionSummaryDisplay: React.FC<{ summary: NutritionInfo | undefined }> = ({ summary }) => {
    if (!summary || summary.calories === 0) return null;
    return (
        <div className="bg-slate-100 dark:bg-gray-700/50 p-3 rounded-lg my-4">
            <div className="grid grid-cols-4 gap-1 text-sm text-center">
                <div>
                    <div className="text-gray-500 dark:text-gray-400 font-medium">{t('nutritionCalories')}</div>
                    <div className="font-bold text-base text-red-600 dark:text-red-400">{Math.round(summary.calories)}</div>
                </div>
                <div>
                    <div className="text-gray-500 dark:text-gray-400 font-medium">{t('nutritionCarbs')}</div>
                    <div className="font-bold text-base text-orange-600 dark:text-orange-400">{Math.round(summary.carbs)}g</div>
                </div>
                 <div>
                    <div className="text-gray-500 dark:text-gray-400 font-medium">{t('nutritionProtein')}</div>
                    <div className="font-bold text-base text-sky-600 dark:text-sky-400">{Math.round(summary.protein)}g</div>
                </div>
                 <div>
                    <div className="text-gray-500 dark:text-gray-400 font-medium">{t('nutritionFat')}</div>
                    <div className="font-bold text-base text-amber-600 dark:text-amber-400">{Math.round(summary.fat)}g</div>
                </div>
            </div>
        </div>
    );
};

const OverlapError: React.FC<{ plans: AssignedPlan[] }> = ({ plans }) => (
    <div>
        <p className="font-semibold mb-2">La data selezionata si sovrappone con i seguenti piani:</p>
        <ul className="list-disc list-inside space-y-1 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-md">
            {plans.map(p => (
                <li key={p.id}>
                    <strong>{p.planData.planName}</strong>: {p.startDate} - {p.endDate}
                </li>
            ))}
        </ul>
    </div>
);


const ManualPlanEntryForm: React.FC<ManualPlanEntryFormProps> = observer(({ onCancel, onPlanSaved, planToEdit, patientForPlan, onDirtyStateChange }) => {
    const [planData, setPlanData] = useState<FormDayPlan[]>(createInitialPlan());
    const [planName, setPlanName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [dailySummaries, setDailySummaries] = useState<NutritionInfo[]>([]);
    const debouncedPlanData = useDebounce(planData, 500);
    
    const isForPatient = !!patientForPlan || (!!planToEdit && 'patientId' in planToEdit);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // Autocomplete state
    const [activeAutocomplete, setActiveAutocomplete] = useState<{ dayIndex: number; mealIndex: number; itemIndex: number } | null>(null);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const autocompleteRef = useRef<HTMLDivElement>(null);
    const initialPlanState = useRef<string | null>(null);

    useEffect(() => {
        // This effect runs when planToEdit or patientForPlan changes, setting the initial state of the form.
        let initialName = '';
        let initialPlan = createInitialPlan();

        if (patientForPlan) {
            initialName = `Piano per ${patientForPlan.firstName} ${patientForPlan.lastName}`;
        } else if (planToEdit) {
            const isAssigned = 'patientId' in planToEdit;
            const planDataSource = isAssigned ? (planToEdit as AssignedPlan).planData : planToEdit.planData;
            const planNameSource = isAssigned ? (planToEdit as AssignedPlan).planData.planName : planToEdit.name;

            initialName = planNameSource;

            const planMap = new Map(planDataSource.weeklyPlan.map(d => [d.day.toUpperCase(), d]));
            initialPlan.forEach(formDay => {
                const sourceDay = planMap.get(formDay.day.toUpperCase());
                if (sourceDay) {
                    formDay.meals.forEach(formMeal => {
                        // Fix: Explicitly cast `sourceDay` to `DayPlan` to resolve type inference issue.
                        const sourceMeal = (sourceDay as DayPlan).meals.find(m => m.name.toUpperCase() === formMeal.name.toUpperCase());
                        if (sourceMeal) {
                            formMeal.title = sourceMeal.title || '';
                            formMeal.time = sourceMeal.time || formMeal.time;
                            formMeal.isCheat = sourceMeal.cheat || false;
                            if (sourceMeal.cheat) {
                                formMeal.procedure = sourceMeal.cheatMealDescription || '';
                                formMeal.items = [{ ingredientName: '', quantityValue: '', quantityUnit: 'g' }];
                            } else {
                                formMeal.procedure = sourceMeal.procedure || '';
                                const formItems = sourceMeal.items.map(item => {
                                    const parsed = parseQuantity(item.fullDescription);
                                    return {
                                        ingredientName: item.ingredientName,
                                        quantityValue: parsed?.value?.toString() ?? '',
                                        quantityUnit: parsed?.unit ?? 'g',
                                    };
                                });
                                formMeal.items = formItems.length > 0 ? formItems : [{ ingredientName: '', quantityValue: '', quantityUnit: 'g' }];
                            }
                        }
                    });
                }
            });
        }
        
        if (planToEdit && 'patientId' in planToEdit) {
            const assignedPlan = planToEdit as AssignedPlan;
            setStartDate(assignedPlan.startDate);
            setEndDate(assignedPlan.endDate);
        } else if (patientForPlan) {
            const today = new Date().toISOString().split('T')[0];
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            const nextMonthStr = nextMonth.toISOString().split('T')[0];
            setStartDate(today);
            setEndDate(nextMonthStr);
        }
        
        setPlanName(initialName);
        setPlanData(initialPlan);

        // Store the initial state as a string for easy comparison.
        initialPlanState.current = JSON.stringify({ planName: initialName, planData: initialPlan });
        onDirtyStateChange(false); // Reset dirty state on prop change
    }, [planToEdit, patientForPlan]);

    useEffect(() => {
        // This effect runs whenever the form state changes to check if it's dirty.
        if (initialPlanState.current === null) return;

        const currentStateString = JSON.stringify({ planName, planData });
        const isDirty = currentStateString !== initialPlanState.current;
        onDirtyStateChange(isDirty);
    }, [planName, planData, onDirtyStateChange]);

    useEffect(() => {
        const calculateSummaries = () => {
            const ingredientMap = new Map(ingredientStore.ingredients.map(i => [i.name.toLowerCase(), i]));
            const newSummaries = debouncedPlanData.map(day => {
                const daySummary: NutritionInfo = { calories: 0, carbs: 0, protein: 0, fat: 0 };
                day.meals.forEach(meal => {
                    if (meal.isCheat) return;
                    meal.items.forEach(item => {
                        const ingredient = ingredientMap.get(item.ingredientName.toLowerCase().trim());
                        const quantity = parseFloat(item.quantityValue);
                        if (ingredient && ingredient.calories !== undefined && !isNaN(quantity) && quantity > 0) {
                            const factor = quantity / 100; // Nutrition is per 100g
                            daySummary.calories += (ingredient.calories || 0) * factor;
                            daySummary.carbs += (ingredient.carbs || 0) * factor;
                            daySummary.protein += (ingredient.protein || 0) * factor;
                            daySummary.fat += (ingredient.fat || 0) * factor;
                        }
                    });
                });
                return daySummary;
            });
            setDailySummaries(newSummaries);
        };

        if (ingredientStore.status === 'ready') {
            calculateSummaries();
        }
    }, [debouncedPlanData, ingredientStore.status, ingredientStore.ingredients]);


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
    
    const handleMealTimeChange = (dayIndex: number, mealIndex: number, value: string) => {
        setPlanData(currentPlan => 
            currentPlan.map((day, dIdx) => {
                if (dIdx !== dayIndex) return day;
                return {
                    ...day,
                    meals: day.meals.map((meal, mIdx) => {
                        if (mIdx !== mealIndex) return meal;
                        return { ...meal, time: value };
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
            const suggestions = ingredientStore.ingredients
                .map(i => i.name)
                .filter(s =>
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

    const handleToggleCheatMeal = (dayIndex: number, mealIndex: number) => {
        setPlanData(currentPlan =>
            currentPlan.map((day, dIdx) => {
                if (dIdx !== dayIndex) return day;
                return {
                    ...day,
                    meals: day.meals.map((meal, mIdx) => {
                        if (mIdx !== mealIndex) return meal;
                        const isNowCheat = !meal.isCheat;
                        return {
                            ...meal,
                            isCheat: isNowCheat,
                            procedure: '', // Clear procedure as its meaning changes
                            items: [{ ingredientName: '', quantityValue: '', quantityUnit: 'g' }], // Reset items
                        };
                    })
                };
            })
        );
    };

    const handleRecipeSelect = (dayIndex: number, mealIndex: number, recipeIdStr: string) => {
        if (!recipeIdStr) return;
        const recipeId = parseInt(recipeIdStr, 10);
    
        const selectedRecipe = recipeStore.recipes.find(r => r.id === recipeId);
        if (!selectedRecipe) return;
    
        setPlanData(currentPlan =>
            currentPlan.map((day, dIdx) => {
                if (dIdx !== dayIndex) return day;
                return {
                    ...day,
                    meals: day.meals.map((meal, mIdx) => {
                        if (mIdx !== mealIndex) return meal;
    
                        const newItems: FormMealItem[] = selectedRecipe.ingredients.map(ing => ({
                            ingredientName: ing.ingredientName,
                            quantityValue: ing.quantityValue?.toString() ?? '',
                            quantityUnit: ing.quantityUnit,
                        }));
    
                        return {
                            ...meal,
                            title: selectedRecipe.name,
                            procedure: selectedRecipe.procedure ?? meal.procedure,
                            items: newItems.length > 0 ? newItems : [{ ingredientName: '', quantityValue: '', quantityUnit: 'g' }],
                        };
                    })
                };
            })
        );
    };

    const generateAndProcessPlan = async (): Promise<PlanCreationData | null> => {
        // 1. Build a preliminary plan and aggregate ingredients for the shopping list
        const aggregatedIngredients = new Map<string, { totalValue: number; unit: string }>();
        const weeklyPlan: DayPlan[] = planData.map(day => ({
            day: day.day,
            meals: day.meals.map(meal => {
                if (meal.isCheat) {
                    return {
                        name: meal.name,
                        title: meal.title,
                        time: meal.time,
                        items: [],
                        done: false,
                        cheat: true,
                        cheatMealDescription: meal.procedure,
                    };
                }

                const newItems: MealItem[] = meal.items
                    .filter(item => item.ingredientName.trim() !== '')
                    .map(item => {
                        const name = item.ingredientName.trim();
                        const value = parseFloat(item.quantityValue) || 0;
                        const unit = item.quantityUnit.trim();

                        const existing = aggregatedIngredients.get(name);
                        if (existing && existing.unit === unit) {
                            existing.totalValue += value;
                        } else if (!existing) {
                            aggregatedIngredients.set(name, { totalValue: value, unit });
                        }
                        return {
                            ingredientName: name,
                            fullDescription: [item.quantityValue.trim(), unit, name].filter(Boolean).join(' '),
                            used: false,
                        };
                    });
                return {
                    name: meal.name, title: meal.title, procedure: meal.procedure,
                    time: meal.time, items: newItems, done: false,
                };
            }).filter(meal => (meal.cheat && meal.cheatMealDescription) || meal.items.length > 0 || !!meal.title || !!meal.procedure)
        })).filter(day => day.meals.length > 0);

        if (weeklyPlan.length === 0) {
            uiStore.showInfoModal(t('errorOccurred'), t('planEmptyError'));
            return null;
        }

        // 2. Check local cache for categories
        const uniqueNames = Array.from(aggregatedIngredients.keys());
        const uncachedNames: string[] = [];
        const categoryMap = new Map<string, string>();
        uniqueNames.forEach(name => {
            const cachedCategory = ingredientStore.getCategoryForIngredient(name);
            if (cachedCategory) {
                categoryMap.set(name, cachedCategory);
            } else {
                uncachedNames.push(name);
            }
        });

        // 3. Call API for uncached ingredients
        if (uncachedNames.length > 0) {
            try {
                const newCategories = await getCategoriesForIngredients(uncachedNames);
                // 4. Update local DB cache and map
                await ingredientStore.setCategories(newCategories);
                for (const name in newCategories) {
                    categoryMap.set(name, newCategories[name]);
                }
            } catch (e) {
                console.error("Failed to fetch categories, will proceed without them for some items.", e);
            }
        }
        
        // 5. Build final shopping list
        const shoppingListByCategory: Record<string, ShoppingListItem[]> = {};
        aggregatedIngredients.forEach(({ totalValue, unit }, name) => {
            const category = categoryMap.get(name) || t('uncategorized');
            if (!shoppingListByCategory[category]) {
                shoppingListByCategory[category] = [];
            }
            shoppingListByCategory[category].push({ item: name, quantityValue: totalValue || null, quantityUnit: unit });
        });
        const shoppingList: ShoppingListCategory[] = Object.entries(shoppingListByCategory)
            .map(([category, items]) => ({ category, items }))
            .sort((a, b) => a.category.localeCompare(b.category));
        
        return {
            planName: planName.trim() || 'Nuovo Piano Dietetico',
            weeklyPlan, shoppingList,
        };
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        if (isForPatient) {
            if (!startDate || !endDate || new Date(endDate) <= new Date(startDate)) {
                uiStore.showInfoModal(t('errorOccurred'), t('dateValidationError'));
                setIsLoading(false);
                return;
            }

            const patientId = patientForPlan?.id || (planToEdit as AssignedPlan).patientId;
            const excludePlanId = (planToEdit && 'patientId' in planToEdit) ? planToEdit.id : undefined;

            const overlappingPlans = patientStore.getOverlappingPlans(patientId, startDate, endDate, excludePlanId);

            if (overlappingPlans.length > 0) {
                uiStore.showInfoModal(
                    "Conflitto Date",
                    <OverlapError plans={overlappingPlans} />
                );
                setIsLoading(false);
                return;
            }
        }


        try {
            const finalData = await generateAndProcessPlan();
            if (!finalData) {
                setIsLoading(false);
                return;
            }

            if (planToEdit && 'patientId' in planToEdit) { // Editing AssignedPlan
                await patientStore.updateAssignedPlanData(planToEdit.id!, finalData, startDate, endDate);
                onPlanSaved(planToEdit.id);
            } else if (patientForPlan) { // Creating new AssignedPlan
                await patientStore.createAndAssignPlan(patientForPlan.id!, finalData, startDate, endDate);
                onPlanSaved();
            } else if (planToEdit && 'creationDate' in planToEdit) { // Editing Template
                await nutritionistStore.updatePlan(planToEdit.id!, finalData);
                onPlanSaved(planToEdit.id);
            } else { // Creating new Template
                const newPlanId = await nutritionistStore.addPlan(finalData);
                onPlanSaved(newPlanId as number);
            }

        } catch (error) {
            console.error("Error during plan saving:", error);
            uiStore.showInfoModal(t('errorOccurred'), t('savePlanError'));
        } finally {
            setIsLoading(false);
        }
    };

    const isEditMode = !!planToEdit;

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6 text-center">{t(isEditMode ? 'editPlanTitle' : 'manualEntryTitle')}</h2>
            
            <LiveNutritionSummary planData={planData} />

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

                {isForPatient && (
                    <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('startDateLabel')}</label>
                            <input
                                id="start-date"
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full mt-1 p-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('endDateLabel')}</label>
                            <input
                                id="end-date"
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                min={startDate}
                                className="w-full mt-1 p-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
                                required
                            />
                        </div>
                    </div>
                )}
                
                {planData.map((day, dayIndex) => (
                    <details key={day.day} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-all duration-300 group">
                        <summary className="font-semibold text-lg text-violet-700 dark:text-violet-400 cursor-pointer list-none flex items-center p-4">
                           <span className="transform transition-transform duration-200 group-open:rotate-90 text-violet-500 dark:text-violet-400 mr-3">&#9656;</span>
                           <span className="capitalize">{day.day.toLowerCase()}</span>
                        </summary>
                        <div className="p-4 pt-2 space-y-4">
                            <DayNutritionSummaryDisplay summary={dailySummaries[dayIndex]} />
                            {day.meals.map((meal, mealIndex) => {
                                const mealSummary = (() => {
                                    const summary: NutritionInfo = { calories: 0, carbs: 0, protein: 0, fat: 0 };
                                    const ingredientMap = new Map(ingredientStore.ingredients.map(i => [i.name.toLowerCase(), i]));
                                    
                                    if (meal.isCheat) return summary;

                                    meal.items.forEach(item => {
                                        const ingredient = ingredientMap.get(item.ingredientName.toLowerCase().trim());
                                        const quantity = parseFloat(item.quantityValue);
                                        if (ingredient && ingredient.calories !== undefined && !isNaN(quantity) && quantity > 0) {
                                            const factor = quantity / 100; // Nutrition is per 100g
                                            summary.calories += (ingredient.calories || 0) * factor;
                                            summary.carbs += (ingredient.carbs || 0) * factor;
                                            summary.protein += (ingredient.protein || 0) * factor;
                                            summary.fat += (ingredient.fat || 0) * factor;
                                        }
                                    });
                                    return summary;
                                })();

                                return (
                                <div key={meal.name} className="bg-slate-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                    <div className="flex justify-between items-center mb-2 flex-wrap gap-y-2">
                                        <div className="flex items-center gap-x-4 gap-y-2 flex-wrap">
                                            <h4 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{meal.name}</h4>
                                            
                                            {!meal.isCheat && recipeStore.recipes.length > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <label htmlFor={`recipe-picker-${dayIndex}-${mealIndex}`} className="text-sm font-medium text-gray-600 dark:text-gray-400 hidden sm:inline">{t('recipeColumnHeader')}:</label>
                                                    <select
                                                        id={`recipe-picker-${dayIndex}-${mealIndex}`}
                                                        onChange={(e) => {
                                                            handleRecipeSelect(dayIndex, mealIndex, e.target.value);
                                                            e.target.value = ''; // Reset selector to allow re-selection
                                                        }}
                                                        className="p-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md focus:ring-violet-500 focus:border-violet-500 text-sm"
                                                        defaultValue=""
                                                    >
                                                        <option value="">{t('selectRecipePlaceholder')}</option>
                                                        {recipeStore.recipes.map(recipe => (
                                                            <option key={recipe.id} value={recipe.id!}>
                                                                {recipe.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center gap-2 sm:gap-4">
                                            <button
                                                type="button"
                                                onClick={() => handleToggleCheatMeal(dayIndex, mealIndex)}
                                                title={meal.isCheat ? t('markAsRegularMeal') : t('markAsCheatMeal')}
                                                className="text-sm font-semibold text-orange-500 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300 flex items-center gap-1.5 p-1 rounded-md"
                                            >
                                                <CookieIcon />
                                                <span className="hidden sm:inline">{meal.isCheat ? t('markAsRegularMeal') : t('markAsCheatMeal')}</span>
                                            </button>
                                            <input
                                                type="time"
                                                value={meal.time}
                                                onChange={(e) => handleMealTimeChange(dayIndex, mealIndex, e.target.value)}
                                                title={t('mealTime')}
                                                className="p-1 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md focus:ring-violet-500 focus:border-violet-500 text-sm"
                                            />
                                        </div>
                                    </div>

                                    {meal.isCheat ? (
                                        <textarea
                                            placeholder={t('cheatMealDescriptionPlaceholder')}
                                            value={meal.procedure}
                                            onChange={(e) => handleMealProcedureChange(dayIndex, mealIndex, e.target.value)}
                                            className="w-full mt-2 p-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md focus:ring-violet-500 focus:border-violet-500 text-sm h-24"
                                        />
                                    ) : (
                                        <>
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
                                            <MealNutritionSummaryDisplay summary={mealSummary} />
                                        </>
                                    )}
                                </div>
                                );
                            })}
                        </div>
                    </details>
                ))}
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-6">
                    <button type="button" onClick={onCancel} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold px-6 py-3 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors shadow-lg w-full sm:w-auto">
                        {t('cancel')}
                    </button>
                    <button type="submit" disabled={isLoading} className="bg-violet-600 text-white font-semibold px-6 py-3 rounded-full hover:bg-violet-700 transition-colors shadow-lg flex items-center justify-center disabled:bg-violet-400 disabled:cursor-not-allowed w-full sm:w-auto">
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                <span>{t('recalculating')}...</span>
                            </>
                        ) : (
                            t(isEditMode ? 'updatePlan' : 'savePlan')
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
});

export default ManualPlanEntryForm;