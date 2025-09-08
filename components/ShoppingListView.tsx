import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { ShoppingListItem } from '../types';
import { PantryIcon } from './Icons';
import { t } from '../i18n';

const ShoppingListView: React.FC = observer(() => {
    const { shoppingList, hasUnsavedChanges, recalculateShoppingList, recalculating, onlineMode } = mealPlanStore;
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
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg transition-all duration-300 max-w-4xl mx-auto">
            {hasUnsavedChanges && onlineMode && (
                <div className="bg-yellow-100 dark:bg-yellow-900/30 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-200 p-4 rounded-md mb-6 flex justify-between items-center">
                    <div>
                        <p className="font-bold">{t('shoppingListStaleTitle')}</p>
                        <p>{t('shoppingListStaleMessage')}</p>
                    </div>
                    <button 
                        onClick={() => recalculateShoppingList()}
                        disabled={recalculating}
                        className="bg-yellow-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-yellow-600 transition-colors flex-shrink-0 disabled:bg-yellow-400 disabled:cursor-not-allowed"
                    >
                        {recalculating ? t('recalculating') : t('recalculateList')}
                    </button>
                </div>
            )}
            <div className="flex justify-between items-center border-b dark:border-gray-700 pb-4 mb-6">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">{t('shoppingListTitle')}</h2>
                {checkedItems.size > 0 && (
                    <button onClick={handleMoveToPantry} className="bg-violet-600 text-white font-semibold px-4 py-2 rounded-full hover:bg-violet-700 transition-colors shadow-md flex items-center">
                        <PantryIcon /> {t('moveToPantry')}
                    </button>
                )}
            </div>
            {shoppingList.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('shoppingListEmpty')}</p>
            ) : (
                <div className="space-y-6">
                    {shoppingList.map((category, catIndex) => (
                        <details key={catIndex} className="group" open>
                            <summary className="font-bold text-xl text-violet-700 dark:text-violet-400 cursor-pointer list-none flex items-center">
                                 <span className="transform transition-transform duration-200 group-open:rotate-90 text-violet-400 dark:text-violet-500">&#9656;</span>
                                 <span className="ml-2">{category.category}</span>
                            </summary>
                            <ul className="mt-4 pl-6 border-l-2 border-violet-100 dark:border-gray-700 space-y-3">
                                {category.items.map((item, itemIndex) => {
                                    const key = `${category.category}-${item.item}`;
                                    return (
                                        <li key={itemIndex} className="flex items-center">
                                            <input type="checkbox" id={`item-${catIndex}-${itemIndex}`} className="h-5 w-5 rounded border-gray-300 dark:border-gray-500 text-violet-600 focus:ring-violet-500 cursor-pointer bg-transparent dark:bg-gray-600" onChange={() => handleCheck(item, category.category)} checked={checkedItems.has(key)} aria-labelledby={`label-item-${catIndex}-${itemIndex}`} />
                                            <label id={`label-item-${catIndex}-${itemIndex}`} htmlFor={`item-${catIndex}-${itemIndex}`} className={`ml-3 flex-grow cursor-pointer ${checkedItems.has(key) ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                                                <span className="font-medium">{item.item}</span>: <span className="text-gray-600 dark:text-gray-400">{item.quantity}</span>
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