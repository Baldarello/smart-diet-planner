import React, { useState, useMemo, useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { patientStore } from '../../stores/PatientStore';
import { nutritionistStore } from '../../stores/NutritionistStore';
import { t } from '../../i18n';
import { Patient, AssignedPlan, NutritionistPlan } from '../../types';
import { PlusCircleIcon, TrashIcon, CheckIcon, CloseIcon, EditIcon, DownloadIcon, ShareIcon, BodyIcon, ProgressIcon, SettingsIcon, MoreVertIcon } from '../Icons';
import SkeletonLoader from '../SkeletonLoader';
import ConfirmationModal from '../ConfirmationModal';
import AssignPlanModal from './AssignPlanModal';
import { uploadAndShareFile, getOrCreateFolderId } from '../../services/driveService';
import { handleSignIn } from '../../services/authService';
import { authStore } from '../../stores/AuthStore';
import { uiStore } from '../../stores/UIStore';
import ShareLinkModal from '../ShareLinkModal';
import BodyDataModal from './BodyDataModal';
import PatientSettingsModal from './PatientSettingsModal';
import PatientProgressModal from './PatientProgressModal';
import DietHistoryModal from './DietHistoryModal';
import DownloadPlanModal from './DownloadPlanModal';

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
    const [editingBodyDataPatient, setEditingBodyDataPatient] = useState<Patient | null>(null);
    const [editingSettingsPatient, setEditingSettingsPatient] = useState<Patient | null>(null);
    const [viewingProgressPatient, setViewingProgressPatient] = useState<Patient | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingHistoryForPatient, setViewingHistoryForPatient] = useState<Patient | null>(null);
    const [downloadingPlan, setDownloadingPlan] = useState<AssignedPlan | null>(null);
    const [actionsMenuPatientId, setActionsMenuPatientId] = useState<number | null>(null);
    const actionsMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
                setActionsMenuPatientId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [actionsMenuRef]);


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
    
    const filteredPatients = useMemo(() => {
        if (!searchTerm) return patients;
        return patients.filter(p => 
            p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.lastName.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [patients, searchTerm]);


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

    const handleShare = async (plan: AssignedPlan) => {
        const shareAction = async () => {
            if (!authStore.accessToken) {
                uiStore.showInfoModal(t('sessionErrorTitle'), t('sessionErrorMessage'));
                return;
            }
            setSharingPlan(plan);
            try {
                const patient = patientStore.patients.find(p => p.id === plan.patientId);
                const dataToExport = {
                    ...plan.planData,
                    startDate: plan.startDate,
                    endDate: plan.endDate,
                    showBodyMetricsInApp: patient?.showBodyMetricsInApp,
                    stepGoal: patient?.stepGoal,
                    hydrationGoalLiters: patient?.hydrationGoalLiters,
                };
                const lifePulseFolderId = await getOrCreateFolderId(authStore.accessToken, 'LifePulse');
                const sharedFolderId = await getOrCreateFolderId(authStore.accessToken, 'Shared', lifePulseFolderId);
                const driveUrl = await uploadAndShareFile(dataToExport, plan.planData.planName, authStore.accessToken, sharedFolderId);
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

    const allPlansForHistory = viewingHistoryForPatient ? (assignedPlansByPatient.get(viewingHistoryForPatient.id!) || []).slice().sort((a, b) => b.startDate.localeCompare(a.startDate)) : [];

    return (
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg max-w-6xl mx-auto">
             {assigningPlanPatient && <AssignPlanModal patient={assigningPlanPatient} onClose={() => setAssigningPlanPatient(null)} onAssign={() => setAssigningPlanPatient(null)} />}
             {shareUrl && <ShareLinkModal url={shareUrl} onClose={() => setShareUrl(null)} />}
             {editingSettingsPatient && <PatientSettingsModal patient={editingSettingsPatient} onClose={() => setEditingSettingsPatient(null)} />}
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
             {editingBodyDataPatient && <BodyDataModal patient={editingBodyDataPatient} onClose={() => setEditingBodyDataPatient(null)} />}
             {viewingProgressPatient && <PatientProgressModal patient={viewingProgressPatient} onClose={() => setViewingProgressPatient(null)} />}
             {viewingHistoryForPatient && (
                <DietHistoryModal
                    patient={viewingHistoryForPatient}
                    plans={allPlansForHistory}
                    onClose={() => setViewingHistoryForPatient(null)}
                    onEdit={(plan) => { onEditAssignedPlan(plan); setViewingHistoryForPatient(null); }}
                    onDownload={(plan) => setDownloadingPlan(plan)}
                    onShare={(plan) => handleShare(plan)}
                    onUnassign={(plan) => setUnassigningPlan(plan)}
                />
             )}
             {downloadingPlan && <DownloadPlanModal plan={downloadingPlan} onClose={() => setDownloadingPlan(null)} />}


            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">{t('managePatientsTab')}</h3>
            
            <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {showAddForm ? (
                    <form onSubmit={handleAddPatient} className="p-4 bg-slate-50 dark:bg-gray-700/50 rounded-lg flex flex-col sm:flex-row items-center gap-4 sm:col-span-2">
                        <input type="text" value={newPatient.firstName} onChange={e => setNewPatient({...newPatient, firstName: e.target.value})} placeholder={t('firstNameLabel')} required className="flex-grow px-3 py-2 bg-white dark:bg-gray-700 border rounded-md w-full" />
                        <input type="text" value={newPatient.lastName} onChange={e => setNewPatient({...newPatient, lastName: e.target.value})} placeholder={t('lastNameLabel')} required className="flex-grow px-3 py-2 bg-white dark:bg-gray-700 border rounded-md w-full" />
                        <div className="flex gap-2">
                            <button type="submit" className="p-2 text-green-500 rounded-full hover:bg-green-100"><CheckIcon /></button>
                            <button type="button" onClick={() => setShowAddForm(false)} className="p-2 text-red-500 rounded-full hover:bg-red-100"><CloseIcon /></button>
                        </div>
                    </form>
                ) : (
                    <button onClick={() => setShowAddForm(true)} className="bg-violet-600 text-white font-semibold px-4 py-2 rounded-md hover:bg-violet-700 flex items-center gap-2 justify-center">
                        <PlusCircleIcon /> {t('addPatient')}
                    </button>
                )}
                <input
                    type="text"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder={t('searchPatientsPlaceholder')}
                    className="px-3 py-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-violet-500 focus:border-violet-500"
                />
            </div>

            {filteredPatients.length > 0 ? (
                <div className="space-y-4">
                    {filteredPatients.map(patient => {
                        const patientPlans = (assignedPlansByPatient.get(patient.id!) || []).slice().sort((a, b) => b.startDate.localeCompare(a.startDate));
                        const hasMoreThanTwoPlans = patientPlans.length > 2;
                        const displayedPlans = hasMoreThanTwoPlans ? patientPlans.slice(0, 2) : patientPlans;
                        return (
                            <div key={patient.id} className="bg-slate-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="font-bold text-lg text-gray-800 dark:text-gray-200">{patient.lastName}, {patient.firstName}</p>
                                    <div className="relative flex-shrink-0">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActionsMenuPatientId(patient.id === actionsMenuPatientId ? null : patient.id!);
                                            }}
                                            className="p-2 rounded-full text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 hover:bg-green-200 dark:hover:bg-green-800"
                                            title="Azioni"
                                        >
                                            <MoreVertIcon />
                                        </button>
                                        {actionsMenuPatientId === patient.id && (
                                            <div
                                                ref={actionsMenuRef}
                                                className="absolute top-full right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-20 border dark:border-gray-700 animate-slide-in-up"
                                                style={{ animationDuration: '0.2s' }}
                                            >
                                                <div className="py-1">
                                                    <button onClick={() => { setViewingProgressPatient(patient); setActionsMenuPatientId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"><ProgressIcon /> {t('tabProgress')}</button>
                                                    <button onClick={() => { setEditingBodyDataPatient(patient); setActionsMenuPatientId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"><BodyIcon /> {t('bodyDataButton')}</button>
                                                    <button onClick={() => { setEditingSettingsPatient(patient); setActionsMenuPatientId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"><SettingsIcon /> {t('settingsButton')}</button>
                                                    <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                                    <button onClick={() => { onCreatePlanForPatient(patient); setActionsMenuPatientId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"><PlusCircleIcon /> {t('createPersonalizedPlan')}</button>
                                                    <button onClick={() => { setAssigningPlanPatient(patient); setActionsMenuPatientId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"><CheckIcon /> {t('assignExistingPlan')}</button>
                                                    <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                                                    <button onClick={() => { setDeletingPatient(patient); setActionsMenuPatientId(null); }} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 flex items-center gap-3"><TrashIcon /> {t('delete')}</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-4">
                                        <h4 className="text-sm font-semibold text-gray-600 dark:text-gray-400">{t('assignedPlan')}</h4>
                                        {hasMoreThanTwoPlans && (
                                            <button onClick={() => setViewingHistoryForPatient(patient)} className="text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline">
                                                {t('viewHistory')} ({patientPlans.length})
                                            </button>
                                        )}
                                    </div>
                                    {displayedPlans.length > 0 ? (
                                        displayedPlans.map(plan => (
                                            <div key={plan.id} className="bg-slate-100 dark:bg-gray-600 p-2 rounded-md flex justify-between items-center gap-2">
                                                <div>
                                                    <p className="font-medium text-gray-800 dark:text-gray-200">{plan.planData.planName}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">{plan.startDate} - {plan.endDate}</p>
                                                </div>
                                                <div className="flex items-center gap-1 flex-shrink-0">
                                                    <button onClick={() => onEditAssignedPlan(plan)} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-gray-500" title={t('edit')}><EditIcon /></button>
                                                    <button onClick={() => setDownloadingPlan(plan)} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-gray-500" title={t('download')}><DownloadIcon /></button>
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