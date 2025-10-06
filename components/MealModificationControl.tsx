import React from 'react';
import { observer } from 'mobx-react-lite';
import { toJS } from 'mobx';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';
import { ResetToPresetIcon } from './Icons';

interface MealModificationControlProps {
    dayIndex: number;
    mealIndex: number;
    onResetClick: () => void;
    showText?: boolean;
    className?: string;
}

const MealModificationControl: React.FC<MealModificationControlProps> = observer(({ dayIndex, mealIndex, onResetClick, showText = false, className }) => {
    const { masterMealPlan, presetMealPlan } = mealPlanStore;

    const activeMeal = masterMealPlan[dayIndex]?.meals[mealIndex];
    const presetMeal = presetMealPlan[dayIndex]?.meals[mealIndex];

    let isModified = false;
    if (activeMeal && presetMeal) {
        try {
            // Compare stringified versions of plain JS objects to detect deep changes
            isModified = JSON.stringify(toJS(activeMeal)) !== JSON.stringify(toJS(presetMeal));
        } catch (e) {
            console.error("Could not compare meal objects:", e);
        }
    }
    
    if (!isModified) {
        return null;
    }

    const defaultClassName = "p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors";

    return (
        <button
            onClick={onResetClick}
            title={t('resetMealToPresetTitle')}
            className={className || defaultClassName}
            aria-label={t('resetMealToPresetTitle')}
        >
            <ResetToPresetIcon />
            {showText && <span className="ml-2">{t('resetMealToPresetTitle')}</span>}
        </button>
    );
});

export default MealModificationControl;