import React from 'react';
import { t } from '../i18n';
import { InstallIcon } from './Icons';

interface InstallPwaSnackbarProps {
    onInstall: () => void;
    onDismiss: () => void;
}

const InstallPwaSnackbar: React.FC<InstallPwaSnackbarProps> = ({ onInstall, onDismiss }) => {
    return (
        <div 
            className="fixed bottom-32 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:w-11/12 max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-4 flex flex-col sm:flex-row items-center justify-between z-50 animate-slide-in-up border dark:border-gray-700"
            role="alert"
            aria-live="assertive"
        >
            <div className="flex items-center mb-3 sm:mb-0 text-center sm:text-left">
                <div className="text-violet-500 flex-shrink-0">
                    <InstallIcon />
                </div>
                <p className="ml-3 font-medium text-gray-700 dark:text-gray-200">
                    {t('installPwaPrompt')}
                </p>
            </div>
            <div className="flex gap-4 flex-shrink-0">
                 <button
                    onClick={onDismiss}
                    className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold px-4 py-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                    {t('dismiss')}
                </button>
                <button
                    onClick={onInstall}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-2 px-4 rounded-full transition-colors"
                >
                    {t('install')}
                </button>
            </div>
        </div>
    );
};

export default InstallPwaSnackbar;