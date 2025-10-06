import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';

const ActivePlanNameEditor: React.FC = observer(() => {
    const { currentPlanName, setCurrentPlanName } = mealPlanStore;
    return (
        <div className="mb-8 text-center hidden sm:block">
            <input
                type="text"
                value={currentPlanName}
                onChange={(e) => setCurrentPlanName(e.target.value)}
                className="text-2xl font-bold text-gray-700 dark:text-gray-200 text-center bg-transparent border-b-2 border-transparent focus:border-violet-400 dark:focus:border-violet-500 outline-none transition-colors duration-300 p-1"
                aria-label={t('editPlanNameLabel')}
            />
        </div>
    );
});

export default ActivePlanNameEditor;