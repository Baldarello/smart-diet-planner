import React, { useState, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { patientStore } from '../../stores/PatientStore';
import { nutritionistStore } from '../../stores/NutritionistStore';
import { t } from '../../i18n';
import { Patient, AssignedPlan } from '../../types';
import { PlusCircleIcon, TrashIcon, CheckIcon, CloseIcon, EditIcon, DownloadIcon, ShareIcon } from '../Icons';
import SkeletonLoader from '../SkeletonLoader';
import ConfirmationModal from '../ConfirmationModal';
import AssignPlanModal from './AssignPlanModal';
import { uploadAndShareFile } from '../../services/driveService';
import { handleSignIn } from '../../services/authService';
import { authStore } from '../../stores/AuthStore';
import { uiStore } from '../../stores/UIStore';
import ShareLinkModal from '../ShareLinkModal';

interface PatientManagementProps {
    onCreatePlanForPatient: (patient: Patient) => void;
    onEditAssignedPlan: (assignedPlan: AssignedPlan) => void;
}

const PatientManagement: React.FC<PatientManagementProps> = observer(({ onCreatePlanForPatient, onEditAssignedPlan }) => {
    const { patients, status, addPatient, deletePatient, unassignPlan, assignedPlans } = patientStore;
    const { plans: nutritionistPlans } = nutritionistStore;
    
    const [showAddForm, setShowAddForm] = useState(false);
    const [newPatient, setNewPatient] = useState({ firstName: '', lastName: '' });
    const [deletingPatient, setDeletingPatient] = useState<Patient | null>(null);
    const [assigningPlanPatient, setAssigningPlanPatient] = useState<Patient | null>(null);
    const [unassigningPlan, setUnassigningPlan] = useState<AssignedPlan | null>(null);
    const [sharingPlan, setSharingPlan] = useState<AssignedPlan | null>(null);
    const [shareUrl, setShareUrl] = useState<string | null>(null);

    const planMap = useMemo(() => new Map(nutritionistPlans.map(p => [p.id, p.name])), [nutritionistPlans]);

    const assignedPlansByPatient = useMemo(() => {
        const map = new Map<number, AssignedPlan[]>();
        assignedPlans.forEach(plan => {
            if (!map.has(plan.patientId)) {
                map.set(plan.patientId, []);
            }
            map.get(plan.patientId)!.push(plan);
        });
        return map;
    }, [assignedPlans]);

    const handleAddPatient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPatient.firstName.trim() && newPatient.lastName.trim()) {
            await addPatient(newPatient);
            setNewPatient({ firstName: '', lastName: '' });
            setShowAddForm(false);
        }
    };

    const confirmUnassign = () => {
        if (unassigningPlan) {
            unassignPlan(unassigningPlan.id!);
        }
        setUnassigningPlan(null);
    };

    const handleExportAssignedPlan = (plan: AssignedPlan) => {
        const dataToExport = {
            ...plan.planData,
            startDate: plan.startDate,
            endDate: plan.endDate,
        };
        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safePlanName = plan.planData.planName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `diet-plan-${safePlanName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleShare = async (plan: AssignedPlan) => {
        const shareAction = async () => {
            if (!authStore.accessToken) {
                uiStore.showInfoModal(t('sessionErrorTitle'), t('sessionErrorMessage'));
                return;
            }
            setSharingPlan(plan);
            try {
                const dataToExport = {
                    ...plan.planData,
                    startDate: plan.startDate,
                    endDate: plan.endDate,
                };
                const driveUrl = await uploadAndShareFile(dataToExport, plan.planData.planName, authStore.accessToken);
                const baseUrl = `${window.location.origin}`;
                const url = `${baseUrl}/?plan_id=${encodeURIComponent(driveUrl!)}`;

                setShareUrl(url);
            } catch (error) {
                console.error("Error during plan sharing:", error);
                uiStore.showInfoModal(t('sharePlanErrorTitle'), t('sharePlanErrorMessage', { error: error instanceof Error ? error.message : String(error) }));
            } finally {
                setSharingPlan(null);
            }
        };

        if (!authStore.isLoggedIn) {
            authStore.setLoginRedirectAction(() => shareAction());
            handleSignIn();
        } else {
            await shareAction();
        }
    };

    if (status === 'loading') {
        return <SkeletonLoader className="h-64 w-full" />;
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg max-w-4xl mx-auto">
            {assigningPlanPatient && <AssignPlanModal patient={assigningPlanPatient} onClose={() => setAssigningPlanPatient(null)} onAssign={() => setAssigningPlanPatient(null)} />}
            {shareUrl && <ShareLinkModal url={shareUrl} onClose={() => setShareUrl(null)} />}
            {deletingPatient && (
                <ConfirmationModal isOpen={!!deletingPatient} onClose={() => setDeletingPatient(null)} onConfirm={() => { deletePatient(deletingPatient!.id!); setDeletingPatient(null); }} title={t('deletePatientConfirmationTitle')}>
                    <p>{t('deletePatientConfirmationMessage')}</p>
                </ConfirmationModal>
            )}
            {unassigningPlan && (
                 <ConfirmationModal isOpen={!!unassigningPlan} onClose={() => setUnassigningPlan(null)} onConfirm={confirmUnassign} title={t('unassignPlanConfirmationTitle')}>
                    <p>{t('unassignPlanConfirmationMessage')}</p>
                </ConfirmationModal>
            )}

            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">{t('managePatientsTab')}</h3>
            
            <div className="mb-6">
                {showAddForm ? (
                    <form onSubmit={handleAddPatient} className="p-4 bg-slate-50 dark:bg-gray-700/50 rounded-lg flex flex-col sm:flex-row items-center gap-4">
                        <input type="text" value={newPatient.firstName} onChange={e => setNewPatient({...newPatient, firstName: e.target.value})} placeholder={t('firstNameLabel')} required className="flex-grow px-3 py-2 bg-white dark:bg-gray-700 border rounded-md" />
                        <input type="text" value={newPatient.lastName} onChange={e => setNewPatient({...newPatient, lastName: e.target.value})} placeholder={t('lastNameLabel')} required className="flex-grow px-3 py-2 bg-white dark:bg-gray-700 border rounded-md" />
                        <div className="flex gap-2">
                            <button type="submit" className="p-2 text-green-500 rounded-full hover:bg-green-100"><CheckIcon /></button>
                            <button type="button" onClick={() => setShowAddForm(false)} className="p-2 text-red-500 rounded-full hover:bg-red-100"><CloseIcon /></button>
                        </div>
                    </form>
                ) : (
                    <button onClick={() => setShowAddForm(true)} className="bg-violet-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-violet-700 flex items-center gap-2">
                        <PlusCircleIcon /> {t('addPatient')}
                    </button>
                )}
            </div>

            {patients.length > 0 ? (
                <div className="space-y-3">
                    {patients.map(patient => {
                        const patientPlans = (assignedPlansByPatient.get(patient.id!) || []).slice().sort((a, b) => a.startDate.localeCompare(b.startDate));
                        return (
                            <div key={patient.id} className="bg-slate-50 dark:bg-gray-700/50 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <p className="font-bold text-lg text-gray-800 dark:text-gray-200">{patient.lastName}, {patient.firstName}</p>
                                    <div className="mt-2 space-y-2">
                                        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400">{t('assignedPlan')}</h4>
                                        {patientPlans.length > 0 ? (
                                            patientPlans.map(plan => (
                                                <div key={plan.id} className="bg-slate-100 dark:bg-gray-600 p-2 rounded-md flex justify-between items-center gap-2">
                                                    <div>
                                                        <p className="font-medium text-gray-800 dark:text-gray-200">{plan.planData.planName}</p>
                                                        <p className="text-xs text-gray-500 dark:text-gray-400">{plan.startDate} - {plan.endDate}</p>
                                                    </div>
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        <button onClick={() => onEditAssignedPlan(plan)} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-gray-500" title={t('edit')}><EditIcon /></button>
                                                        <button onClick={() => handleExportAssignedPlan(plan)} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-gray-500" title={t('download')}><DownloadIcon /></button>
                                                        <button onClick={() => handleShare(plan)} disabled={!!sharingPlan} className="p-1.5 rounded-full text-green-600 dark:text-green-400 hover:bg-slate-200 dark:hover:bg-gray-500 disabled:opacity-50" title={t('sharePlan')}>
                                                            {sharingPlan?.id === plan.id ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current"></div> : <ShareIcon />}
                                                        </button>
                                                        <button onClick={() => setUnassigningPlan(plan)} className="p-1.5 rounded-full text-yellow-600 dark:text-yellow-400 hover:bg-slate-200 dark:hover:bg-gray-500" title={t('unassignPlan')}><CloseIcon /></button>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm italic text-gray-500 dark:text-gray-400">{t('noPlanAssigned')}</p>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-center flex-wrap">
                                    <button onClick={() => onCreatePlanForPatient(patient)} className="text-sm bg-blue-500 text-white font-semibold px-3 py-1.5 rounded-full hover:bg-blue-600">{t('createPersonalizedPlan')}</button>
                                    <button onClick={() => setAssigningPlanPatient(patient)} className="text-sm bg-green-500 text-white font-semibold px-3 py-1.5 rounded-full hover:bg-green-600">{t('assignExistingPlan')}</button>
                                    <button onClick={() => setDeletingPatient(patient)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-gray-900 rounded-full"><TrashIcon /></button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                    <p className="text-lg font-semibold text-gray-500">{t('noPatientsInLibrary')}</p>
                    <p className="text-sm text-gray-400 mt-2">{t('noPatientsInLibrarySubtitle')}</p>
                </div>
            )}
        </div>
    );
});

export default PatientManagement;