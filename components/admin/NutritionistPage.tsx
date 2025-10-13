import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ManualPlanEntryForm from '../ManualPlanEntryForm';
import IngredientsManagement from './IngredientsManagement';
import { t } from '../../i18n';

interface NutritionistPageProps {
    onLogout: () => void;
}

type NutritionistTab = 'plan' | 'ingredients';

const NutritionistPage: React.FC<NutritionistPageProps> = ({ onLogout }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<NutritionistTab>('plan');

    const handleLogout = () => {
        onLogout();
        navigate('/admin');
    };
    
    const renderTabButton = (tabId: NutritionistTab, label: string) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`px-4 py-2 font-semibold rounded-t-lg transition-colors ${activeTab === tabId ? 'bg-slate-50 dark:bg-gray-900 text-violet-600 dark:text-violet-400 border-b-2 border-transparent' : 'bg-transparent text-gray-500 dark:text-gray-400 hover:bg-slate-200/50 dark:hover:bg-gray-800/50'}`}
        >
            {label}
        </button>
    );

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-gray-900">
            <header className="bg-white dark:bg-gray-800 shadow-md sticky top-0 z-10">
                 <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200">{t('nutritionistPortalTitle')}</h1>
                    <button onClick={handleLogout} className="bg-red-500 text-white font-semibold px-4 py-2 rounded-lg hover:bg-red-600 transition-colors shadow-sm">
                        {t('logoutButton')}
                    </button>
                </div>
                <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mb-px">
                    <div className="flex border-b border-gray-200 dark:border-gray-700">
                        {renderTabButton('plan', t('createPlanTab'))}
                        {renderTabButton('ingredients', t('manageIngredientsTab'))}
                    </div>
                </nav>
            </header>
            <main className="py-8 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-gray-900">
                 {activeTab === 'plan' && <ManualPlanEntryForm onCancel={() => navigate(-1)} />}
                 {activeTab === 'ingredients' && <IngredientsManagement />}
            </main>
        </div>
    );
};

export default NutritionistPage;