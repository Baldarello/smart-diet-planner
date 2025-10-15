import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { nutritionistStore } from '../../stores/NutritionistStore';
import { t } from '../../i18n';
import { DownloadIcon, ShareIcon, TrashIcon, EditIcon, ViewIcon } from '../Icons';
import { NutritionistPlan } from '../../types';
import { uploadAndShareFile } from '../../services/driveService';
import { handleSignIn } from '../../services/authService';
import { authStore } from '../../stores/AuthStore';
import ShareLinkModal from '../ShareLinkModal';
import ConfirmationModal from '../ConfirmationModal';
import SkeletonLoader from '../SkeletonLoader';

// Utility to trigger download
const downloadPlan = (plan: NutritionistPlan) => {
    const jsonString = JSON.stringify(plan.planData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safePlanName = plan.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `diet-plan-${safePlanName}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

interface PlanLibraryPageProps {
    onEdit: (plan: NutritionistPlan) => void;
    onView: (plan: NutritionistPlan) => void;
}

const PlanLibraryPage: React.FC<PlanLibraryPageProps> = observer(({ onEdit, onView }) => {
    const { plans, status, deletePlan } = nutritionistStore;
    const [sharingPlan, setSharingPlan] = useState<NutritionistPlan | null>(null);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [deletingPlan, setDeletingPlan] = useState<NutritionistPlan | null>(null);

    const handleShare = async (plan: NutritionistPlan) => {
        const shareAction = async () => {
            if (!authStore.accessToken) {
                alert("Login session is not valid. Please log in again.");
                return;
            }
            setSharingPlan(plan);
            try {
                const fileId = await uploadAndShareFile(plan.planData, plan.name, authStore.accessToken);
                if (!fileId) throw new Error("Failed to get shareable file ID from Google Drive.");
                const baseUrl = `${window.location.origin}${window.location.pathname}`;
                const url = `${baseUrl}#/?plan_id=${encodeURIComponent(fileId)}`;

                setShareUrl(url);
            } catch (error) {
                console.error("Error during plan sharing:", error);
                alert(`An error occurred while sharing the plan: ${error instanceof Error ? error.message : String(error)}`);
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

    const handleDeleteConfirm = () => {
        if (deletingPlan && deletingPlan.id) {
            deletePlan(deletingPlan.id);
        }
        setDeletingPlan(null);
    };

    if (status === 'loading') {
        return <div className="space-y-4"><SkeletonLoader className="h-24 w-full" /><SkeletonLoader className="h-24 w-full" /></div>;
    }

    if (plans.length === 0) {
        return (
            <div className="text-center py-16">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-200">{t('noPlansInLibrary')}</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">{t('noPlansInLibrarySubtitle')}</p>
            </div>
        );
    }
    
    return (
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg max-w-4xl mx-auto">
            {shareUrl && <ShareLinkModal url={shareUrl} onClose={() => setShareUrl(null)} />}
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
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">{t('planLibraryTab')}</h3>
            <div className="space-y-4">
                {plans.map(plan => (
                    <div key={plan.id} className="bg-slate-50 dark:bg-gray-700/50 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <p className="font-bold text-lg text-gray-800 dark:text-gray-200">{plan.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{t('createdOn')} {new Date(plan.creationDate).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-center flex-wrap justify-end">
                            <button onClick={() => onView(plan)} className="flex items-center gap-2 bg-slate-500 text-white font-semibold px-4 py-2 rounded-full hover:bg-slate-600 transition-colors text-sm"><ViewIcon /> {t('view')}</button>
                            <button onClick={() => onEdit(plan)} className="flex items-center gap-2 bg-yellow-500 text-white font-semibold px-4 py-2 rounded-full hover:bg-yellow-600 transition-colors text-sm"><EditIcon /> {t('edit')}</button>
                            <button onClick={() => downloadPlan(plan)} className="flex items-center gap-2 bg-blue-500 text-white font-semibold px-4 py-2 rounded-full hover:bg-blue-600 transition-colors text-sm"><DownloadIcon /> {t('download')}</button>
                            <button onClick={() => handleShare(plan)} disabled={!!sharingPlan} className="flex items-center gap-2 bg-green-500 text-white font-semibold px-4 py-2 rounded-full hover:bg-green-600 transition-colors text-sm disabled:bg-green-300">
                                {sharingPlan?.id === plan.id ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <ShareIcon />}
                                {t('sharePlan')}
                            </button>
                            <button onClick={() => setDeletingPlan(plan)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-gray-600 rounded-full" title={t('delete')}><TrashIcon /></button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default PlanLibraryPage;