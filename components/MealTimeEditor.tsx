import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';
import { ClockIcon } from './Icons';

interface MealTimeEditorProps {
    dayIndex: number;
    mealIndex: number;
}

const MealTimeEditor: React.FC<MealTimeEditorProps> = observer(({ dayIndex, mealIndex }) => {
    const meal = mealPlanStore.mealPlan[dayIndex]?.meals[mealIndex];
    const [isEditing, setIsEditing] = useState(false);

    if (!meal?.time) return null;

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        mealPlanStore.updateMealTime(dayIndex, mealIndex, e.target.value);
    };

    const handleBlur = () => {
        setIsEditing(false);
    };

    return (
        <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400">
            <ClockIcon />
            {isEditing ? (
                <input
                    type="time"
                    value={meal.time}
                    onChange={handleTimeChange}
                    onBlur={handleBlur}
                    autoFocus
                    className="bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md px-1 py-0.5 w-24"
                />
            ) : (
                <span onClick={() => setIsEditing(true)} className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded p-1" title={t('mealTime')}>
                    {meal.time}
                </span>
            )}
        </div>
    );
});

export default MealTimeEditor;