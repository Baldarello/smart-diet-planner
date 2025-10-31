import React, { useState, useEffect, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { SendToShoppingListIcon, PlusCircleIcon, WarningIcon, EditIcon, CheckIcon, CloseIcon } from './Icons';
import { t } from '../i18n';
import { PantryItem } from '../types';
import UnitPicker from './UnitPicker';
import { formatQuantity, parseQuantity } from '../utils/quantityParser';

const getExpiryStatus = (dateStr?: string): 'expired' | 'soon' | 'ok' => {
    if (!dateStr) return 'ok';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiryDate = new Date(dateStr);
    expiryDate.setHours(0,0,0,0);
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'expired';
    if (diffDays <= 7) return 'soon';
    return 'ok';
};

const PantryItemRow: React.FC<{pantryItem: PantryItem}> = observer(({pantryItem}) => {
    const { movePantryItemToShoppingList, updatePantryItem } = mealPlanStore;
    const [isEditing, setIsEditing] = useState(false);
    const [editState, setEditState] = useState({
        quantityValue: pantryItem.quantityValue?.toString() ?? '',
        quantityUnit: pantryItem.quantityUnit
    });
    
    const [thresholdValue, setThresholdValue] = useState('');
    const [thresholdUnit, setThresholdUnit] = useState(pantryItem.quantityUnit);
    const [isExpiryDateFocused, setIsExpiryDateFocused] = useState(false);

    const formattedExpiryDate = useMemo(() => {
        if (!pantryItem.expiryDate) return '';
        try {
            const [year, month, day] = pantryItem.expiryDate.split('-');
            return `${day}/${month}/${year}`;
        } catch(e) {
            return pantryItem.expiryDate;
        }
    }, [pantryItem.expiryDate]);

    useEffect(() => {
        if (pantryItem.lowStockThreshold) {
            const parsed = parseQuantity(pantryItem.lowStockThreshold);
            if (parsed && parsed.value !== null) {
                setThresholdValue(parsed.value.toString());
                setThresholdUnit(parsed.unit);
            } else {
                setThresholdValue('');
                setThresholdUnit(pantryItem.quantityUnit);
            }
        } else {
            setThresholdValue('');
            setThresholdUnit(pantryItem.quantityUnit);
        }
    }, [pantryItem.lowStockThreshold, pantryItem.quantityUnit]);

    const handleThresholdChange = (value: string, unit: string) => {
        const newThresholdString = value.trim() ? `${value.trim()} ${unit}` : '';
        // We call update directly instead of waiting for blur to provide a more responsive feel,
        // especially when the unit is changed.
        if (newThresholdString !== (pantryItem.lowStockThreshold || '')) {
            updatePantryItem(pantryItem.item, { lowStockThreshold: newThresholdString });
        }
    };


    const handleSave = () => {
        updatePantryItem(pantryItem.item, {
            quantityValue: parseFloat(editState.quantityValue) || null,
            quantityUnit: editState.quantityUnit,
        });
        setIsEditing(false);
    };

    const expiryStatus = getExpiryStatus(pantryItem.expiryDate);
    const statusClasses = {
        expired: 'bg-red-50 border-l-4 border-red-500 dark:bg-red-900/30',
        soon: 'bg-orange-50 border-l-4 border-orange-400 dark:bg-orange-900/30',
        ok: 'border-l-4 border-transparent'
    }[expiryStatus];

    return (
        <li className={`p-3 rounded-md group/item ${statusClasses}`}>
            <div className="flex items-center justify-between">
                <span className="font-medium text-gray-800 dark:text-gray-200">{pantryItem.item}</span>
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <>
                            <input 
                                type="number" 
                                value={editState.quantityValue} 
                                onChange={(e) => setEditState({...editState, quantityValue: e.target.value})} 
                                className="text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded px-2 py-1 w-20 text-right"
                            />
                            <UnitPicker value={editState.quantityUnit} onChange={(unit) => setEditState({...editState, quantityUnit: unit})} />
                            <button onClick={handleSave} className="p-1.5 text-green-500 hover:bg-green-100 dark:hover:bg-gray-600 rounded-full"><CheckIcon /></button>
                            <button onClick={() => setIsEditing(false)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-gray-600 rounded-full"><CloseIcon /></button>
                        </>
                    ) : (
                         <>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">{formatQuantity(pantryItem.quantityValue, pantryItem.quantityUnit)}</span>
                            <button onClick={() => setIsEditing(true)} className="text-gray-400 dark:text-gray-500 hover:text-violet-500 dark:hover:text-violet-400 transition-colors opacity-0 group-hover/item:opacity-100" title={t('editItemTitle')}><EditIcon /></button>
                            <button onClick={() => movePantryItemToShoppingList(pantryItem)} className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover/item:opacity-100" title={t('moveToShoppingListTitle')}><SendToShoppingListIcon /></button>
                         </>
                    )}
                </div>
            </div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                    <label htmlFor={`expiry-${pantryItem.item}`} className="block text-xs font-medium text-gray-500 dark:text-gray-400">{t('pantryExpiryDate')}</label>
                    <input 
                        type={isExpiryDateFocused ? 'date' : 'text'}
                        id={`expiry-${pantryItem.item}`} 
                        value={isExpiryDateFocused ? pantryItem.expiryDate || '' : formattedExpiryDate} 
                        onFocus={() => setIsExpiryDateFocused(true)}
                        onBlur={() => setIsExpiryDateFocused(false)}
                        onChange={(e) => updatePantryItem(pantryItem.item, { expiryDate: e.target.value })} 
                        className="w-full bg-transparent p-1 rounded-md"
                    />
                </div>
                <div>
                    <label htmlFor={`threshold-value-${pantryItem.item}`} className="block text-xs font-medium text-gray-500 dark:text-gray-400">{t('pantryLowStockThreshold')}</label>
                    <div className="flex items-center gap-2 mt-1">
                        <input
                            id={`threshold-value-${pantryItem.item}`}
                            type="number"
                            placeholder={t('pantryThresholdPlaceholder')}
                            value={thresholdValue}
                            onChange={(e) => {
                                setThresholdValue(e.target.value);
                                handleThresholdChange(e.target.value, thresholdUnit);
                            }}
                            className="w-full bg-transparent p-1 rounded-md placeholder:text-gray-400 dark:placeholder:text-gray-500 border-b border-gray-300 dark:border-gray-600 focus:border-violet-500 outline-none"
                        />
                        <UnitPicker
                            value={thresholdUnit}
                            onChange={(unit) => {
                                setThresholdUnit(unit);
                                handleThresholdChange(thresholdValue, unit);
                            }}
                        />
                    </div>
                </div>
            </div>
            {expiryStatus === 'soon' && <p className="mt-2 text-xs font-semibold text-orange-600 dark:text-orange-400 flex items-center"><WarningIcon/> <span className="ml-1.5">{t('itemExpiresSoon')}</span></p>}
            {expiryStatus === 'expired' && <p className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400 flex items-center"><WarningIcon/> <span className="ml-1.5">{t('itemExpired')}</span></p>}
        </li>
    );
});

const PantryView: React.FC = observer(() => {
    const { pantry, shoppingList, addPantryItem } = mealPlanStore;
    
    const [showAddItemForm, setShowAddItemForm] = useState(false);
    const [newItem, setNewItem] = useState({ item: '', quantityValue: '', quantityUnit: 'g', category: '' });
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
        if (newItem.item.trim() && category) {
            addPantryItem(newItem.item, parseFloat(newItem.quantityValue) || null, newItem.quantityUnit, category);
            handleCancelAddItem();
        }
    };
    
    const handleCancelAddItem = () => {
        setShowAddItemForm(false);
        setNewItem({ item: '', quantityValue: '', quantityUnit: 'g', category: '' });
        setIsNewCategory(false);
        setNewCategoryName('');
    };


    return (
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg transition-all duration-300 max-w-4xl mx-auto">
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
                                    <PantryItemRow key={index} pantryItem={pantryItem} />
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
                            <input type="text" placeholder={t('itemNamePlaceholder')} value={newItem.item} onChange={(e) => setNewItem({ ...newItem, item: e.target.value })} className="p-2 rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 w-full"/>
                            <div className="flex gap-2">
                                <input type="number" placeholder="100" value={newItem.quantityValue} onChange={(e) => setNewItem({ ...newItem, quantityValue: e.target.value })} className="p-2 rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 w-24"/>
                                <UnitPicker value={newItem.quantityUnit} onChange={(unit) => setNewItem({...newItem, quantityUnit: unit})} />
                            </div>
                        </div>
                        <div>
                            <select value={isNewCategory ? '__NEW__' : newItem.category} onChange={handleCategoryChange} className="p-2 rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 w-full">
                                <option value="" disabled hidden>{t('selectCategoryPrompt')}</option>
                                {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                <option value="__NEW__">{t('newCategoryOption')}</option>
                            </select>
                        </div>
                        {isNewCategory && (<input type="text" placeholder={t('newCategoryPrompt')} value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="p-2 rounded bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 w-full" autoFocus/>)}
                        <div className="flex justify-end gap-2">
                            <button onClick={handleCancelAddItem} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold px-4 py-2 rounded-full hover:bg-gray-300">{t('cancel')}</button>
                            <button onClick={handleAddItem} disabled={!newItem.item.trim() || !(isNewCategory ? newCategoryName.trim() : newItem.category)} className="bg-violet-600 text-white font-semibold px-4 py-2 rounded-full hover:bg-violet-700 disabled:bg-violet-400">{t('save')}</button>
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
