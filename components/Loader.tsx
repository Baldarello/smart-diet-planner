import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore, AppStatus } from '../stores/MealPlanStore';
import { t } from '../i18n';

const Loader: React.FC = observer(() => {
    const { status } = mealPlanStore;

    let title = t('loadingPlanTitle');
    let message = t('loadingPlanMessage');
    
    if (status === AppStatus.SYNCING) {
        title = t('syncingTitle');
        message = t('syncingMessage');
    } else if (status === AppStatus.IMPORTING) {
        title = t('importingPlanTitle');
        message = t('importingPlanMessage');
    }

    return (
        <div className="flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-violet-600 dark:border-violet-500 mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">{title}</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4 h-10 flex items-center justify-center">{message}</p>
        </div>
    );
});

export default Loader;