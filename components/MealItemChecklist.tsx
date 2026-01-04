
import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { MealItem } from '../types';
import { splitQuantityAndName } from '../utils/quantityParser';

const EditableMealItem: React.FC<{
    item: MealItem,
    dayIndex: number,
    mealIndex: number,
    itemIndex: number,
    isEditable: boolean
}> = observer(({ item, dayIndex, mealIndex, itemIndex, isEditable }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [currentValue, setCurrentValue] = useState(item.fullDescription);

    useEffect(() => {
        setCurrentValue(item.fullDescription);
    }, [item.fullDescription]);

    const handleBlur = () => {
        // Fix: correctly call updateItemDescription from store
        if (isEditable && currentValue.trim() !== item.fullDescription) {
            mealPlanStore.updateItemDescription(dayIndex, mealIndex, itemIndex, currentValue.trim());
        }
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        } else if (e.key === 'Escape') {
            setCurrentValue(item.fullDescription);
            setIsEditing(false);
        }
    };

    const startEditing = () => {
        if (isEditable) {
            setIsEditing(true);
        }
    };
    
    if (isEditable && isEditing) {
        return (
            <input
                type="text"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                autoFocus
                className={`w-full bg-white dark:bg-gray-700/50 outline-none rounded-md px-1 py-0.5 transition-colors duration-200 ${item.used ? 'line-through text-gray-400 dark:text-gray-500' : 'dark:text-gray-300'}`}
            />
        );
    }
    
    const { quantity, name } = splitQuantityAndName(item.fullDescription);

    return (
        <div 
            onClick={startEditing} 
            className={`w-full px-1 py-0.5 rounded-md ${isEditable ? 'cursor-text hover:bg-slate-100 dark:hover:bg-gray-700/50' : 'cursor-default'} ${item.used ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-600 dark:text-gray-300'}`}
        >
            {quantity && (
                <span className="font-bold text-violet-600 dark:text-violet-400 mr-1.5">{quantity}</span>
            )}
            <span>{name}</span>
        </div>
    );
});

const MealItemChecklist: React.FC<{
    items: MealItem[],
    dayIndex?: number,
    mealIndex: number,
    mealIsDone: boolean,
    isEditable?: boolean,
    showCheckbox?: boolean
}> = observer(({ items, dayIndex, mealIndex, mealIsDone, isEditable = false, showCheckbox = false }) => {
    return (
        <ul className="text-gray-600 dark:text-gray-400 text-sm mt-2 space-y-2">
            {items.map((item, itemIndex) => (
                <li key={itemIndex} className="flex items-center gap-3">
                    {showCheckbox && (
                        <input
                            type="checkbox"
                            id={`mealitem-${mealIndex}-${itemIndex}`}
                            className="h-4 w-4 rounded border-gray-300 dark:border-gray-500 text-violet-600 focus:ring-violet-500 cursor-pointer bg-transparent dark:bg-gray-600 flex-shrink-0"
                            checked={item.used}
                            onChange={() => mealPlanStore.toggleMealItem(mealIndex, itemIndex)}
                            aria-label={item.fullDescription}
                        />
                    )}
                    <EditableMealItem 
                        item={item} 
                        dayIndex={dayIndex!} 
                        mealIndex={mealIndex} 
                        itemIndex={itemIndex} 
                        isEditable={isEditable} 
                    />
                </li>
            ))}
        </ul>
    )
});

export default MealItemChecklist;
