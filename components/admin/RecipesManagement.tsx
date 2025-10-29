import React, { useState, useMemo, useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { recipeStore } from '../../stores/RecipeStore';
import { ingredientStore } from '../../stores/IngredientStore';
import { uiStore } from '../../stores/UIStore';
import { t } from '../../i18n';
import { Recipe, RecipeIngredient } from '../../types';
import { PlusCircleIcon, TrashIcon, EditIcon, CheckIcon, CloseIcon, UploadIcon, DownloadIcon, ViewIcon } from '../Icons';
import SkeletonLoader from '../SkeletonLoader';
import ConfirmationModal from '../ConfirmationModal';
import UnitPicker from '../UnitPicker';
import ViewRecipeModal from './ViewRecipeModal';

// Fix: Define a form-specific ingredient type to handle string-based input values.
interface FormRecipeIngredient {
    ingredientName: string;
    quantityValue: string;
    quantityUnit: string;
}

const RecipeFormModal: React.FC<{
    recipe: Partial<Recipe> | null;
    onClose: () => void;
    onSave: (recipe: Omit<Recipe, 'id'>) => Promise<void>;
}> = observer(({ recipe, onClose, onSave }) => {
    const [name, setName] = useState(recipe?.name || '');
    const [procedure, setProcedure] = useState(recipe?.procedure || '');
    // Fix: Use the new FormRecipeIngredient type for state and convert numeric values to strings on initialization.
    const [ingredients, setIngredients] = useState<FormRecipeIngredient[]>(
        recipe?.ingredients?.map(ing => ({
            ...ing,
            quantityValue: ing.quantityValue?.toString() ?? ''
        })) || [{ ingredientName: '', quantityValue: '', quantityUnit: 'g' }]
    );
    const [activeAutocomplete, setActiveAutocomplete] = useState<{ itemIndex: number } | null>(null);
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const autocompleteRef = useRef<HTMLDivElement>(null);

    // Fix: Update handleItemChange to use the strongly-typed FormRecipeIngredient.
    const handleItemChange = (index: number, field: keyof FormRecipeIngredient, value: string) => {
        const newIngredients = [...ingredients];
        newIngredients[index][field] = value;
        setIngredients(newIngredients);

        if (field === 'ingredientName') {
            setActiveAutocomplete({ itemIndex: index });
            updateSuggestions(value as string);
        }
    };

    const updateSuggestions = (inputValue: string) => {
        if (inputValue.length >= 2) {
            const suggestions = ingredientStore.ingredients
                .map(i => i.name)
                .filter(s => s.toLowerCase().includes(inputValue.toLowerCase()));
            setFilteredSuggestions(suggestions);
        } else {
            setFilteredSuggestions([]);
        }
    };

    const handleSuggestionClick = (index: number, suggestion: string) => {
        handleItemChange(index, 'ingredientName', suggestion);
        setActiveAutocomplete(null);
        ingredientStore.addIngredient(suggestion.trim());
    };

    const handleIngredientBlur = (ingredientName: string) => {
        setTimeout(() => {
            if (autocompleteRef.current && !autocompleteRef.current.contains(document.activeElement)) {
                setActiveAutocomplete(null);
            }
        }, 150);
        if (ingredientName.trim()) {
            ingredientStore.addIngredient(ingredientName.trim());
        }
    };

    const handleAddItem = () => {
        setIngredients([...ingredients, { ingredientName: '', quantityValue: '', quantityUnit: 'g' }]);
    };

    // Fix: Correct the logic to ensure a single empty item remains when the last item is removed.
    const handleRemoveItem = (index: number) => {
        const newIngredients = ingredients.filter((_, i) => i !== index);
        if (newIngredients.length === 0) {
            setIngredients([{ ingredientName: '', quantityValue: '', quantityUnit: 'g' }]);
        } else {
            setIngredients(newIngredients);
        }
    };

    // Fix: Correctly parse string quantity values to numbers or null on form submission.
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalIngredients = ingredients
            .map(ing => ({
                ingredientName: ing.ingredientName.trim(),
                quantityValue: ing.quantityValue.trim() !== '' ? parseFloat(ing.quantityValue) : null,
                quantityUnit: ing.quantityUnit,
            }))
            .filter(ing => ing.ingredientName);
            
        onSave({ name: name.trim(), procedure: procedure.trim(), ingredients: finalIngredients });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">{recipe?.id ? t('editRecipe') : t('addRecipe')}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><CloseIcon /></button>
                </header>
                <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-4">
                    <div>
                        <label htmlFor="recipe-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('recipeNameLabel')}</label>
                        <input id="recipe-name" type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full mt-1 p-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-violet-500 focus:border-violet-500" />
                    </div>
                    <div>
                        <label htmlFor="recipe-procedure" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('procedureLabel')}</label>
                        <textarea id="recipe-procedure" value={procedure} onChange={e => setProcedure(e.target.value)} rows={5} className="w-full mt-1 p-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-violet-500 focus:border-violet-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('ingredientsLabel')}</h3>
                        <div className="space-y-2">
                            {ingredients.map((item, index) => (
                                <div key={index} className="grid grid-cols-[1fr,auto,auto,auto] items-center gap-2">
                                    <div className="relative">
                                        <input type="text" placeholder={t('ingredientPlaceholder')} value={item.ingredientName} onChange={e => handleItemChange(index, 'ingredientName', e.target.value)} onFocus={() => setActiveAutocomplete({ itemIndex: index })} onBlur={() => handleIngredientBlur(item.ingredientName)} className="w-full p-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md" autoComplete="off" />
                                        {activeAutocomplete?.itemIndex === index && filteredSuggestions.length > 0 && (
                                            <div ref={autocompleteRef} className="absolute top-full left-0 w-full mt-1 bg-white dark:bg-gray-800 border rounded-md shadow-lg z-10 max-h-48 overflow-y-auto">
                                                {filteredSuggestions.map((s, i) => <button key={i} type="button" onMouseDown={() => handleSuggestionClick(index, s)} className="w-full text-left px-3 py-2 hover:bg-violet-100 dark:hover:bg-gray-700">{s}</button>)}
                                            </div>
                                        )}
                                    </div>
                                    <input type="number" step="any" placeholder={t('quantityPlaceholder')} value={item.quantityValue} onChange={e => handleItemChange(index, 'quantityValue', e.target.value)} className="w-24 p-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md" />
                                    <UnitPicker value={item.quantityUnit} onChange={unit => handleItemChange(index, 'quantityUnit', unit)} />
                                    <button type="button" onClick={() => handleRemoveItem(index)} className="text-gray-400 hover:text-red-500"><TrashIcon /></button>
                                </div>
                            ))}
                        </div>
                        <button type="button" onClick={handleAddItem} className="mt-2 flex items-center gap-2 text-sm font-semibold text-violet-600"><PlusCircleIcon /> {t('addIngredient')}</button>
                    </div>
                    <footer className="flex-shrink-0 pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 font-semibold px-4 py-2 rounded-full hover:bg-gray-300">{t('cancel')}</button>
                        <button type="submit" disabled={!name.trim()} className="bg-violet-600 text-white font-semibold px-4 py-2 rounded-full hover:bg-violet-700 disabled:bg-violet-400">{t('save')}</button>
                    </footer>
                </form>
            </div>
        </div>
    );
});

const RecipesManagement: React.FC = observer(() => {
    const { recipes, status, addRecipe, updateRecipe, deleteRecipe, bulkAddOrUpdateRecipes } = recipeStore;
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
    const [deletingRecipe, setDeletingRecipe] = useState<Recipe | null>(null);
    const [viewingRecipe, setViewingRecipe] = useState<Recipe | null>(null);
    const [filter, setFilter] = useState('');

    const filteredRecipes = useMemo(() => {
        return recipes.filter(recipe =>
            recipe.name.toLowerCase().includes(filter.toLowerCase())
        );
    }, [recipes, filter]);

    const handleAdd = () => {
        setEditingRecipe(null);
        setIsFormOpen(true);
    };

    const handleEdit = (recipe: Recipe) => {
        setEditingRecipe(recipe);
        setIsFormOpen(true);
    };

    const handleSave = async (recipeData: Omit<Recipe, 'id'>) => {
        if (editingRecipe?.id) {
            await updateRecipe(editingRecipe.id, recipeData);
        } else {
            await addRecipe(recipeData);
        }
        setIsFormOpen(false);
        setEditingRecipe(null);
    };

    const handleDelete = (recipe: Recipe) => {
        setDeletingRecipe(recipe);
    };

    const confirmDelete = () => {
        if (deletingRecipe?.id) {
            deleteRecipe(deletingRecipe.id);
        }
        setDeletingRecipe(null);
    };
    
    const handleExport = () => {
        const dataToExport = recipes.map(({ id, ...rest }) => rest);
        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lifepulse_recipes_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };
    
    const handleImport = (event: React.ChangeEvent<HTMLInputElement>, format: 'json' | 'csv') => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            try {
                let recipesToImport: Omit<Recipe, 'id'>[] = [];
                if (format === 'json') {
                    const data = JSON.parse(text);
                    if (!Array.isArray(data)) throw new Error('JSON must be an array of recipes.');
                    recipesToImport = data;
                } else { // CSV
                    const lines = text.split(/\r?\n/).filter(line => line.trim());
                    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
                    const rows = lines.slice(1);
                    const recipeMap = new Map<string, { procedure?: string; ingredients: RecipeIngredient[] }>();
                    
                    const nameIdx = header.indexOf('recipe_name');
                    const procIdx = header.indexOf('procedure');
                    const ingNameIdx = header.indexOf('ingredient_name');
                    const qtyIdx = header.indexOf('quantity');
                    const unitIdx = header.indexOf('unit');
                    
                    if(nameIdx === -1 || ingNameIdx === -1 || qtyIdx === -1 || unitIdx === -1) {
                         throw new Error("CSV must contain columns: recipe_name, ingredient_name, quantity, unit. 'procedure' is optional.");
                    }

                    for (const row of rows) {
                        const values = row.split(',');
                        const name = values[nameIdx]?.trim();
                        if (!name) continue;

                        if (!recipeMap.has(name)) {
                            recipeMap.set(name, { procedure: procIdx > -1 ? values[procIdx]?.trim() : '', ingredients: [] });
                        }
                        const recipeEntry = recipeMap.get(name)!;
                        recipeEntry.ingredients.push({
                            ingredientName: values[ingNameIdx]?.trim(),
                            quantityValue: parseFloat(values[qtyIdx]?.trim()) || null,
                            quantityUnit: values[unitIdx]?.trim() || 'g'
                        });
                    }
                    recipesToImport = Array.from(recipeMap.entries()).map(([name, data]) => ({ name, ...data }));
                }
                
                if (recipesToImport.length > 0) {
                    await bulkAddOrUpdateRecipes(recipesToImport);
                    uiStore.showInfoModal(t('importSuccessTitle'), t('recipesImportSuccessMessage', { count: recipesToImport.length.toString() }));
                }

            } catch (error) {
                console.error(`Error importing ${format}:`, error);
                uiStore.showInfoModal(t('errorOccurred'), t('recipesImportErrorMessage', { error: error instanceof Error ? error.message : 'Unknown error' }));
            } finally {
                event.target.value = '';
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg max-w-6xl mx-auto">
            <input type="file" id="json-recipe-import" className="hidden" accept=".json" onChange={e => handleImport(e, 'json')} />
            <input type="file" id="csv-recipe-import" className="hidden" accept=".csv" onChange={e => handleImport(e, 'csv')} />

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{t('manageRecipesTab')}</h3>
                <div className="flex flex-wrap items-center gap-2">
                     <label htmlFor="csv-recipe-import" className="cursor-pointer flex items-center gap-2 bg-blue-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-600"><UploadIcon /> {t('importRecipesCSV')}</label>
                     <label htmlFor="json-recipe-import" className="cursor-pointer flex items-center gap-2 bg-purple-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-purple-600"><UploadIcon /> {t('importRecipesJSON')}</label>
                    <button onClick={handleExport} className="flex items-center gap-2 bg-green-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-green-600"><DownloadIcon /> {t('exportRecipesJSON')}</button>
                </div>
            </div>

             <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button onClick={handleAdd} className="bg-violet-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-violet-700 flex items-center gap-2 justify-center"><PlusCircleIcon /> {t('addRecipe')}</button>
                <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder={t('searchRecipesPlaceholder')} className="px-3 py-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md" />
            </div>

            {status === 'loading' ? (
                <SkeletonLoader className="h-48 w-full" />
            ) : filteredRecipes.length > 0 ? (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {filteredRecipes.map(recipe => (
                        <div key={recipe.id} className="bg-slate-50 dark:bg-gray-700/50 p-4 rounded-lg flex justify-between items-center group">
                            <p className="font-bold text-gray-800 dark:text-gray-200">{recipe.name}</p>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setViewingRecipe(recipe)} className="p-1.5 text-gray-500 hover:text-blue-600" title={t('view')}><ViewIcon /></button>
                                <button onClick={() => handleEdit(recipe)} className="p-1.5 text-gray-500 hover:text-violet-600" title={t('edit')}><EditIcon /></button>
                                <button onClick={() => handleDelete(recipe)} className="p-1.5 text-gray-500 hover:text-red-500" title={t('delete')}><TrashIcon /></button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 border-2 border-dashed rounded-lg">
                    <p className="text-lg font-semibold text-gray-500">{t('noRecipesMessage')}</p>
                    <p className="text-sm text-gray-400 mt-2">{t('noRecipesSuggestion')}</p>
                </div>
            )}

            {isFormOpen && <RecipeFormModal recipe={editingRecipe} onClose={() => setIsFormOpen(false)} onSave={handleSave} />}
            {deletingRecipe && (
                <ConfirmationModal isOpen={!!deletingRecipe} onClose={() => setDeletingRecipe(null)} onConfirm={confirmDelete} title={t('deleteRecipeConfirmationTitle')}>
                    <p>{t('deleteRecipeConfirmationMessage')}</p>
                </ConfirmationModal>
            )}
            {viewingRecipe && <ViewRecipeModal recipe={viewingRecipe} onClose={() => setViewingRecipe(null)} />}
        </div>
    );
});

export default RecipesManagement;
