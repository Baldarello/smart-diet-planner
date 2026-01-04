
import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';
import { WaterDropIcon } from './Icons';

const Snackbar: React.FC = observer(() => {
    // Fix: correctly call methods from store
    const { hydrationSnackbar, logWaterIntake, dismissHydrationSnackbar } = mealPlanStore;

    if (!hydrationSnackbar || !hydrationSnackbar.visible) {
        return null;
    }

    const handleDone = () => {
        // Fix: correctly calling logWaterIntake and dismissHydrationSnackbar from store
        logWaterIntake(hydrationSnackbar.amount);
        dismissHydrationSnackbar();
    };

    return (
        <div 
            className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 flex flex-col sm:flex-row items-center justify-between w-full animate-slide-in-up border dark:border-gray-700"
            role="alert"
            aria-live="assertive"
        >
            <div className="flex items-center mb-3 sm:mb-0 text-center sm:text-left">
                <div className="text-blue-500 flex-shrink-0">
                    <WaterDropIcon />
                </div>
                <p className="ml-3 font-medium text-gray-700 dark:text-gray-200">
                    {t('snackbarReminder', { amount: hydrationSnackbar.amount.toString() })}
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
