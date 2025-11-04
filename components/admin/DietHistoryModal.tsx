import React from 'react';
import { Patient, AssignedPlan } from '../../types';
import { t } from '../../i18n';
import { CloseIcon, EditIcon, DownloadIcon, ShareIcon } from '../Icons';

interface DietHistoryModalProps {
    patient: Patient;
    plans: AssignedPlan[];
    onClose: () => void;
    onEdit: (plan: AssignedPlan) => void;
    onDownload: (plan: AssignedPlan) => void;
    onShare: (plan: AssignedPlan) => void;
    onUnassign: (plan: AssignedPlan) => void;
}

const DietHistoryModal: React.FC<DietHistoryModalProps> = ({ patient, plans, onClose, onEdit, onDownload, onShare, onUnassign }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">{t('dietHistoryModalTitle', { name: `${patient.firstName} ${patient.lastName}` })}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label={t('close')}>
                        <CloseIcon />
                    </button>
                </header>
                <main className="overflow-y-auto p-6">
                    <div className="space-y-3">
                        {plans.map(plan => (
                             <div key={plan.id} className="bg-slate-100 dark:bg-gray-700 p-3 rounded-md flex justify-between items-center gap-2">
                                <div>
                                    <p className="font-medium text-gray-800 dark:text-gray-200">{plan.planData.planName}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{plan.startDate} - {plan.endDate}</p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <button onClick={() => onEdit(plan)} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-gray-600" title={t('edit')}><EditIcon /></button>
                                    <button onClick={() => onDownload(plan)} className="p-1.5 rounded-full hover:bg-slate-200 dark:hover:bg-gray-600" title={t('download')}><DownloadIcon /></button>
                                    <button onClick={() => onShare(plan)} className="p-1.5 rounded-full text-green-600 dark:text-green-400 hover:bg-slate-200 dark:hover:bg-gray-600" title={t('sharePlan')}><ShareIcon /></button>
                                    <button onClick={() => onUnassign(plan)} className="p-1.5 rounded-full text-yellow-600 dark:text-yellow-400 hover:bg-slate-200 dark:hover:bg-gray-600" title={t('unassignPlan')}><CloseIcon /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DietHistoryModal;