import React from 'react';
import { handleSignIn } from '../services/authService';
import { t } from '../i18n';
import { CloseIcon } from './Icons';

interface LoginSuggestionModalProps {
    onClose: () => void;
}

const LoginSuggestionModal: React.FC<LoginSuggestionModalProps> = ({ onClose }) => {
    const handleLogin = () => {
        handleSignIn();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 animate-slide-in-up relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    aria-label={t('cancel')}
                >
                    <CloseIcon />
                </button>
                <div className="text-center">
                     <h1 id="modal-title" className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600 mb-2">{t('mainTitle')}</h1>
                     <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4">{t('loginSuggestionTitle')}</h2>
                     <p className="text-gray-600 dark:text-gray-400 mb-6">{t('loginSuggestionMessage')}</p>
                </div>
                
                <div className="flex flex-col gap-4">
                     <button
                        onClick={handleLogin}
                        className="w-full bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold px-4 py-3 rounded-lg shadow-sm hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors flex items-center justify-center border dark:border-gray-600"
                        title={t('signInTitle')}
                    >
                       <svg className="w-5 h-5 mr-3" viewBox="0 0 48 48">
                            <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                            <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6.02C43.51 38.62 46.98 32.23 46.98 24.55z"></path>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                            <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.82l-7.73-6.02c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                            <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                        <span>{t('signIn')}</span>
                    </button>
                    <button onClick={onClose} className="text-sm text-gray-500 dark:text-gray-400 hover:underline">
                        {t('continueWithoutLogin')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LoginSuggestionModal;
