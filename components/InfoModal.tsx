import React from 'react';
import { t } from '../i18n';
import { CloseIcon } from './Icons';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    buttonText?: string;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, title, children, buttonText }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[60] p-4" role="dialog" aria-modal="true" aria-labelledby="info-modal-title" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 animate-slide-in-up" onClick={e => e.stopPropagation()}>
                 <div className="flex justify-between items-start mb-4">
                    <h2 id="info-modal-title" className="text-2xl font-bold text-gray-800 dark:text-gray-200">{title}</h2>
                    <button
                        onClick={onClose}
                        className="p-2 -mt-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                        aria-label={t('close')}
                    >
                        <CloseIcon />
                    </button>
                </div>
                <div className="text-gray-600 dark:text-gray-400 mb-6">
                    {typeof children === 'string' ? <p>{children}</p> : children}
                </div>
                <div className="flex justify-end">
                    <button onClick={onClose} className="bg-violet-600 text-white font-semibold px-6 py-2 rounded-full hover:bg-violet-700 transition-colors">
                        {buttonText || 'OK'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InfoModal;
