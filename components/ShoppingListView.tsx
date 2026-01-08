
import React, { useState, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { ShoppingListItem, ShoppingListCategory } from '../types';
import { PantryIcon, EditIcon, CheckIcon, CloseIcon, PlusCircleIcon, DashboardIcon, ShareIcon, ArrowUpIcon, ArrowDownIcon } from './Icons';
import { t } from '../i18n';
import UnitPicker from './UnitPicker';
import { formatQuantity } from '../utils/quantityParser';
import ItemEditModal from './ItemEditModal';

const ShoppingListView: React.FC = observer(() => {
    const store = mealPlanStore;
    const { shoppingList, shoppingListManaged } = store;
    
    const [checkedItems, setCheckedItems] = useState<Map<string, { item: ShoppingListItem, category: string }>>(new Map());
    const [editingItem, setEditingItem] = useState<{ category: string, itemIndex: number, item: ShoppingListItem } | null>(null);
    const [addingToCategory, setAddingToCategory] = useState<string | null>(null);
    const [newItem, setNewItem] = useState({ item: '', quantityValue: '', quantityUnit: 'g' });
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
    const [isShoppingMode, setIsShoppingMode] = useState(false);
    const [showCopiedMessage, setShowCopiedMessage] = useState(false);

    // Calcoliamo tutti gli articoli per determinare se la lista è realmente vuota
    const allItems = useMemo(() => shoppingList.flatMap(cat => cat.items.map(item => ({ item, category: cat.category }))), [shoppingList]);
    const allItemsCount = allItems.length;
    const isAllChecked = allItemsCount > 0 && checkedItems.size === allItemsCount;
    const isIndeterminate = !isAllChecked && checkedItems.size > 0;

    const handleSelectAll = () => {
        const newCheckedItems = new Map<string, { item: ShoppingListItem, category: string }>();
        if (!isAllChecked) {
            allItems.forEach(({ item, category }) => {
                const key = `${category}-${item.item}`;
                newCheckedItems.set(key, { item, category });
            });
        }
        setCheckedItems(newCheckedItems);
    };


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
            store.moveShoppingItemToPantry(item, category);
        });
        setCheckedItems(new Map());
    };

    const handleSaveEdit = (quantityValue: number | null, quantityUnit: string) => {
        if (editingItem) {
            store.updateShoppingListItem(editingItem.category, editingItem.itemIndex, { 
                ...editingItem.item,
                quantityValue,
                quantityUnit
            });
            setEditingItem(null);
        }
    };

    const handleAddItem = (categoryName: string) => {
        if (newItem.item.trim()) {
            store.addShoppingListItem(categoryName, {
                item: newItem.item,
                quantityValue: parseFloat(newItem.quantityValue) || null,
                quantityUnit: newItem.quantityUnit
            });
            setNewItem({ item: '', quantityValue: '', quantityUnit: 'g' });
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
    
    const handleShare = async () => {
        const listText = store.shoppingList.map(cat => {
            const itemsText = cat.items.map(item => `- ${item.item} (${formatQuantity(item.quantityValue, item.quantityUnit)})`).join('\n');
            return `${cat.category}:\n${itemsText}`;
        }).join('\n\n');

        const shareData = {
            title: t('listShareTitle', { planName: store.currentPlanName }),
            text: listText,
        };

        if (navigator.share) {
            try {
                await navigator.share(shareData);
            } catch (error) {
                console.error('Error sharing:', error);
            }
        } else {
            try {
                await navigator.clipboard.writeText(listText);
                setShowCopiedMessage(true);
                setTimeout(() => setShowCopiedMessage(false), 2000);
            } catch (error) {
                console.error('Error copying to clipboard:', error);
            }
        }
    };
    
    const renderCategoryList = (categories: ShoppingListCategory[], isCompletedList = false) => (
        <div className="space-y-6">
            {categories.map((category) => {
                if (category.items.length === 0) return null;

                return (
                    <details key={category.category} className="group" open={!isCompletedList}>
                        <summary className="font-bold text-xl text-violet-700 dark:text-violet-400 cursor-pointer list-none flex items-center justify-between group/summary">
                            <div className="flex items-center">
                                <span className="transform transition-transform duration-200 group-open:rotate-90 text-violet-400 dark:text-violet-500 mr-2">&#9656;</span>
                                <span>{category.category}</span>
                            </div>
                            {!isShoppingMode && !isCompletedList && (
                                <div className="opacity-0 group-hover/summary:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.preventDefault(); store.updateShoppingListCategoryOrder(category.category, 'up'); }} title={t('reorderCategoryUp')} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700"><ArrowUpIcon /></button>
                                    <button onClick={(e) => { e.preventDefault(); store.updateShoppingListCategoryOrder(category.category, 'down'); }} title={t('reorderCategoryDown')} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700"><ArrowDownIcon /></button>
                                </div>
                            )}
                        </summary>
                        <ul className="mt-4 pl-6 border-l-2 border-violet-100 dark:border-gray-700 space-y-3">
                            {category.items.map((item, itemIndex) => {
                                const key = `${category.category}-${item.item}`;
                                return (
                                    <li key={itemIndex} className="flex items-center group/item shopping-list-item-container">
                                        <input type="checkbox" id={`item-${category.category}-${itemIndex}`} className="shopping-list-item-checkbox h-5 w-5 rounded border-gray-300 dark:border-gray-500 text-violet-600 focus:ring-violet-500 cursor-pointer bg-transparent dark:bg-gray-600 flex-shrink-0" onChange={() => handleCheck(item, category.category)} checked={checkedItems.has(key)} aria-labelledby={`label-item-${category.category}-${itemIndex}`} />
                                        <div id={`label-item-${category.category}-${itemIndex}`} className={`shopping-list-item-label ml-3 flex-grow cursor-pointer ${checkedItems.has(key) ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-300'}`}>
                                            <span className="font-medium">{item.item}</span>: <span className="text-gray-600 dark:text-gray-400">{formatQuantity(item.quantityValue, item.quantityUnit)}</span>
                                        </div>
                                        {!isShoppingMode && (
                                            <div className="flex items-center opacity-0 group-hover/item:opacity-100 transition-opacity">
                                                <button onClick={() => setEditingItem({ category: category.category, itemIndex, item })} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full" title={t('editItemTitle')}><EditIcon /></button>
                                            </div>
                                        )}
                                    </li>
                                );
                            })}
                            {!isShoppingMode && addingToCategory === category.category && (
                                <li className="flex items-center gap-2">
                                    <div className="flex-grow flex items-center gap-2">
                                        <input type="text" placeholder={t('ingredientPlaceholder')} value={newItem.item} onChange={(e) => setNewItem({...newItem, item: e.target.value})} className="p-1 rounded bg-white dark:bg-gray-700 border border-violet-300 dark:border-violet-500 w-full" />
                                        <input type="number" placeholder={t('quantityPlaceholder')} value={newItem.quantityValue} onChange={(e) => setNewItem({...newItem, quantityValue: e.target.value})} className="p-1 rounded bg-white dark:bg-gray-700 border border-violet-300 dark:border-violet-500 w-20" />
                                        <UnitPicker value={newItem.quantityUnit} onChange={(unit) => setNewItem({...newItem, quantityUnit: unit})} />
                                        <button onClick={() => handleAddItem(category.category)} className="p-1 text-green-500 hover:bg-green-100 dark:hover:bg-gray-600 rounded-full"><CheckIcon /></button>
                                        <button onClick={() => setAddingToCategory(null)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-gray-600 rounded-full"><CloseIcon /></button>
                                    </div>
                                </li>
                            )}
                            {!isShoppingMode && !isCompletedList && (
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
    );
    
    // In shopping mode, separate checked and unchecked items. In normal mode, show all.
    const uncheckedCategories = isShoppingMode ? shoppingList.map(cat => ({ ...cat, items: cat.items.filter(item => !checkedItems.has(`${cat.category}-${item.item}`)) })) : [];
    const checkedCategories = isShoppingMode ? shoppingList.map(cat => ({ ...cat, items: cat.items.filter(item => checkedItems.has(`${cat.category}-${item.item}`)) })) : [];
    const hasCheckedItems = isShoppingMode && checkedCategories.some(cat => cat.items.length > 0);

    const categoriesToRender = isShoppingMode ? uncheckedCategories : shoppingList;

    return (
        <div className={`bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg transition-all duration-300 max-w-4xl mx-auto ${isShoppingMode ? 'shopping-mode' : ''}`}>
            {!shoppingListManaged && (
                 <div className="bg-blue-100 dark:bg-blue-900/30 border-l-4 border-blue-500 text-blue-800 dark:text-blue-200 p-4 rounded-md mb-6">
                    <p className="font-bold">{t('shoppingListSetupTitle')}</p>
                    <p>{t('shoppingListSetupMessage')}</p>
                </div>
            )}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b dark:border-gray-700 pb-4 mb-6 gap-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200">{t('shoppingListTitle')}</h2>
                    {allItemsCount > 0 && !isShoppingMode && (
                        <div className="flex items-center pt-2">
                            <input
                                type="checkbox"
                                id="select-all-items"
                                className="h-5 w-5 rounded border-gray-300 dark:border-gray-500 text-violet-600 focus:ring-violet-500 cursor-pointer bg-transparent dark:bg-gray-600"
                                checked={isAllChecked}
                                ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                                onChange={handleSelectAll}
                            />
                            <label htmlFor="select-all-items" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">{t('selectAll')}</label>
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center">
                    {showCopiedMessage && <span className="text-sm text-green-600 dark:text-green-400 animate-pulse">{t('listCopied')}</span>}
                    <button onClick={handleShare} title={t('shareList')} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-gray-700"><ShareIcon /></button>
                    {checkedItems.size > 0 && (<button onClick={handleMoveToPantry} className="bg-violet-600 text-white font-semibold px-4 py-2 rounded-full hover:bg-violet-700 transition-colors shadow-md flex items-center"><PantryIcon /> <span className="ml-2">{t('moveToPantry')}</span></button>)}
                </div>
            </div>

            <div className="flex items-center justify-end mb-6">
                <label htmlFor="shopping-mode-toggle" className="font-semibold text-gray-700 dark:text-gray-300 mr-3">{t('shoppingMode')}</label>
                <button onClick={() => setIsShoppingMode(!isShoppingMode)} id="shopping-mode-toggle" className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isShoppingMode ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isShoppingMode ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
            </div>
            
            {allItemsCount === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-50 dark:bg-gray-700/30 rounded-2xl border-2 border-dashed border-slate-200 dark:border-gray-700">
                    <div className="w-20 h-20 bg-green-100 dark:bg-green-900/40 rounded-full mx-auto flex items-center justify-center mb-6 text-green-600 dark:text-green-400 shadow-inner">
                        <CheckIcon className="w-10 h-10" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-3">{t('shoppingListEmptyTitle')}</h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 mb-8 max-w-sm mx-auto leading-relaxed">
                        {t('shoppingListEmptyMessage')}
                    </p>
                    <button 
                        onClick={() => store.navigateTo('dashboard')} 
                        className="bg-violet-600 text-white font-bold px-8 py-4 rounded-full hover:bg-violet-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 flex items-center mx-auto gap-3"
                    >
                        <DashboardIcon />
                        <span>{t('shoppingListEmptyButton')}</span>
                    </button>
                </div>
            ) : (
                <>
                    {renderCategoryList(categoriesToRender)}
                    {hasCheckedItems && (
                        <details className="mt-8" open>
                            <summary className="font-bold text-xl text-gray-500 dark:text-gray-400 cursor-pointer">{t('completedItems')} ({checkedItems.size})</summary>
                            <div className="mt-4 opacity-60">
                                {renderCategoryList(checkedCategories, true)}
                            </div>
                        </details>
                    )}
                </>
            )}
            
            {!isShoppingMode && (
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
            )}

            <ItemEditModal
                isOpen={!!editingItem}
                onClose={() => setEditingItem(null)}
                onSave={handleSaveEdit}
                title={t('editItemTitle')}
                itemName={editingItem?.item.item ?? ''}
                initialQuantityValue={editingItem?.item.quantityValue ?? null}
                initialQuantityUnit={editingItem?.item.quantityUnit ?? 'g'}
            />
        </div>
    );
});

export default ShoppingListView;
