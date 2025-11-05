import React, { useState, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { ingredientStore } from '../../stores/IngredientStore';
import { uiStore } from '../../stores/UIStore';
import { t } from '../../i18n';
import { PlusCircleIcon, TrashIcon, EditIcon, CheckIcon, CloseIcon, UploadIcon, DownloadIcon } from '../Icons';
import SkeletonLoader from '../SkeletonLoader';
import { Ingredient } from '../../types';

type SortableKey = keyof Ingredient;

interface EditingState {
    id: number;
    name: string;
    category: string;
    calories: string;
    carbs: string;
    protein: string;
    fat: string;
}

const SortableHeader: React.FC<{
    label: string;
    sortKey: SortableKey;
    sortConfig: { key: SortableKey; direction: 'asc' | 'desc' } | null;
    requestSort: (key: SortableKey) => void;
    className?: string;
}> = ({ label, sortKey, sortConfig, requestSort, className = '' }) => {
    const isSorted = sortConfig?.key === sortKey;
    const sortIcon = isSorted ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : '';
    
    const parts = label.match(/(.*)\s(\(.*\))/);
    const mainLabel = parts ? parts[1] : label;
    const subLabel = parts ? parts[2] : null;

    let alignmentClass = 'items-start';
    if (className.includes('text-right')) {
        alignmentClass = 'items-end';
    } else if (className.includes('text-center')) {
        alignmentClass = 'items-center';
    }

    return (
        <th scope="col" className={`px-6 py-3 ${className}`}>
            <button onClick={() => requestSort(sortKey)} className={`flex flex-col w-full ${alignmentClass}`}>
                <div className="flex items-center gap-1 uppercase">
                    {mainLabel}
                    <span className="text-xs">{sortIcon}</span>
                </div>
                {subLabel && <span className="font-normal normal-case">{subLabel}</span>}
            </button>
        </th>
    );
};

const IngredientsManagement: React.FC = observer(() => {
    const { ingredients, addIngredient, updateIngredient, deleteIngredient, status, isPopulating, populateNutritionalData } = ingredientStore;
    const [newItem, setNewItem] = useState('');
    const [editingItem, setEditingItem] = useState<EditingState | null>(null);
    const [filter, setFilter] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKey; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

    const sortedAndFilteredIngredients = useMemo(() => {
        let filtered = ingredients.filter(ingredient =>
            ingredient.name.toLowerCase().includes(filter.toLowerCase()) ||
            ingredient.category?.toLowerCase().includes(filter.toLowerCase())
        );

        if (sortConfig !== null) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];

                if (aValue == null && bValue == null) return 0;
                if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
                if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
                
                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return filtered;
    }, [ingredients, filter, sortConfig]);
    
    const requestSort = (key: SortableKey) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (newItem.trim()) {
            addIngredient(newItem.trim());
            setNewItem('');
        }
    };

    const handleStartEdit = (ingredient: Ingredient) => {
        setEditingItem({
            id: ingredient.id!,
            name: ingredient.name,
            category: ingredient.category || '',
            calories: ingredient.calories?.toFixed(1) || '',
            carbs: ingredient.carbs?.toFixed(1) || '',
            protein: ingredient.protein?.toFixed(1) || '',
            fat: ingredient.fat?.toFixed(1) || '',
        });
    };
    
    const handleEditChange = (field: keyof EditingState, value: string) => {
        if (editingItem) {
            setEditingItem({ ...editingItem, [field]: value });
        }
    };

    const handleSaveEdit = () => {
        if (editingItem) {
            if (!editingItem.name.trim()) {
                uiStore.showInfoModal(t('errorOccurred'), t('ingredientNameEmptyError'));
                return;
            }
            const updates: Partial<Omit<Ingredient, 'id'>> = {
                name: editingItem.name,
                category: editingItem.category || undefined,
                calories: editingItem.calories !== '' ? parseFloat(editingItem.calories) : undefined,
                carbs: editingItem.carbs !== '' ? parseFloat(editingItem.carbs) : undefined,
                protein: editingItem.protein !== '' ? parseFloat(editingItem.protein) : undefined,
                fat: editingItem.fat !== '' ? parseFloat(editingItem.fat) : undefined,
            };
            updateIngredient(editingItem.id, updates);
        }
        setEditingItem(null);
    };

    const handleForceRefresh = () => {
        if (!isPopulating) {
            populateNutritionalData();
        }
    };

    const handleExport = () => {
        const dataToExport = ingredients.map(({ id, ...rest }) => rest); // Export without id
        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lifepulse_ingredients_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleCsvImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            if (!text) {
                uiStore.showInfoModal(t('errorOccurred'), t('importErrorMessage'));
                return;
            }

            try {
                const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
                const header = lines[0].split(',').map(h => h.trim().toLowerCase());
                const rows = lines.slice(1);

                const nameIndex = header.indexOf('name');
                if (nameIndex === -1) {
                    throw new Error("CSV must have a 'name' column.");
                }

                const categoryIndex = header.indexOf('category');
                const caloriesIndex = header.indexOf('calories');
                const carbsIndex = header.indexOf('carbs');
                const proteinIndex = header.indexOf('protein');
                const fatIndex = header.indexOf('fat');

                // Fix: Explicitly typing the result of the `map` operation resolves a type inference issue with the subsequent `filter` predicate.
                const ingredientsToImport: Omit<Ingredient, 'id'>[] = rows.map((row): Omit<Ingredient, 'id'> | null => {
                    const values = row.split(',');
                    const name = values[nameIndex]?.trim();
                    if (!name) return null;

                    const parseNumeric = (index: number) => {
                        if (index === -1 || values[index] === undefined) return undefined;
                        const val = parseFloat(values[index]?.trim());
                        return isNaN(val) ? undefined : val;
                    };

                    return {
                        name,
                        category: categoryIndex > -1 ? values[categoryIndex]?.trim() : undefined,
                        calories: parseNumeric(caloriesIndex),
                        carbs: parseNumeric(carbsIndex),
                        protein: parseNumeric(proteinIndex),
                        fat: parseNumeric(fatIndex),
                    };
                }).filter((item): item is Omit<Ingredient, 'id'> => item !== null);

                if (ingredientsToImport.length > 0) {
                    await ingredientStore.bulkAddOrUpdateIngredients(ingredientsToImport);
                    uiStore.showInfoModal(t('importSuccessTitle'), t('importSuccessMessage', { count: ingredientsToImport.length.toString() }));
                }
            } catch (error) {
                console.error('Error parsing CSV:', error);
                uiStore.showInfoModal(t('errorOccurred'), t('importErrorMessage'));
            } finally {
                // Reset file input to allow re-uploading the same file
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    const handleJsonImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            if (!text) {
                uiStore.showInfoModal(t('errorOccurred'), t('importErrorMessage'));
                return;
            }

            try {
                const data = JSON.parse(text);

                if (!Array.isArray(data) || !data.every(item => typeof item === 'object' && item !== null && 'name' in item)) {
                    throw new Error("Invalid JSON format. Expected an array of objects, each with at least a 'name' property.");
                }

                const ingredientsToImport: Omit<Ingredient, 'id'>[] = data.map(item => ({
                    name: item.name,
                    category: item.category,
                    calories: item.calories,
                    carbs: item.carbs,
                    protein: item.protein,
                    fat: item.fat,
                }));

                if (ingredientsToImport.length > 0) {
                    await ingredientStore.bulkAddOrUpdateIngredients(ingredientsToImport);
                    uiStore.showInfoModal(t('importSuccessTitle'), t('importSuccessMessage', { count: ingredientsToImport.length.toString() }));
                }
            } catch (error) {
                console.error('Error parsing JSON:', error);
                uiStore.showInfoModal(t('errorOccurred'), t('importErrorMessage'));
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    if (status === 'loading' && ingredients.length === 0) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg max-w-6xl mx-auto">
                <SkeletonLoader className="h-8 w-64 mb-6" />
                <SkeletonLoader className="h-12 w-full mb-6" />
                <div className="space-y-2">
                    <SkeletonLoader className="h-12 w-full" />
                    <SkeletonLoader className="h-12 w-full" />
                    <SkeletonLoader className="h-12 w-full" />
                    <SkeletonLoader className="h-12 w-full" />
                </div>
            </div>
        );
    }

    const renderEditingRow = (ingredient: EditingState) => (
        <tr key={ingredient.id} className="bg-violet-50 dark:bg-gray-700">
            <td className="px-6 py-2">
                <input type="text" value={ingredient.name} onChange={e => handleEditChange('name', e.target.value)} className="w-full p-1 bg-white dark:bg-gray-600 border border-violet-500 rounded-md" autoFocus />
            </td>
            <td className="px-6 py-2">
                <input type="text" value={ingredient.category} onChange={e => handleEditChange('category', e.target.value)} className="w-full p-1 bg-white dark:bg-gray-600 border border-violet-500 rounded-md" />
            </td>
            <td className="px-6 py-2"><input type="number" step="0.1" value={ingredient.calories} onChange={e => handleEditChange('calories', e.target.value)} className="w-20 p-1 bg-white dark:bg-gray-600 border border-violet-500 rounded-md text-right" /></td>
            <td className="px-6 py-2"><input type="number" step="0.1" value={ingredient.carbs} onChange={e => handleEditChange('carbs', e.target.value)} className="w-20 p-1 bg-white dark:bg-gray-600 border border-violet-500 rounded-md text-right" /></td>
            <td className="px-6 py-2"><input type="number" step="0.1" value={ingredient.protein} onChange={e => handleEditChange('protein', e.target.value)} className="w-20 p-1 bg-white dark:bg-gray-600 border border-violet-500 rounded-md text-right" /></td>
            <td className="px-6 py-2"><input type="number" step="0.1" value={ingredient.fat} onChange={e => handleEditChange('fat', e.target.value)} className="w-20 p-1 bg-white dark:bg-gray-600 border border-violet-500 rounded-md text-right" /></td>
            <td className="px-6 py-2 text-right">
                <div className="flex items-center justify-end gap-1">
                    <button onClick={handleSaveEdit} className="p-1.5 text-green-500 hover:bg-green-100 dark:hover:bg-gray-900 rounded-full" title={t('save')}><CheckIcon /></button>
                    <button onClick={() => setEditingItem(null)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-gray-900 rounded-full" title={t('cancel')}><CloseIcon /></button>
                </div>
            </td>
        </tr>
    );

    return (
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg max-w-6xl mx-auto">
             <input type="file" id="csv-import-input" className="hidden" accept=".csv" onChange={handleCsvImport} />
             <input type="file" id="json-import-input" className="hidden" accept=".json" onChange={handleJsonImport} />
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{t('manageIngredientsTab')}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {isPopulating && (<div className="flex items-center gap-2 text-sm text-violet-600 dark:text-violet-400 animate-pulse"><div className="animate-spin h-5 w-5 border-b-2 border-current rounded-full"></div><span>Updating...</span></div>)}
                    <label htmlFor="csv-import-input" className="cursor-pointer flex items-center gap-2 bg-blue-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-600 transition-colors" title={t('importCSVDescription')}><UploadIcon /> {t('importCSV')}</label>
                    <label htmlFor="json-import-input" className="cursor-pointer flex items-center gap-2 bg-purple-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-purple-600 transition-colors" title={t('importJSONDescription')}><UploadIcon /> {t('importJSON')}</label>
                    <button onClick={handleExport} className="flex items-center gap-2 bg-green-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-green-600 transition-colors" title={t('exportJSONDescription')}><DownloadIcon /> {t('exportJSON')}</button>
                </div>
            </div>

            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <form onSubmit={handleAddItem} className="flex gap-2">
                    <input type="text" value={newItem} onChange={(e) => setNewItem(e.target.value)} placeholder={t('addNewIngredientPlaceholder')} className="flex-grow px-3 py-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-violet-500 focus:border-violet-500" />
                    <button type="submit" className="bg-violet-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-violet-700 transition-colors flex items-center gap-2"><PlusCircleIcon /> {t('add')}</button>
                </form>
                <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder={t('searchIngredientsPlaceholder')} className="px-3 py-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-violet-500 focus:border-violet-500" />
            </div>

            {ingredients.length > 0 ? (
                <div className="relative overflow-x-auto shadow-md sm:rounded-lg max-h-[60vh]">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                            <tr>
                                <SortableHeader label={t('ingredientColumnHeader')} sortKey="name" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader label={t('categoryColumnHeader')} sortKey="category" sortConfig={sortConfig} requestSort={requestSort} />
                                <SortableHeader label={t('caloriesColumnHeader')} sortKey="calories" sortConfig={sortConfig} requestSort={requestSort} className="text-right" />
                                <SortableHeader label={t('carbsColumnHeader')} sortKey="carbs" sortConfig={sortConfig} requestSort={requestSort} className="text-right" />
                                <SortableHeader label={t('proteinColumnHeader')} sortKey="protein" sortConfig={sortConfig} requestSort={requestSort} className="text-right" />
                                <SortableHeader label={t('fatColumnHeader')} sortKey="fat" sortConfig={sortConfig} requestSort={requestSort} className="text-right" />
                                <th scope="col" className="px-6 py-3 text-right uppercase">{t('actionsColumnHeader')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAndFilteredIngredients.map(ingredient => 
                                editingItem?.id === ingredient.id
                                ? renderEditingRow(editingItem)
                                : (
                                <tr key={ingredient.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 group">
                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{ingredient.name}</th>
                                    <td className="px-6 py-4">{ingredient.category || '-'}</td>
                                    <td className="px-6 py-4 text-right">{ingredient.calories?.toFixed(1) ?? '-'}</td>
                                    <td className="px-6 py-4 text-right">{ingredient.carbs?.toFixed(1) ?? '-'}</td>
                                    <td className="px-6 py-4 text-right">{ingredient.protein?.toFixed(1) ?? '-'}</td>
                                    <td className="px-6 py-4 text-right">{ingredient.fat?.toFixed(1) ?? '-'}</td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => handleStartEdit(ingredient)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400" title={t('editItemTitle')}><EditIcon /></button>
                                            <button onClick={() => deleteIngredient(ingredient.name)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" title={t('deleteItemTitle')}><TrashIcon /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    <p className="text-lg font-semibold text-gray-500 dark:text-gray-400">{t('noIngredientsMessage')}</p>
                    <p className="text-sm text-gray-400 dark:text-gray-500 mt-2 max-w-md mx-auto">{t('noIngredientsSuggestion')}</p>
                </div>
            )}
        </div>
    );
});

export default IngredientsManagement;
