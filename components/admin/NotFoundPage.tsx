import React from 'react';
import { t } from '../../i18n';

const NotFoundPage: React.FC = () => {
    const handleNavigateToDashboard = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        window.history.pushState({}, '', '/dashboard');
        window.dispatchEvent(new PopStateEvent('popstate'));
    };
    
    return (
        <div className="min-h-screen flex items-center justify-center text-center p-4">
            <div>
                <h1 className="text-6xl font-extrabold text-violet-600">404</h1>
                <h2 className="mt-2 text-3xl font-bold text-gray-800 dark:text-gray-200">{t('notFoundTitle')}</h2>
                <p className="mt-4 text-gray-500 dark:text-gray-400">{t('notFoundMessage')}</p>
                <a 
                    href="/dashboard"
                    onClick={handleNavigateToDashboard}
                    className="mt-6 inline-block bg-violet-600 text-white font-semibold px-6 py-3 rounded-full hover:bg-violet-700 transition-colors shadow-lg"
                >
                    Go to Dashboard
                </a>
            </div>
        </div>
    );
};

export default NotFoundPage;