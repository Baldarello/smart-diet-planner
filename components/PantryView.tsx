import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { SendToShoppingListIcon } from './Icons';

const PantryView: React.FC = observer(() => {
    const { pantry, updatePantryItemQuantity, movePantryItemToShoppingList } = mealPlanStore;

    const handleQuantityChange = (itemName: string, newQuantity: string) => {
        updatePantryItemQuantity(itemName, newQuantity);
    };

    return (
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg transition-all duration-300 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">My Pantry</h2>
            {pantry.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Your pantry is empty. Go shopping!</p>
            ) : (
                <ul className="space-y-3">
                    {pantry.map((pantryItem, index) => (
                        <li key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                            <span className="font-medium text-gray-800">{pantryItem.item}</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={pantryItem.quantity}
                                    onChange={(e) => handleQuantityChange(pantryItem.item, e.target.value)}
                                    className="text-gray-600 bg-white border border-gray-300 rounded px-2 py-1 w-32 text-right"
                                />
                                <button onClick={() => movePantryItemToShoppingList(pantryItem)} className="text-gray-400 hover:text-red-500 transition-colors" title="Move back to Shopping List">
                                    <SendToShoppingListIcon />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
});

export default PantryView;
