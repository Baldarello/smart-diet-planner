import React from 'react';
import { useNavigate } from 'react-router-dom';
import ManualPlanEntryForm from '../ManualPlanEntryForm';
import { t } from '../../i18n';

interface NutritionistPageProps {
    onLogout: () => void;
}

const NutritionistPage: React.FC<NutritionistPageProps> = ({ onLogout }) => {
    const navigate = useNavigate();
    const handleLogout = () => {
        onLogout();
        navigate('/admin');
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow-md">
                 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">{t('nutritionistPortalTitle')}</h1>
                    <button onClick={handleLogout} className="bg-red-500 text-white font-semibold px-4 py-2 rounded-lg hover:bg-red-600 transition-colors shadow-sm">
                        {t('logoutButton')}
                    </button>
                </div>
            </header>
            <main className="py-8 px-4 sm:px-6 lg:px-8">
                 <ManualPlanEntryForm onCancel={() => navigate(-1)} />
            </main>
        </div>
    );
};

export default NutritionistPage;