import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { MealItem } from '../types';

const EditableMealItem: React.FC<{ item: MealItem, dayIndex: number, mealIndex: number, itemIndex: number, mealIsDone: boolean, isArchiveView?: boolean }> = ({ item, dayIndex, mealIndex, itemIndex, mealIsDone, isArchiveView = false }) => {
    const [currentValue, setCurrentValue] = useState(item.fullDescription);

    useEffect(() => {
        setCurrentValue(item.fullDescription);
    }, [item.fullDescription]);

    const handleBlur = () => {
        if (currentValue.trim() !== item.fullDescription) {
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
            readOnly={isArchiveView}
            className={`ml-2 w-full bg-transparent outline-none rounded-md px-1 py-0.5 transition-colors duration-200 ${(item.used || mealIsDone) ? 'line-through text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'} ${isArchiveView ? 'cursor-default' : 'focus:bg-white dark:focus:bg-gray-700/50'}`}
        />
    );
};

const MealItemChecklist: React.FC<{items: MealItem[], dayIndex: number, mealIndex: number, mealIsDone: boolean, isArchiveView?: boolean}> = observer(({items, dayIndex, mealIndex, mealIsDone, isArchiveView = false}) => {
    return (
        <ul className="text-gray-600 dark:text-gray-400 text-sm mt-2 space-y-2">
            {items.map((item, itemIndex) => (
                 <li key={itemIndex} className="flex items-center">
                    <input
                        type="checkbox"
                        id={`mealitem-${dayIndex}-${mealIndex}-${itemIndex}`}
                        className="h-4 w-4 rounded border-gray-300 dark:border-gray-500 text-violet-600 focus:ring-violet-500 cursor-pointer bg-transparent dark:bg-gray-600 flex-shrink-0"
                        checked={item.used}
                        onChange={() => !isArchiveView && mealPlanStore.toggleMealItem(dayIndex, mealIndex, itemIndex)}
                        disabled={isArchiveView}
                        aria-label={item.fullDescription}
                    />
                    <EditableMealItem item={item} dayIndex={dayIndex} mealIndex={mealIndex} itemIndex={itemIndex} mealIsDone={mealIsDone} isArchiveView={isArchiveView} />
                </li>
            ))}
        </ul>
    )
});

export default MealItemChecklist;