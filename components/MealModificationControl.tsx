import React, { useState, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';
import { ResetToPresetIcon } from './Icons';
import ConfirmationModal from './ConfirmationModal';

interface MealModificationControlProps {
    dayIndex: number;
    mealIndex: number;
}

const MealModificationControl: React.FC<MealModificationControlProps> = observer(({ dayIndex, mealIndex }) => {
    const { activeMealPlan, presetMealPlan, resetMealToPreset } = mealPlanStore;
    const [isModalOpen, setIsModalOpen] = useState(false);

    const isModified = useMemo(() => {
        const activeMeal = activeMealPlan[dayIndex]?.meals[mealIndex];
        const presetMeal = presetMealPlan[dayIndex]?.meals[mealIndex];
        if (!activeMeal || !presetMeal) return false;
        
        try {
            return JSON.stringify(activeMeal) !== JSON.stringify(presetMeal);
        } catch (e) {
            console.error("Could not compare meal objects:", e);
            return false;
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeMealPlan[dayIndex]?.meals[mealIndex], presetMealPlan[dayIndex]?.meals[mealIndex], dayIndex, mealIndex]);

    if (!isModified) {
        return null;
    }

    return (
        <>
            <button
                onClick={() => setIsModalOpen(true)}
                title={t('resetMealToPresetTitle')}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 hover:text-yellow-600 dark:hover:text-yellow-400 transition-colors"
                aria-label={t('resetMealToPresetTitle')}
            >
                <ResetToPresetIcon />
            </button>
            <ConfirmationModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onConfirm={() => resetMealToPreset(dayIndex, mealIndex)}
                title={t('resetMealModalTitle')}
            >
                <p>{t('resetMealModalContent')}</p>
            </ConfirmationModal>
        </>
    );
});

export default MealModificationControl;
