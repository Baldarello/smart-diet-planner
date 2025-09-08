import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';
import { WaterDropIcon } from './Icons';

const HydrationTracker: React.FC = observer(() => {
    const { hydrationGoalLiters, setHydrationGoal } = mealPlanStore;

    const handleGoalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        if (!isNaN(value)) {
            setHydrationGoal(value);
        }
    };

    return (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-center justify-between">
            <div className="flex items-center">
                <WaterDropIcon />
                <div className="ml-3">
                    <h4 className="font-semibold text-blue-800 dark:text-blue-300">{t('hydrationTrackerTitle')}</h4>
                    <p className="text-sm text-blue-600 dark:text-blue-400">{t('hydrationGoal')}</p>
                </div>
            </div>
            <div className="flex items-center">
                <input
                    type="number"
                    value={hydrationGoalLiters}
                    onChange={handleGoalChange}
                    step="0.1"
                    min="0"
                    max="10"
                    className="w-20 text-right font-bold text-lg bg-transparent border-b-2 border-blue-200 dark:border-blue-700 focus:border-blue-500 dark:focus:border-blue-400 outline-none text-blue-700 dark:text-blue-200"
                    aria-label={t('hydrationGoal')}
                />
                <span className="ml-2 font-semibold text-blue-700 dark:text-blue-200">{t('hydrationUnit')}</span>
            </div>
        </div>
    );
});

export default HydrationTracker;