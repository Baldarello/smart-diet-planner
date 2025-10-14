import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ManualPlanEntryForm from '../ManualPlanEntryForm';
import IngredientsManagement from './IngredientsManagement';
import PlanLibraryPage from './PlanLibraryPage';
import ViewPlanModal from './ViewPlanModal';
import { t } from '../../i18n';
import { initGoogleAuth } from '../../services/authService';
import { NutritionistPlan } from '../../types';

interface NutritionistPageProps {
    onLogout: () => void;
}

type NutritionistTab = 'plan' | 'ingredients' | 'library';

const NutritionistPage: React.FC<NutritionistPageProps> = ({ onLogout }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<NutritionistTab>('plan');
    const [planToEdit, setPlanToEdit] = useState<NutritionistPlan | null>(null);
    const [viewingPlan, setViewingPlan] = useState<NutritionistPlan | null>(null);

    useEffect(() => {
        initGoogleAuth();
    }, []);

    // When switching away from the 'plan' tab, clear any plan being edited
    useEffect(() => {
        if (activeTab !== 'plan') {
            setPlanToEdit(null);
        }
    }, [activeTab]);

    const handleLogout = () => {
        onLogout();
        navigate('/admin');
    };
    
    const handleEditPlan = (plan: NutritionistPlan) => {
        setPlanToEdit(plan);
        setActiveTab('plan');
    };

    const handleViewPlan = (plan: NutritionistPlan) => {
        setViewingPlan(plan);
    };
    
    const handlePlanSaved = () => {
        setPlanToEdit(null); // Clear the editing state
        setActiveTab('library'); // Switch to library to see the result
    };

    const handleCancelEdit = () => {
        setPlanToEdit(null);
        setActiveTab('library');
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
                        {renderTabButton('library', t('planLibraryTab'))}
                        {renderTabButton('ingredients', t('manageIngredientsTab'))}
                    </div>
                </nav>
            </header>
            <main className="py-8 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-gray-900">
                 {activeTab === 'plan' && (
                    <ManualPlanEntryForm
                        onCancel={handleCancelEdit}
                        onPlanSaved={handlePlanSaved}
                        planToEdit={planToEdit}
                    />
                 )}
                 {activeTab === 'library' && <PlanLibraryPage onEdit={handleEditPlan} onView={handleViewPlan} />}
                 {activeTab === 'ingredients' && <IngredientsManagement />}
            </main>
            {viewingPlan && <ViewPlanModal plan={viewingPlan} onClose={() => setViewingPlan(null)} />}
        </div>
    );
};

export default NutritionistPage;