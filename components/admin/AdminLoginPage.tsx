import React, { useState } from 'react';
import { t } from '../../i18n';
import { ViewIcon, ViewOffIcon, ArrowLeftIcon } from '../Icons';

interface AdminLoginPageProps {
    onLoginSuccess: () => void;
}

const AdminLoginPage: React.FC<AdminLoginPageProps> = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (username === 'admin' && password === 'password') {
            setError('');
            onLoginSuccess();
        } else {
            setError(t('invalidCredentialsError'));
        }
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
                     <p className="text-center text-gray-500 dark:text-gray-400 mb-6">{t('mainTitle')}</p>
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('usernameLabel')}
                            </label>
                            <div className="mt-1">
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    autoComplete="username"
                                    required
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm bg-slate-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password"className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                {t('passwordLabel')}
                            </label>
                            <div className="mt-1 relative">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? 'text' : 'password'}
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="appearance-none block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-violet-500 focus:border-violet-500 sm:text-sm bg-slate-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                    aria-label={t(showPassword ? 'hidePassword' : 'showPassword')}
                                >
                                    {showPassword ? <ViewOffIcon /> : <ViewIcon />}
                                </button>
                            </div>
                        </div>
                        
                        {error && <p className="text-red-500 text-sm font-semibold text-center">{error}</p>}

                        <div>
                            <button
                                type="submit"
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-lg text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 transition-colors"
                            >
                                {t('loginButton')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AdminLoginPage;