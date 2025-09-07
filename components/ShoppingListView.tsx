import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { ShoppingListItem } from '../types';
import { PantryIcon } from './Icons';

const ShoppingListView: React.FC = observer(() => {
    const [checkedItems, setCheckedItems] = useState<Map<string, { item: ShoppingListItem, category: string }>>(new Map());

    const handleCheck = (item: ShoppingListItem, category: string) => {
        const key = `${category}-${item.item}`;
        const newCheckedItems = new Map(checkedItems);
        if (newCheckedItems.has(key)) {
            newCheckedItems.delete(key);
        } else {
            newCheckedItems.set(key, { item, category });
        }
        setCheckedItems(newCheckedItems);
    };

    const handleMoveToPantry = () => {
        checkedItems.forEach(({ item, category }) => {
            mealPlanStore.moveShoppingItemToPantry(item, category);
        });
        setCheckedItems(new Map());
    };

    return (
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg transition-all duration-300 max-w-4xl mx-auto">
            <div className="flex justify-between items-center border-b pb-4 mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Shopping List</h2>
                {checkedItems.size > 0 && (
                    <button onClick={handleMoveToPantry} className="bg-violet-600 text-white font-semibold px-4 py-2 rounded-full hover:bg-violet-700 transition-colors shadow-md flex items-center">
                        <PantryIcon /> Move to Pantry
                    </button>
                )}
            </div>
            {mealPlanStore.shoppingList.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Your shopping list is empty. Good job!</p>
            ) : (
                <div className="space-y-6">
                    {mealPlanStore.shoppingList.map((category, catIndex) => (
                        <details key={catIndex} className="group" open>
                            <summary className="font-bold text-xl text-violet-700 cursor-pointer list-none flex items-center">
                                 <span className="transform transition-transform duration-200 group-open:rotate-90">&#9656;</span>
                                 <span className="ml-2">{category.category}</span>
                            </summary>
                            <ul className="mt-4 pl-6 border-l-2 border-violet-100 space-y-3">
                                {category.items.map((item, itemIndex) => {
                                    const key = `${category.category}-${item.item}`;
                                    return (
                                        <li key={itemIndex} className="flex items-center">
                                            <input type="checkbox" id={`item-${catIndex}-${itemIndex}`} className="h-5 w-5 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer" onChange={() => handleCheck(item, category.category)} checked={checkedItems.has(key)} aria-labelledby={`label-item-${catIndex}-${itemIndex}`} />
                                            <label id={`label-item-${catIndex}-${itemIndex}`} htmlFor={`item-${catIndex}-${itemIndex}`} className={`ml-3 flex-grow cursor-pointer ${checkedItems.has(key) ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                                <span className="font-medium">{item.item}</span>: <span className="text-gray-600">{item.quantity}</span>
                                            </label>
                                        </li>
                                    );
                                })}
                            </ul>
                        </details>
                    ))}
                </div>
            )}
        </div>
    );
});

export default ShoppingListView;
