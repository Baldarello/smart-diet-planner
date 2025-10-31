import React, { useState, useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { nutritionistStore } from '../../stores/NutritionistStore';
import { t } from '../../i18n';
import { DownloadIcon, TrashIcon, EditIcon, ViewIcon, UploadIcon, MoreVertIcon } from '../Icons';
import { NutritionistPlan } from '../../types';
import { uiStore } from '../../stores/UIStore';
import ConfirmationModal from '../ConfirmationModal';
import SkeletonLoader from '../SkeletonLoader';
import DownloadPlanModal from './DownloadPlanModal';

interface PlanLibraryPageProps {
    onEdit: (plan: NutritionistPlan) => void;
    onView: (plan: NutritionistPlan) => void;
}

const PlanLibraryPage: React.FC<PlanLibraryPageProps> = observer(({ onEdit, onView }) => {
    const { plans, status, deletePlan, addPlan } = nutritionistStore;
    const [deletingPlan, setDeletingPlan] = useState<NutritionistPlan | null>(null);
    const [downloadingPlan, setDownloadingPlan] = useState<NutritionistPlan | null>(null);
    const [selectedPlans, setSelectedPlans] = useState<Set<number>>(new Set());
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [actionsMenuPlanId, setActionsMenuPlanId] = useState<number | null>(null);
    const actionsMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
                setActionsMenuPlanId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [actionsMenuRef]);

    const handleDeleteConfirm = () => {
        if (deletingPlan && deletingPlan.id) {
            deletePlan(deletingPlan.id);
        }
        setDeletingPlan(null);
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            try {
                const data = JSON.parse(text);

                const importPlans = async (planData: any) => {
                    if (!planData.planName || !planData.weeklyPlan || !planData.shoppingList) {
                        throw new Error('Invalid plan format. Required properties: planName, weeklyPlan, shoppingList.');
                    }
                    await addPlan(planData);
                };

                if (Array.isArray(data)) {
                    let importedCount = 0;
                    for (const plan of data) {
                        try {
                           await importPlans(plan);
                           importedCount++;
                        } catch (err) {
                            console.warn('Skipping invalid plan object in array:', plan, err);
                        }
                    }
                    uiStore.showInfoModal(t('importSuccessTitle'), `${importedCount} plans imported successfully!`);
                } else {
                    await importPlans(data);
                    uiStore.showInfoModal(t('importSuccessTitle'), 'Plan imported successfully!');
                }

            } catch (error) {
                console.error("Failed to import plan:", error);
                uiStore.showInfoModal(t('errorOccurred'), `Failed to import plan: ${error instanceof Error ? error.message : 'Invalid file'}`);
            } finally {
                if (event.target) {
                    event.target.value = '';
                }
            }
        };
        reader.readAsText(file);
    };

    const handleExportSelected = () => {
        if (selectedPlans.size === 0) return;
        const plansToExport = plans
            .filter(plan => plan.id && selectedPlans.has(plan.id))
            .map(plan => plan.planData);
        
        const jsonString = JSON.stringify(plansToExport.length === 1 ? plansToExport[0] : plansToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lifepulse_exported_plans_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const toggleSelection = (planId: number) => {
        setSelectedPlans(prev => {
            const newSet = new Set(prev);
            if (newSet.has(planId)) {
                newSet.delete(planId);
            } else {
                newSet.add(planId);
            }
            return newSet;
        });
    };

    if (status === 'loading') {
        return <div className="space-y-4"><SkeletonLoader className="h-24 w-full" /><SkeletonLoader className="h-24 w-full" /></div>;
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg max-w-4xl mx-auto">
             <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".json"
                onChange={handleFileImport}
            />
            {deletingPlan && (
                <ConfirmationModal
                    isOpen={!!deletingPlan}
                    onClose={() => setDeletingPlan(null)}
                    onConfirm={handleDeleteConfirm}
                    title={t('deletePlanConfirmationTitle')}
                >
                    <p>{t('deletePlanConfirmationMessage')}</p>
                </ConfirmationModal>
            )}
            {downloadingPlan && <DownloadPlanModal plan={downloadingPlan} onClose={() => setDownloadingPlan(null)} />}
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">{t('planLibraryTab')}</h3>
             <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-6 border-b dark:border-gray-700 pb-4">
                <button
                    onClick={handleImportClick}
                    className="flex items-center gap-2 bg-blue-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-blue-600 transition-colors text-sm"
                >
                    <UploadIcon /> {t('importJSON')}
                </button>
                <button
                    onClick={handleExportSelected}
                    disabled={selectedPlans.size === 0}
                    className="flex items-center gap-2 bg-green-500 text-white font-semibold px-4 py-2 rounded-md hover:bg-green-600 transition-colors text-sm disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    <DownloadIcon /> {t('exportJSON')} ({selectedPlans.size})
                </button>
            </div>
            
            {plans.length === 0 ? (
                 <div className="text-center py-16">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">{t('noPlansInLibrary')}</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">{t('noPlansInLibrarySubtitle')}</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {plans.map(plan => {
                        const date = new Date(plan.creationDate);
                        const formattedDate = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
                        return (
                            <div key={plan.id} className="bg-slate-50 dark:bg-gray-700/50 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div className="flex items-center flex-grow">
                                    <input
                                        type="checkbox"
                                        checked={!!plan.id && selectedPlans.has(plan.id)}
                                        onChange={() => plan.id && toggleSelection(plan.id)}
                                        className="h-5 w-5 rounded border-gray-300 dark:border-gray-500 text-violet-600 focus:ring-violet-500 cursor-pointer mr-4 flex-shrink-0"
                                        aria-labelledby={`plan-name-${plan.id}`}
                                    />
                                    <div className="min-w-0">
                                        <p id={`plan-name-${plan.id}`} className="font-bold text-lg text-gray-800 dark:text-gray-200 truncate">{plan.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('createdOn')} {formattedDate}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-end sm:self-center flex-wrap justify-end">
                                    <div className="relative flex-shrink-0">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setActionsMenuPlanId(plan.id === actionsMenuPlanId ? null : plan.id!);
                                            }}
                                            className="p-2 rounded-full text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/50 hover:bg-green-200 dark:hover:bg-green-800"
                                            title="Azioni"
                                        >
                                            <MoreVertIcon />
                                        </button>
                                        {actionsMenuPlanId === plan.id && (
                                            <div
                                                ref={actionsMenuRef}
                                                className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg z-20 border dark:border-gray-700 animate-slide-in-up"
                                                style={{ animationDuration: '0.2s' }}
                                            >
                                                <div className="py-1">
                                                    <button onClick={() => { onView(plan); setActionsMenuPlanId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"><ViewIcon /> {t('view')}</button>
                                                    <button onClick={() => { onEdit(plan); setActionsMenuPlanId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"><EditIcon /> {t('edit')}</button>
                                                    <button onClick={() => { setDownloadingPlan(plan); setActionsMenuPlanId(null); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3"><DownloadIcon /> {t('download')}</button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => setDeletingPlan(plan)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-gray-600 rounded-full" title={t('delete')}><TrashIcon /></button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
});

export default PlanLibraryPage;