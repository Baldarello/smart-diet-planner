import React from 'react';
import { Recipe } from '../../types';
import { t } from '../../i18n';
import { CloseIcon } from '../Icons';
import { formatQuantity } from '../../utils/quantityParser';

interface ViewRecipeModalProps {
    recipe: Recipe;
    onClose: () => void;
}

const ViewRecipeModal: React.FC<ViewRecipeModalProps> = ({ recipe, onClose }) => {
    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" 
            role="dialog" 
            aria-modal="true" 
            onClick={onClose}
        >
            <div 
                className="bg-slate-50 dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl flex flex-col h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 rounded-t-2xl">
                    <h2 id="modal-title" className="text-xl font-bold text-gray-800 dark:text-gray-200">{recipe.name}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label={t('close')}
                    >
                        <CloseIcon />
                    </button>
                </header>
                <main className="overflow-y-auto p-6 space-y-4">
                    {recipe.procedure && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('procedureLabel')}</h3>
                            <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap bg-white dark:bg-gray-800 p-3 rounded-md">{recipe.procedure}</p>
                        </div>
                    )}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">{t('ingredientsLabel')}</h3>
                        <ul className="space-y-2">
                            {recipe.ingredients.map((ing, index) => (
                                <li key={index} className="p-2 bg-white dark:bg-gray-800 rounded-md flex justify-between">
                                    <span className="text-gray-800 dark:text-gray-200">{ing.ingredientName}</span>
                                    <span className="font-mono text-gray-600 dark:text-gray-400">{formatQuantity(ing.quantityValue, ing.quantityUnit)}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ViewRecipeModal;