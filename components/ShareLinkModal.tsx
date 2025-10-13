import React, { useState } from 'react';
import { t } from '../i18n';
import { CopyIcon, CheckIcon, CloseIcon } from './Icons';

interface ShareLinkModalProps {
    url: string;
    onClose: () => void;
}

const ShareLinkModal: React.FC<ShareLinkModalProps> = ({ url, onClose }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch(err => {
            console.error('Failed to copy text: ', err);
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-6 animate-slide-in-up relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label={t('close')}
                >
                    <CloseIcon />
                </button>
                <h2 id="modal-title" className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('shareLinkTitle')}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{t('shareLinkInstruction')}</p>
                
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={url}
                        readOnly
                        className="w-full p-2 bg-slate-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-600 dark:text-gray-300"
                    />
                    <button
                        onClick={handleCopy}
                        className="bg-violet-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-violet-700 transition-colors flex items-center justify-center w-28 flex-shrink-0"
                    >
                        {copied ? (
                            <>
                                <CheckIcon />
                                <span className="ml-2">{t('linkCopied')}</span>
                            </>
                        ) : (
                            <>
                                <CopyIcon />
                                <span className="ml-2">{t('copyLink')}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ShareLinkModal;