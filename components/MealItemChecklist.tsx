import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { MealItem } from '../types';

const EditableMealItem: React.FC<{ item: MealItem, dayIndex: number, mealIndex: number, itemIndex: number, isMasterPlanView?: boolean }> = observer(({ item, dayIndex, mealIndex, itemIndex, isMasterPlanView = false }) => {
    const [currentValue, setCurrentValue] = useState(item.fullDescription);

    useEffect(() => {
        setCurrentValue(item.fullDescription);
    }, [item.fullDescription]);

    const handleBlur = () => {
        if (isMasterPlanView && currentValue.trim() !== item.fullDescription) {
            mealPlanStore.updateItemDescription(dayIndex, mealIndex, itemIndex, currentValue.trim());
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        }
    };

    return (
        <input
            type="text"
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            readOnly={!isMasterPlanView}
            className={`w-full bg-transparent outline-none rounded-md px-1 py-0.5 transition-colors duration-200 ${item.used ? 'line-through text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'} ${!isMasterPlanView ? 'cursor-default' : 'focus:bg-white dark:focus:bg-gray-700/50'}`}
        />
    );
});

const MealItemChecklist: React.FC<{items: MealItem[], dayIndex?: number, mealIndex: number, mealIsDone: boolean, isMasterPlanView?: boolean}> = observer(({items, dayIndex, mealIndex, mealIsDone, isMasterPlanView = false}) => {
    return (
        <ul className="text-gray-600 dark:text-gray-400 text-sm mt-2 space-y-2">
            {items.map((item, itemIndex) => (
                 <li key={itemIndex} className="flex items-center">
                    {!isMasterPlanView && (
                        <input
                            type="checkbox"
                            id={`mealitem-${mealIndex}-${itemIndex}`}
                            className="h-4 w-4 rounded border-gray-300 dark:border-gray-500 text-violet-600 focus:ring-violet-500 cursor-pointer bg-transparent dark:bg-gray-600 flex-shrink-0"
                            checked={item.used}
                            onChange={() => mealPlanStore.toggleMealItem(mealIndex, itemIndex)}
                            aria-label={item.fullDescription}
                        />
                    )}
                    <EditableMealItem item={item} dayIndex={dayIndex!} mealIndex={mealIndex} itemIndex={itemIndex} isMasterPlanView={isMasterPlanView} />
                </li>
            ))}
        </ul>
    )
});

export default MealItemChecklist;