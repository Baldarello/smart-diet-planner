import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { SendToShoppingListIcon, PlusCircleIcon } from './Icons';
import { t } from '../i18n';
import { PantryItem } from '../types';

const PantryView: React.FC = observer(() => {
    const { pantry, updatePantryItemQuantity, movePantryItemToShoppingList, hasUnsavedChanges, recalculateShoppingList, recalculating, onlineMode, shoppingList, addPantryItem } = mealPlanStore;
    
    const [showAddItemForm, setShowAddItemForm] = useState(false);
    const [newItem, setNewItem] = useState({ item: '', quantity: '', category: '' });
    const [isNewCategory, setIsNewCategory] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    const uniqueCategories = Array.from(new Set([
        ...shoppingList.map(c => c.category),
        ...pantry.map(p => p.originalCategory)
    ])).filter(Boolean).sort();
    
    const groupedPantry = pantry.reduce((acc, item) => {
        const category = item.originalCategory || t('uncategorized');
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(item);
        return acc;
    }, {} as Record<string, PantryItem[]>);

    const sortedCategories = Object.keys(groupedPantry).sort();


    const handleQuantityChange = (itemName: string, newQuantity: string) => {
        updatePantryItemQuantity(itemName, newQuantity);
    };

    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        if (value === '__NEW__') {
            setIsNewCategory(true);
            setNewItem({ ...newItem, category: '' });
        } else {
            setIsNewCategory(false);
            setNewItem({ ...newItem, category: value });
        }
    };
    
    const handleAddItem = () => {
        const category = isNewCategory ? newCategoryName.trim() : newItem.category;
        if (newItem.item.trim() && newItem.quantity.trim() && category) {
            addPantryItem(newItem.item, newItem.quantity, category);
            // Reset form
            handleCancelAddItem();
        }
    };
    
    const handleCancelAddItem = () => {
        setShowAddItemForm(false);
        setNewItem({ item: '', quantity: '', category: '' });
        setIsNewCategory(false);
        setNewCategoryName('');
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
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6 border-b dark:border-gray-700 pb-4">{t('pantryTitle')}</h2>
            {pantry.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">{t('pantryEmpty')}</p>
            ) : (
                <div className="space-y-6">
                    {sortedCategories.map((category, catIndex) => (
                        <details key={catIndex} className="group" open>
                            <summary className="font-bold text-xl text-violet-700 dark:text-violet-400 cursor-pointer list-none flex items-center">
                                <span className="transform transition-transform duration-200 group-open:rotate-90 text-violet-400 dark:text-violet-500 mr-2">&#9656;</span>
                                <span>{category}</span>
                            </summary>
                            <ul className="mt-4 pl-6 border-l-2 border-violet-100 dark:border-gray-700 space-y-3">
                                {groupedPantry[category].map((pantryItem, index) => (
                                    <li key={index} className="flex items-center justify-between group/item py-1">
                                        <span className="font-medium text-gray-800 dark:text-gray-200">{pantryItem.item}</span>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                value={pantryItem.quantity}
                                                onChange={(e) => handleQuantityChange(pantryItem.item, e.target.value)}
                                                className="text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded px-2 py-1 w-32 text-right"
                                            />
                                            <button onClick={() => movePantryItemToShoppingList(pantryItem)} className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover/item:opacity-100" title={t('moveToShoppingListTitle')}>
                                                <SendToShoppingListIcon />
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </details>
                    ))}
                </div>
            )}
             <div className="mt-8 border-t dark:border-gray-700 pt-6">
                {showAddItemForm ? (
                    <div className="space-y-4 p-4 bg-slate-50 dark:bg-gray-700/50 rounded-lg animate-slide-in-up">
                        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">{t('addItemToPantryTitle')}</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input
                                type="text"
                                placeholder={t('itemNamePlaceholder')}
                                value={newItem.item}
                                onChange={(e) => setNewItem({ ...newItem, item: e.target.value })}
                                className="p-2 rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 w-full"
                            />
                            <input
                                type="text"
                                placeholder={t('quantityPlaceholder')}
                                value={newItem.quantity}
                                onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                                className="p-2 rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 w-full"
                            />
                        </div>
                        <div>
                            <select
                                value={isNewCategory ? '__NEW__' : newItem.category}
                                onChange={handleCategoryChange}
                                className="p-2 rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 w-full"
                            >
                                <option value="" disabled hidden>{t('selectCategoryPrompt')}</option>
                                {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                <option value="__NEW__">{t('newCategoryOption')}</option>
                            </select>
                        </div>
                        {isNewCategory && (
                            <input
                                type="text"
                                placeholder={t('newCategoryPrompt')}
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="p-2 rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 w-full"
                                autoFocus
                            />
                        )}
                        <div className="flex justify-end gap-2">
                            <button onClick={handleCancelAddItem} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold px-4 py-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
                                {t('cancel')}
                            </button>
                            <button
                                onClick={handleAddItem}
                                disabled={!newItem.item.trim() || !newItem.quantity.trim() || !(isNewCategory ? newCategoryName.trim() : newItem.category)}
                                className="bg-violet-600 text-white font-semibold px-4 py-2 rounded-full hover:bg-violet-700 transition-colors disabled:bg-violet-400 disabled:cursor-not-allowed"
                            >
                                {t('save')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <button onClick={() => setShowAddItemForm(true)} className="bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-200 font-semibold px-4 py-2 rounded-full hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors shadow-sm flex items-center">
                       <PlusCircleIcon /> <span className="ml-2">{t('addItem')}</span>
                    </button>
                )}
            </div>
        </div>
    );
});

export default PantryView;