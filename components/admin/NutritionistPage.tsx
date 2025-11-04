import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import ManualPlanEntryForm from './ManualPlanEntryForm';
import IngredientsManagement from './IngredientsManagement';
import PlanLibraryPage from './PlanLibraryPage';
import ViewPlanModal from './ViewPlanModal';
import RecipesManagement from './RecipesManagement';
import { t } from '../../i18n';
import { initGoogleAuth, handleSignOut } from '../../services/authService';
import { NutritionistPlan, Patient, AssignedPlan } from '../../types';
import PatientManagement from './PatientManagement';
import { patientStore } from '../../stores/PatientStore';
import { uiStore } from '../../stores/UIStore';
import PdfSettingsPage from './PdfSettingsPage';
import SyncStatusIndicator from './SyncStatusIndicator';

interface NutritionistPageProps {
    onLogout: () => void;
}

type NutritionistTab = 'plan' | 'patients' | 'library' | 'ingredients' | 'recipes' | 'pdfSettings';

const NutritionistPage: React.FC<NutritionistPageProps> = observer(({ onLogout }) => {
    const [activeTab, setActiveTab] = useState<NutritionistTab>('patients');
    const [planToEdit, setPlanToEdit] = useState<NutritionistPlan | AssignedPlan | null>(null);
    const [viewingPlan, setViewingPlan] = useState<NutritionistPlan | null>(null);
    const [creatingPlanForPatient, setCreatingPlanForPatient] = useState<Patient | null>(null);
    const [isPlanFormDirty, setIsPlanFormDirty] = useState(false);

    useEffect(() => {
        initGoogleAuth();
    }, []);

    // When switching away from the 'plan' tab, clear any plan being edited or created for a patient
    useEffect(() => {
        if (activeTab !== 'plan') {
            setPlanToEdit(null);
            setCreatingPlanForPatient(null);
        }
    }, [activeTab]);
    
    const handleEditPlan = (plan: NutritionistPlan) => {
        setPlanToEdit(plan);
        setActiveTab('plan');
    };
    
    const handleEditAssignedPlan = (assignedPlan: AssignedPlan) => {
        setPlanToEdit(assignedPlan);
        setActiveTab('plan');
    };

    const handleViewPlan = (plan: NutritionistPlan) => {
        setViewingPlan(plan);
    };
    
    const handlePlanSaved = async (planId?: number) => {
        if (creatingPlanForPatient && planId) {
            // This is now handled inside AssignPlanModal, but we keep the tab switch
        }
        setCreatingPlanForPatient(null);
        setPlanToEdit(null);
        setIsPlanFormDirty(false); // Reset dirty state
        setActiveTab(creatingPlanForPatient ? 'patients' : 'library');
    };

    const handleCancelCreateOrEdit = () => {
        const fromPatients = !!creatingPlanForPatient;
        setPlanToEdit(null);
        setCreatingPlanForPatient(null);
        setIsPlanFormDirty(false); // Reset dirty state
        if (fromPatients) {
            setActiveTab('patients');
        } else {
            setActiveTab('library');
        }
    };
    
    const handleCreatePlanForPatient = (patient: Patient) => {
        setCreatingPlanForPatient(patient);
        setActiveTab('plan');
    };

    const handleTabChange = (tabId: NutritionistTab) => {
        if (activeTab === 'plan' && isPlanFormDirty && tabId !== 'plan') {
            uiStore.showConfirmationModal(
                t('unsavedChangesTitle'),
                t('unsavedChangesMessage'),
                () => {
                    setIsPlanFormDirty(false); // Acknowledge change and allow navigation
                    setActiveTab(tabId);
                }
            );
        } else {
            setActiveTab(tabId);
        }
    };

    const renderTabButton = (tabId: NutritionistTab, label: string) => (
        <button
            onClick={() => handleTabChange(tabId)}
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
                    <div className="flex items-center gap-4">
                        <SyncStatusIndicator />
                        <button onClick={onLogout} className="bg-red-500 text-white font-semibold px-4 py-2 rounded-lg hover:bg-red-600 transition-colors shadow-sm">
                            {t('logoutButton')}
                        </button>
                    </div>
                </div>
                <nav className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mb-px">
                    <div className="flex border-b border-gray-200 dark:border-gray-700">
                        {renderTabButton('plan', t('createPlanTab'))}
                        {renderTabButton('patients', t('managePatientsTab'))}
                        {renderTabButton('library', t('planLibraryTab'))}
                        {renderTabButton('ingredients', t('manageIngredientsTab'))}
                        {renderTabButton('recipes', t('manageRecipesTab'))}
                        {renderTabButton('pdfSettings', t('pdfSettingsTab'))}
                    </div>
                </nav>
            </header>
            <main className="py-8 px-4 sm:px-6 lg:px-8 bg-slate-50 dark:bg-gray-900">
                 {activeTab === 'plan' && (
                    <ManualPlanEntryForm
                        onCancel={handleCancelCreateOrEdit}
                        onPlanSaved={handlePlanSaved}
                        planToEdit={planToEdit}
                        patientForPlan={creatingPlanForPatient}
                        onDirtyStateChange={setIsPlanFormDirty}
                    />
                 )}
                 {activeTab === 'patients' && <PatientManagement onCreatePlanForPatient={handleCreatePlanForPatient} onEditAssignedPlan={handleEditAssignedPlan} />}
                 {activeTab === 'library' && <PlanLibraryPage onEdit={handleEditPlan} onView={handleViewPlan} />}
                 {activeTab === 'ingredients' && <IngredientsManagement />}
                 {activeTab === 'recipes' && <RecipesManagement />}
                 {activeTab === 'pdfSettings' && <PdfSettingsPage />}
            </main>
            {viewingPlan && <ViewPlanModal plan={viewingPlan} onClose={() => setViewingPlan(null)} />}
        </div>
    );
});

export default NutritionistPage;