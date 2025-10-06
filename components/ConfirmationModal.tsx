import React from 'react';
import { t } from '../i18n';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    children: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, children }) => {
    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 animate-slide-in-up">
                <h2 id="modal-title" className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-4">{title}</h2>
                <div className="text-gray-600 dark:text-gray-400 mb-6">
                    {children}
                </div>
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold px-6 py-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                        {t('cancel')}
                    </button>
                    <button onClick={handleConfirm} className="bg-violet-600 text-white font-semibold px-6 py-2 rounded-full hover:bg-violet-700 transition-colors">
                        {t('confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;