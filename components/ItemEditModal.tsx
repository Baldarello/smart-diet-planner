
import React, { useState, useEffect } from 'react';
import { t } from '../i18n';
import { CloseIcon, CheckIcon } from './Icons';
import UnitPicker from './UnitPicker';

interface ItemEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (quantityValue: number | null, quantityUnit: string) => void;
    title: string;
    itemName: string;
    initialQuantityValue: number | null;
    initialQuantityUnit: string;
}

const ItemEditModal: React.FC<ItemEditModalProps> = ({
    isOpen,
    onClose,
    onSave,
    title,
    itemName,
    initialQuantityValue,
    initialQuantityUnit
}) => {
    const [quantityValue, setQuantityValue] = useState(initialQuantityValue?.toString() ?? '');
    const [quantityUnit, setQuantityUnit] = useState(initialQuantityUnit);

    useEffect(() => {
        if (isOpen) {
            setQuantityValue(initialQuantityValue?.toString() ?? '');
            setQuantityUnit(initialQuantityUnit);
        }
    }, [isOpen, initialQuantityValue, initialQuantityUnit]);

    if (!isOpen) return null;

    const handleSave = () => {
        const val = parseFloat(quantityValue);
        onSave(isNaN(val) ? null : val, quantityUnit);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4" role="dialog" aria-modal="true" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 animate-slide-in-up" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">{title}</h2>
                        <p className="text-sm text-violet-600 dark:text-violet-400 font-medium mt-1">{itemName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                        <CloseIcon />
                    </button>
                </header>

                <div className="space-y-4">
                    <div className="flex gap-4 items-end">
                        <div className="flex-grow">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('quantityPlaceholder')}
                            </label>
                            <input
                                type="number"
                                step="any"
                                value={quantityValue}
                                onChange={(e) => setQuantityValue(e.target.value)}
                                className="w-full p-3 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-violet-500 outline-none font-bold text-lg"
                                autoFocus
                            />
                        </div>
                        <div className="w-32">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                {t('quantityUnitLabel')}
                            </label>
                            <div className="h-[52px]">
                                <UnitPicker value={quantityUnit} onChange={setQuantityUnit} />
                            </div>
                        </div>
                    </div>
                </div>

                <footer className="mt-8 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold px-6 py-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                        {t('cancel')}
                    </button>
                    <button
                        onClick={handleSave}
                        className="bg-violet-600 text-white font-semibold px-8 py-2 rounded-full hover:bg-violet-700 transition-colors shadow-md flex items-center gap-2"
                    >
                        <CheckIcon className="w-4 h-4" />
                        {t('save')}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default ItemEditModal;
