import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { MealItem } from '../types';

const MealItemChecklist: React.FC<{items: MealItem[], dayIndex: number, mealIndex: number}> = observer(({items, dayIndex, mealIndex}) => {
    return (
        <ul className="list-disc list-inside text-gray-600 text-sm mt-2 space-y-2">
            {items.map((item, itemIndex) => (
                 <li key={itemIndex} className="flex items-center">
                    <input
                        type="checkbox"
                        id={`mealitem-${dayIndex}-${mealIndex}-${itemIndex}`}
                        className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                        checked={item.used}
                        onChange={() => mealPlanStore.toggleMealItem(dayIndex, mealIndex, itemIndex)}
                    />
                    <label htmlFor={`mealitem-${dayIndex}-${mealIndex}-${itemIndex}`} className={`ml-2 cursor-pointer ${item.used ? 'line-through text-gray-400' : ''}`}>
                       {item.fullDescription}
                    </label>
                </li>
            ))}
        </ul>
    )
});

export default MealItemChecklist;
