import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { SendToShoppingListIcon } from './Icons';
import { t } from '../i18n';

const PantryView: React.FC = observer(() => {
    const { pantry, updatePantryItemQuantity, movePantryItemToShoppingList } = mealPlanStore;

    const handleQuantityChange = (itemName: string, newQuantity: string) => {
        updatePantryItemQuantity(itemName, newQuantity);
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg transition-all duration-300 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6 border-b dark:border-gray-700 pb-4">{t('pantryTitle')}</h2>
            {pantry.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('pantryEmpty')}</p>
            ) : (
                <ul className="space-y-3">
                    {pantry.map((pantryItem, index) => (
                        <li key={index} className="flex items-center justify-between bg-slate-50 dark:bg-gray-700/50 p-3 rounded-lg">
                            <span className="font-medium text-gray-800 dark:text-gray-200">{pantryItem.item}</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={pantryItem.quantity}
                                    onChange={(e) => handleQuantityChange(pantryItem.item, e.target.value)}
                                    className="text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded px-2 py-1 w-32 text-right"
                                />
                                <button onClick={() => movePantryItemToShoppingList(pantryItem)} className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors" title={t('moveToShoppingListTitle')}>
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