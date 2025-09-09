import React, { useState } from 'react';
import { mealPlanStore } from '../stores/MealPlanStore';
import { DayPlan, Meal } from '../types';
import { t } from '../i18n';
import { DAY_KEYWORDS, MEAL_KEYWORDS, MEAL_TIMES } from '../services/offlineParser';
import { PlusCircleIcon, TrashIcon } from './Icons';

const createInitialPlan = (): DayPlan[] => 
    DAY_KEYWORDS.map(day => ({
        day,
        meals: MEAL_KEYWORDS.map(name => ({
            name,
            title: '',
            items: [{ fullDescription: '', ingredientName: '', used: false }],
            done: false,
            time: MEAL_TIMES[name] || ''
        }))
    }));

const ManualPlanEntryForm: React.FC<{ onCancel: () => void }> = ({ onCancel }) => {
    const [planData, setPlanData] = useState<DayPlan[]>(createInitialPlan());

    const handlePlanChange = <T extends keyof Meal, V extends Meal[T]>(dayIndex: number, mealIndex: number, field: T, value: V) => {
        setPlanData(currentPlan => {
            const newPlan = [...currentPlan];
            const updatedMeals = [...newPlan[dayIndex].meals];
            updatedMeals[mealIndex] = { ...updatedMeals[mealIndex], [field]: value };
            newPlan[dayIndex] = { ...newPlan[dayIndex], meals: updatedMeals };
            return newPlan;
        });
    };

    const handleItemChange = (dayIndex: number, mealIndex: number, itemIndex: number, value: string) => {
        const newItems = [...planData[dayIndex].meals[mealIndex].items];
        newItems[itemIndex] = { ...newItems[itemIndex], fullDescription: value };
        handlePlanChange(dayIndex, mealIndex, 'items', newItems as Meal['items']);
    };
    
    const handleAddItem = (dayIndex: number, mealIndex: number) => {
        const newItems = [...planData[dayIndex].meals[mealIndex].items, { fullDescription: '', ingredientName: '', used: false }];
        handlePlanChange(dayIndex, mealIndex, 'items', newItems as Meal['items']);
    };
    
    const handleRemoveItem = (dayIndex: number, mealIndex: number, itemIndex: number) => {
        const newItems = planData[dayIndex].meals[mealIndex].items.filter((_, i) => i !== itemIndex);
        handlePlanChange(dayIndex, mealIndex, 'items', newItems as Meal['items']);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mealPlanStore.processManualPlan(planData);
    };

    return (
        <div className="max-w-4xl mx-auto animate-slide-in-up">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6 text-center">{t('manualEntryTitle')}</h2>
            <form onSubmit={handleSubmit} className="space-y-3">
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
                                        onChange={(e) => handlePlanChange(dayIndex, mealIndex, 'title', e.target.value)}
                                        className="w-full mt-2 p-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md focus:ring-violet-500 focus:border-violet-500"
                                    />
                                    <div className="mt-3 space-y-2">
                                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">{t('ingredientsLabel')}</label>
                                        {meal.items.map((item, itemIndex) => (
                                            <div key={itemIndex} className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    placeholder={t('ingredientPlaceholder')}
                                                    value={item.fullDescription}
                                                    onChange={e => handleItemChange(dayIndex, mealIndex, itemIndex, e.target.value)}
                                                    className="flex-grow p-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md focus:ring-violet-500 focus:border-violet-500"
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
                    <button type="submit" className="bg-violet-600 text-white font-semibold px-8 py-3 rounded-full hover:bg-violet-700 transition-colors shadow-lg">
                        {t('savePlan')}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ManualPlanEntryForm;
