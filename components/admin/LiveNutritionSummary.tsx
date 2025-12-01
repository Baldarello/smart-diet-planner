

import React, { useState, useEffect, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { ingredientStore } from '../../stores/IngredientStore';
import { t } from '../../i18n';
import { Meal, DayPlan, FormDayPlan, FormMeal, FormMealItem } from '../../types';

interface LiveNutritionSummaryProps {
    planData: FormDayPlan[];
}

interface NutritionSummary {
    calories: number;
    carbs: number;
    protein: number;
    fat: number;
}

const initialSummary: NutritionSummary = { calories: 0, carbs: 0, protein: 0, fat: 0 };

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

const LiveNutritionSummary: React.FC<LiveNutritionSummaryProps> = observer(({ planData }) => {
    const [dailySummaries, setDailySummaries] = useState<NutritionSummary[]>([]);
    const debouncedPlanData = useDebounce(planData, 1000);

    useEffect(() => {
        const calculateSummaries = () => {
            const ingredientMap = new Map(ingredientStore.ingredients.map(i => [i.name.toLowerCase(), i]));
            const newSummaries = debouncedPlanData.map(day => {
                const daySummary: NutritionSummary = { ...initialSummary };
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
    }, [debouncedPlanData, ingredientStore.status, ingredientStore.ingredients.length]);

    const weeklyAverage = useMemo(() => {
        const total: NutritionSummary = { ...initialSummary };
        let activeDays = 0;
        dailySummaries.forEach(summary => {
            if (summary.calories > 0) {
                total.calories += summary.calories;
                total.carbs += summary.carbs;
                total.protein += summary.protein;
                total.fat += summary.fat;
                activeDays++;
            }
        });

        if (activeDays === 0) return initialSummary;
        return {
            calories: total.calories / activeDays,
            carbs: total.carbs / activeDays,
            protein: total.protein / activeDays,
            fat: total.fat / activeDays,
        };
    }, [dailySummaries]);

    const SummaryCard: React.FC<{ title: string; summary: NutritionSummary }> = ({ title, summary }) => (
        <div className="bg-slate-100 dark:bg-gray-700 p-3 rounded-lg">
            <h4 className="font-semibold text-center text-gray-700 dark:text-gray-300 mb-2">{title}</h4>
            <div className="grid grid-cols-4 gap-1 text-xs text-center">
                <div className="p-1">
                    <div className="text-gray-500 dark:text-gray-400 font-medium">{t('nutritionCalories')}</div>
                    <div className="font-bold text-base text-red-600 dark:text-red-400">{Math.round(summary.calories)}</div>
                </div>
                <div className="p-1">
                    <div className="text-gray-500 dark:text-gray-400 font-medium">{t('nutritionCarbs')}</div>
                    <div className="font-bold text-base text-orange-600 dark:text-orange-400">{Math.round(summary.carbs)}g</div>
                </div>
                 <div className="p-1">
                    <div className="text-gray-500 dark:text-gray-400 font-medium">{t('nutritionProtein')}</div>
                    <div className="font-bold text-base text-sky-600 dark:text-sky-400">{Math.round(summary.protein)}g</div>
                </div>
                 <div className="p-1">
                    <div className="text-gray-500 dark:text-gray-400 font-medium">{t('nutritionFat')}</div>
                    <div className="font-bold text-base text-amber-600 dark:text-amber-400">{Math.round(summary.fat)}g</div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm sticky top-[70px] z-10 mb-6">
            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-3 text-center">Anteprima Nutrizionale Media Giornaliera</h3>
            <SummaryCard title="Media Settimanale" summary={weeklyAverage} />
        </div>
    );
});

export default LiveNutritionSummary;