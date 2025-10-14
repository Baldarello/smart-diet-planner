import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { ingredientStore } from '../../stores/IngredientStore';
import { t } from '../../i18n';
import { PlusCircleIcon, TrashIcon, EditIcon, CheckIcon, CloseIcon } from '../Icons';
import SkeletonLoader from '../SkeletonLoader';

const IngredientsManagement: React.FC = observer(() => {
    const { ingredients, addIngredient, updateIngredient, deleteIngredient, status } = ingredientStore;
    const [newItem, setNewItem] = useState('');
    const [editingItem, setEditingItem] = useState<{ oldName: string; newName: string } | null>(null);

    const handleAddItem = (e: React.FormEvent) => {
        e.preventDefault();
        if (newItem.trim()) {
            addIngredient(newItem.trim());
            setNewItem('');
        }
    };

    const handleStartEdit = (name: string) => {
        setEditingItem({ oldName: name, newName: name });
    };

    const handleSaveEdit = () => {
        if (editingItem && editingItem.oldName !== editingItem.newName.trim()) {
            updateIngredient(editingItem.oldName, editingItem.newName.trim());
        }
        setEditingItem(null);
    };

    if (status === 'loading') {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg max-w-4xl mx-auto">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">
                    <SkeletonLoader className="h-8 w-64" />
                </h3>
                <SkeletonLoader className="h-12 w-full mb-6" />
                <div className="space-y-2">
                    <SkeletonLoader className="h-12 w-full" />
                    <SkeletonLoader className="h-12 w-full" />
                    <SkeletonLoader className="h-12 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">{t('manageIngredientsTab')}</h3>

            <form onSubmit={handleAddItem} className="mb-6 flex gap-2">
                <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    placeholder={t('addNewIngredientPlaceholder')}
                    className="flex-grow p-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-violet-500 focus:border-violet-500"
                />
                <button type="submit" className="bg-violet-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-violet-700 transition-colors flex items-center gap-2">
                    <PlusCircleIcon /> {t('add')}
                </button>
            </form>

            <ul className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                {ingredients.map(ingredient => (
                    <li key={ingredient.name} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-700/50 rounded-lg group">
                        {editingItem?.oldName === ingredient.name ? (
                            <input
                                type="text"
                                value={editingItem.newName}
                                onChange={(e) => setEditingItem({ ...editingItem, newName: e.target.value })}
                                onBlur={handleSaveEdit}
                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingItem(null);}}
                                autoFocus
                                className="flex-grow p-1 bg-white dark:bg-gray-600 border border-violet-500 rounded-md"
                            />
                        ) : (
                            <span className="text-gray-800 dark:text-gray-200">{ingredient.name}</span>
                        )}
                        <div className="flex items-center gap-1">
                             {editingItem?.oldName === ingredient.name ? (
                                <>
                                    <button onClick={handleSaveEdit} className="p-1.5 text-green-500 hover:bg-green-100 dark:hover:bg-gray-600 rounded-full" title={t('save')}><CheckIcon /></button>
                                    <button onClick={() => setEditingItem(null)} className="p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-gray-600 rounded-full" title={t('cancel')}><CloseIcon /></button>
                                </>
                             ) : (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleStartEdit(ingredient.name)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400" title={t('editItemTitle')}><EditIcon /></button>
                                    <button onClick={() => deleteIngredient(ingredient.name)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" title={t('deleteItemTitle')}><TrashIcon /></button>
                                </div>
                             )}
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
});

export default IngredientsManagement;