import React, { useState } from 'react';
import { DayPlan, Meal, MealItem } from '../types';
import { t } from '../i18n';
import { DAY_KEYWORDS, MEAL_KEYWORDS, MEAL_TIMES } from '../services/offlineParser';
import { getPlanDetailsAndShoppingList } from '../services/geminiService';
import { PlusCircleIcon, TrashIcon } from './Icons';
import UnitPicker from './UnitPicker';

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

const ManualPlanEntryForm: React.FC<{ onCancel: () => void }> = ({ onCancel }) => {
    const [planData, setPlanData] = useState<FormDayPlan[]>(createInitialPlan());
    const [planName, setPlanName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
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
            return;
        }

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

    return (
        <div className="max-w-4xl mx-auto">
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
                                                <input
                                                    type="text"
                                                    placeholder={t('ingredientPlaceholder')}
                                                    value={item.ingredientName}
                                                    onChange={e => handleItemChange(dayIndex, mealIndex, itemIndex, 'ingredientName', e.target.value)}
                                                    className="p-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md focus:ring-violet-500 focus:border-violet-500"
                                                />
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
                <div className="flex justify-center items-center gap-4 pt-6">
                    <button type="button" onClick={onCancel} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold px-8 py-3 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors shadow-lg">
                        {t('cancel')}
                    </button>
                    <button type="submit" disabled={isLoading} className="bg-violet-600 text-white font-semibold px-8 py-3 rounded-full hover:bg-violet-700 transition-colors shadow-lg flex items-center justify-center disabled:bg-violet-400 disabled:cursor-not-allowed">
                        {isLoading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                <span>{t('recalculating')}...</span>
                            </>
                        ) : (
                            t('savePlan')
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ManualPlanEntryForm;