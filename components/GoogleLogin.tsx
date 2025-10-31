import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { authStore } from '../stores/AuthStore';
import { handleSignIn, handleSignOut } from '../services/authService';
import { t } from '../i18n';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

const GoogleLogin: React.FC = observer(() => {
    
    if (!CLIENT_ID) {
        return (
            <button
                className="bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 font-semibold px-4 py-2 rounded-full shadow-md cursor-not-allowed flex items-center"
                disabled
                title={t('syncDisabled')}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                <span>{t('signIn')}</span>
            </button>
        );
    }

    if (authStore.isLoggedIn && authStore.userProfile) {
        return (
            <div className="flex flex-col items-start gap-4">
                <div className="flex items-center gap-3">
                     <img
                        src={authStore.userProfile.picture}
                        alt={authStore.userProfile.name}
                        className="h-12 w-12 rounded-full"
                    />
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{authStore.userProfile.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{authStore.userProfile.email}</p>
                    </div>
                </div>
                <button
                    onClick={handleSignOut}
                    title={t('signOutTitle')}
                    className="w-full text-left bg-transparent hover:bg-violet-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold px-4 py-3 rounded-lg transition-colors flex items-center"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                    <span>{t('signOut')}</span>
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center">
            <button
                onClick={handleSignIn}
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
    );
});

export default GoogleLogin;