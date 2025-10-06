import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { ShoppingListItem, ShoppingListCategory } from '../types';
import { PantryIcon, EditIcon, TrashIcon, CheckIcon, CloseIcon, PlusCircleIcon, TodayIcon } from './Icons';
import { t } from '../i18n';

const ShoppingListView: React.FC = observer(() => {
    const store = mealPlanStore;
    const { shoppingList, hasUnsavedChanges, recalculateShoppingList, recalculating, onlineMode, shoppingListManaged } = store;
    const [checkedItems, setCheckedItems] = useState<Map<string, { item: ShoppingListItem, category: string }>>(new Map());

    const [editingItem, setEditingItem] = useState<{ catIndex: number, itemIndex: number, item: string, quantity: string } | null>(null);
    const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
    const [newItem, setNewItem] = useState({ item: '', quantity: '' });
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);

    const totalItemsCount = shoppingList.reduce((acc, cat) => acc + cat.items.length, 0);

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
    
    const handleSelectAllToggle = () => {
        const newCheckedItems = new Map<string, { item: ShoppingListItem, category: string }>();
        if (checkedItems.size < totalItemsCount) {
            shoppingList.forEach(category => {
                category.items.forEach(item => {
                    const key = `${category.category}-${item.item}`;
                    newCheckedItems.set(key, { item, category: category.category });
                });
            });
        }
        setCheckedItems(newCheckedItems);
    };

    const handleCategoryToggle = (category: ShoppingListCategory) => {
        const newCheckedItems = new Map(checkedItems);
        const categoryItemsKeys = category.items.map(item => `${category.category}-${item.item}`);
        const allInCategoryChecked = categoryItemsKeys.every(key => newCheckedItems.has(key));

        if (allInCategoryChecked) {
            categoryItemsKeys.forEach(key => newCheckedItems.delete(key));
        } else {
            category.items.forEach(item => {
                const key = `${category.category}-${item.item}`;
                newCheckedItems.set(key, { item, category: category.category });
            });
        }
        setCheckedItems(newCheckedItems);
    };

    const handleMoveToPantry = () => {
        checkedItems.forEach(({ item, category }) => {
            store.moveShoppingItemToPantry(item, category);
        });
        setCheckedItems(new Map());
    };

    const handleStartEdit = (catIndex: number, itemIndex: number, item: ShoppingListItem) => {
        setEditingItem({ catIndex, itemIndex, ...item });
    };

    const handleCancelEdit = () => {
        setEditingItem(null);
    };

    const handleSaveEdit = () => {
        if (editingItem) {
            const category = shoppingList[editingItem.catIndex];
            store.updateShoppingListItem(category.category, editingItem.itemIndex, { item: editingItem.item, quantity: editingItem.quantity });
            setEditingItem(null);
        }
    };

    const handleAddItem = (categoryName: string) => {
        if (newItem.item.trim() && newItem.quantity.trim()) {
            store.addShoppingListItem(categoryName, newItem);
            setNewItem({ item: '', quantity: '' });
            setAddingToCategory(null);
        }
    };

    const handleAddCategory = () => {
        if (newCategoryName.trim()) {
            store.addShoppingListCategory(newCategoryName);
            setNewCategoryName('');
            setShowNewCategoryInput(false);
        }
    };
    
    return (
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg transition-all duration-300 max-w-4xl mx-auto">
            {!shoppingListManaged && (
                 <div className="bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 text-blue-800 dark:text-blue-200 p-4 rounded-md mb-6">
                    <p className="font-bold">{t('shoppingListSetupTitle')}</p>
                    <p>{t('shoppingListSetupMessage')}</p>
                </div>
            )}
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
            {shoppingList.length > 0 && (
                <div className="mb-4 flex items-center p-2 bg-slate-50 dark:bg-gray-700/50 rounded-lg">
                    <input
                        type="checkbox"
                        id="select-all"
                        className="h-5 w-5 rounded border-gray-300 dark:border-gray-500 text-violet-600 focus:ring-violet-500 cursor-pointer"
                        onChange={handleSelectAllToggle}
                        checked={totalItemsCount > 0 && checkedItems.size === totalItemsCount}
                        ref={el => {
                            if (el) {
                                el.indeterminate = checkedItems.size > 0 && checkedItems.size < totalItemsCount;
                            }
                        }}
                    />
                    <label htmlFor="select-all" className="ml-3 font-semibold text-gray-700 dark:text-gray-300 cursor-pointer">
                        {t('selectAll')}
                    </label>
                </div>
            )}
            {shoppingList.length === 0 ? (
                <div className="text-center py-8">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full mx-auto flex items-center justify-center mb-4">
                        <CheckIcon />
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">{t('shoppingListEmptyTitle')}</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2 mb-6">{t('shoppingListEmptyMessage')}</p>
                    <button 
                        onClick={() => store.setActiveTab('daily')}
                        className="bg-violet-600 text-white font-semibold px-6 py-3 rounded-full hover:bg-violet-700 transition-colors shadow-md flex items-center mx-auto"
                    >
                        <TodayIcon />
                        <span className="ml-2">{t('shoppingListEmptyButton')}</span>
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {shoppingList.map((category, catIndex) => {
                        const categoryItemsKeys = category.items.map(item => `${category.category}-${item.item}`);
                        const checkedInCategoryCount = categoryItemsKeys.filter(key => checkedItems.has(key)).length;
                        const isCategoryChecked = category.items.length > 0 && checkedInCategoryCount === category.items.length;
                        const isCategoryIndeterminate = checkedInCategoryCount > 0 && checkedInCategoryCount < category.items.length;

                        return (
                        <details key={catIndex} className="group" open>
                            <summary className="font-bold text-xl text-violet-700 dark:text-violet-400 cursor-pointer list-none flex items-center">
                                 <input
                                    type="checkbox"
                                    className="h-5 w-5 rounded border-gray-300 dark:border-gray-500 text-violet-600 focus:ring-violet-500 cursor-pointer"
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={() => handleCategoryToggle(category)}
                                    checked={isCategoryChecked}
                                    ref={el => { if (el) { el.indeterminate = isCategoryIndeterminate; } }}
                                    aria-label={`Select all items in ${category.category}`}
                                 />
                                 <span className="transform transition-transform duration-200 group-open:rotate-90 text-violet-400 dark:text-violet-500 ml-2">&#9656;</span>
                                 <span className="ml-2">{category.category}</span>
                            </summary>
                            <ul className="mt-4 pl-6 border-l-2 border-violet-100 dark:border-gray-700 space-y-3">
                                {category.items.map((item, itemIndex) => {
                                    const key = `${category.category}-${item.item}`;
                                    const isEditing = editingItem?.catIndex === catIndex && editingItem?.itemIndex === itemIndex;
                                    return (
                                        <li key={itemIndex} className="flex items-center group/item">
                                            <input type="checkbox" id={`item-${catIndex}-${itemIndex}`} className="h-5 w-5 rounded border-gray-300 dark:border-gray-500 text-violet-600 focus:ring-violet-500 cursor-pointer bg-transparent dark:bg-gray-600 flex-shrink-0" onChange={() => handleCheck(item, category.category)} checked={checkedItems.has(key)} aria-labelledby={`label-item-${catIndex}-${itemIndex}`} />
                                            {isEditing ? (
                                                <div className="ml-3 flex-grow flex items-center gap-2">
                                                    <input type="text" value={editingItem.item} onChange={(e) => setEditingItem({...editingItem, item: e.target.value})} className="p-1 rounded bg-white dark:bg-gray-700 border border-violet-300 dark:border-violet-500 w-full" />
                                                    <input type="text" value={editingItem.quantity} onChange={(e) => setEditingItem({...editingItem, quantity: e.target.value})} className="p-1 rounded bg-white dark:bg-gray-700 border border-violet-300 dark:border-violet-500 w-32" />
                                                    <button onClick={handleSaveEdit} className="p-1 text-green-500 hover:bg-green-100 dark:hover:bg-gray-600 rounded-full"><CheckIcon /></button>
                                                    <button onClick={handleCancelEdit} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-gray-600 rounded-full"><CloseIcon /></button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div id={`label-item-${catIndex}-${itemIndex}`} className={`ml-3 flex-grow cursor-pointer ${checkedItems.has(key) ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                                                        <span className="font-medium">{item.item}</span>: <span className="text-gray-600 dark:text-gray-400">{item.quantity}</span>
                                                    </div>
                                                    <div className="flex items-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                        <button onClick={() => handleStartEdit(catIndex, itemIndex, item)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full" title={t('editItemTitle')}><EditIcon /></button>
                                                        <button onClick={() => store.deleteShoppingListItem(category.category, itemIndex)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full" title={t('deleteItemTitle')}><TrashIcon /></button>
                                                    </div>
                                                </>
                                            )}
                                        </li>
                                    );
                                })}
                                {addingToCategory === category.category ? (
                                    <li className="flex items-center gap-2">
                                        <div className="flex-grow flex items-center gap-2">
                                            <input type="text" placeholder={t('ingredientPlaceholder')} value={newItem.item} onChange={(e) => setNewItem({...newItem, item: e.target.value})} className="p-1 rounded bg-white dark:bg-gray-700 border border-violet-300 dark:border-violet-500 w-full" />
                                            <input type="text" placeholder={t('quantityPlaceholder')} value={newItem.quantity} onChange={(e) => setNewItem({...newItem, quantity: e.target.value})} className="p-1 rounded bg-white dark:bg-gray-700 border border-violet-300 dark:border-violet-500 w-32" />
                                            <button onClick={() => handleAddItem(category.category)} className="p-1 text-green-500 hover:bg-green-100 dark:hover:bg-gray-600 rounded-full"><CheckIcon /></button>
                                            <button onClick={() => setAddingToCategory(null)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-gray-600 rounded-full"><CloseIcon /></button>
                                        </div>
                                    </li>
                                ) : (
                                    <li>
                                        <button onClick={() => setAddingToCategory(category.category)} className="mt-2 flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300">
                                            <PlusCircleIcon /> {t('addItem')}
                                        </button>
                                    </li>
                                )}
                            </ul>
                        </details>
                        );
                    })}
                </div>
            )}
             <div className="mt-8 border-t dark:border-gray-700 pt-6">
                {showNewCategoryInput ? (
                    <div className="flex items-center gap-2">
                        <input type="text" placeholder={t('newCategoryPrompt')} value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="p-2 rounded bg-white dark:bg-gray-700 border border-violet-300 dark:border-violet-500 flex-grow" autoFocus />
                        <button onClick={handleAddCategory} className="p-1.5 text-green-500 hover:bg-green-100 dark:hover:bg-gray-600 rounded-full"><CheckIcon /></button>
                        <button onClick={() => setShowNewCategoryInput(false)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-gray-600 rounded-full"><CloseIcon /></button>
                    </div>
                ) : (
                    <button onClick={() => setShowNewCategoryInput(true)} className="bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-200 font-semibold px-4 py-2 rounded-full hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors shadow-sm flex items-center">
                       <PlusCircleIcon /> <span className="ml-2">{t('addCategory')}</span>
                    </button>
                )}
            </div>
        </div>
    );
});

export default ShoppingListView;