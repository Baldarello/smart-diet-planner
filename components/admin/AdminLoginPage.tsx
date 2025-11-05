import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { authStore } from '../../stores/AuthStore';
import { handleSignIn } from '../../services/authService';
import { t } from '../../i18n';
import { ArrowLeftIcon } from '../Icons';

interface AdminLoginPageProps {
    onLoginSuccess: () => void;
}

const AdminLoginPage: React.FC<AdminLoginPageProps> = observer(({ onLoginSuccess }) => {
    
    useEffect(() => {
        if (authStore.isLoggedIn && authStore.loginMode === 'nutritionist') {
            onLoginSuccess();
        }
    }, [authStore.isLoggedIn, authStore.loginMode, onLoginSuccess]);
    
    const handleAdminGoogleLogin = () => {
        authStore.setLoginMode('nutritionist');
        handleSignIn();
    };

    const handleGoBack = () => {
        window.history.pushState({}, '', '/');
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-900 p-4">
            <div className="w-full max-w-md">
                <div className="relative bg-white dark:bg-gray-800 shadow-2xl rounded-2xl p-8">
                    <button
                        onClick={handleGoBack}
                        className="absolute top-4 left-4 p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                        aria-label="Go back to home"
                    >
                        <ArrowLeftIcon />
                    </button>
                    <h1 className="text-2xl font-bold text-center text-gray-800 dark:text-gray-200 mb-2">{t('adminLoginTitle')}</h1>
                    <p className="text-center text-gray-500 dark:text-gray-400 mb-8">{t('mainTitle')}</p>
                    
                     <button
                        onClick={handleAdminGoogleLogin}
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
                </div>
            </div>
        </div>
    );
});

export default AdminLoginPage;