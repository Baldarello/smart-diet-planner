import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';
import { WaterDropIcon } from './Icons';

const Snackbar: React.FC = observer(() => {
    const { hydrationSnackbar, logWaterIntake, dismissHydrationSnackbar } = mealPlanStore;

    if (!hydrationSnackbar || !hydrationSnackbar.visible) {
        return null;
    }

    const handleDone = () => {
        logWaterIntake(hydrationSnackbar.amount);
        dismissHydrationSnackbar();
    };

    return (
        <div 
            className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:w-11/12 max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 flex items-center justify-between z-50 animate-slide-in-up border dark:border-gray-700"
            role="alert"
            aria-live="assertive"
        >
            <div className="flex items-center">
                <div className="text-blue-500">
                    <WaterDropIcon />
                </div>
                <p className="ml-3 font-medium text-gray-700 dark:text-gray-200">
                    {t('snackbarReminder', { time: hydrationSnackbar.time, amount: hydrationSnackbar.amount.toString() })}
                </p>
            </div>
            <button
                onClick={handleDone}
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg transition-colors flex-shrink-0"
            >
                {t('snackbarDone')}
            </button>
        </div>
    );
});

export default Snackbar;