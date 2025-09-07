import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';

const ActivePlanNameEditor: React.FC = observer(() => {
    const { currentPlanName, setCurrentPlanName } = mealPlanStore;
    return (
        <div className="mb-8 text-center">
            <input
                type="text"
                value={currentPlanName}
                onChange={(e) => setCurrentPlanName(e.target.value)}
                className="text-2xl font-bold text-gray-700 text-center bg-transparent border-b-2 border-transparent focus:border-violet-400 outline-none transition-colors duration-300 p-1"
                aria-label="Edit diet plan name"
            />
        </div>
    );
});

export default ActivePlanNameEditor;
