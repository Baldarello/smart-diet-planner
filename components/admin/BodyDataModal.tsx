import React, { useState, useEffect, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { Patient, BodyMetrics, ProgressRecord } from '../../types';
import { t } from '../../i18n';
import { CloseIcon, TrashIcon, EditIcon } from '../Icons';
import { patientStore } from '../../stores/PatientStore';
import ConfirmationModal from '../ConfirmationModal';

interface BodyDataModalProps {
    patient: Patient;
    onClose: () => void;
}

const MetricInput: React.FC<{ label: string; unit: string; value: number | undefined; onChange: (value: string) => void; }> = 
({ label, unit, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <div className="mt-1 flex items-center">
            <input
                type="text"
                inputMode="decimal"
                value={value === undefined ? '' : String(value)}
                onChange={e => onChange(e.target.value)}
                className="flex-grow p-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-violet-500 focus:border-violet-500"
            />
            <span className="ml-2 font-semibold text-gray-500 dark:text-gray-400 w-6 text-left">{unit}</span>
        </div>
    </div>
);

const BodyDataModal: React.FC<BodyDataModalProps> = observer(({ patient, onClose }) => {
    const [bodyMetrics, setBodyMetrics] = useState<BodyMetrics>(patient.bodyMetrics || {});
    const [showInApp, setShowInApp] = useState(patient.showBodyMetricsInApp ?? true);
    const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [isSaving, setIsSaving] = useState(false);
    const [isDateFocused, setIsDateFocused] = useState(false);
    const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
    const [history, setHistory] = useState<ProgressRecord[]>([]);
    const [deletingRecord, setDeletingRecord] = useState<ProgressRecord | null>(null);
    const [editingRecord, setEditingRecord] = useState<ProgressRecord | null>(null);

    const fetchHistory = async () => {
        const historyData = await patientStore.getProgressHistoryForPatient(patient.id!);
        const relevantHistory = historyData.filter(h => h.weightKg !== undefined || h.bodyFatPercentage !== undefined);
        setHistory(relevantHistory.reverse()); // Show newest first
    };
    
    useEffect(() => {
        if (patient.id) {
            fetchHistory();
        }
    }, [patient.id]);

    const formattedDate = useMemo(() => {
        if (!date) return '';
        try {
            const [year, month, day] = date.split('-');
            return `${day}/${month}/${year}`;
        } catch (e) {
            return date; // fallback for wrong format
        }
    }, [date]);

    const handleMetricChange = (metric: keyof BodyMetrics, value: string) => {
        const numericValue = value === '' ? undefined : parseFloat(value.replace(',', '.'));
        setBodyMetrics(prev => ({ ...prev, [metric]: numericValue }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await patientStore.savePatientProgress(patient.id!, date, bodyMetrics, editingRecord?.id);

            if (patient.showBodyMetricsInApp !== showInApp) {
                await patientStore.updatePatient(patient.id!, { showBodyMetricsInApp: showInApp });
            }
            
            handleCancelEdit(); // Reset form state
            await fetchHistory(); // Refresh history
            setActiveTab('history'); // Switch to history view after saving
        } catch (error) {
            console.error("Failed to save body data", error);
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteConfirm = async () => {
        if (deletingRecord?.id) {
            await patientStore.deletePatientProgress(deletingRecord.id);
            setDeletingRecord(null);
            await fetchHistory();
        }
    };
    
    const handleEdit = (record: ProgressRecord) => {
        setEditingRecord(record);
        setDate(record.date);
        setBodyMetrics({
            weightKg: record.weightKg,
            heightCm: record.heightCm ?? patient.bodyMetrics?.heightCm,
            bodyFatPercentage: record.bodyFatPercentage,
            leanMassKg: record.leanMassKg,
            bodyWaterPercentage: record.bodyWaterPercentage,
        });
        setActiveTab('form');
    };
    
    const handleCancelEdit = () => {
        setEditingRecord(null);
        setDate(new Date().toLocaleDateString('en-CA'));
        setBodyMetrics(patient.bodyMetrics || {});
    };
    
    const formatHistoryDate = (dateString: string) => {
        try {
            const [year, month, day] = dateString.split('-');
            return `${day}/${month}/${year}`;
        } catch (e) {
            return dateString;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-50 p-4" onClick={onClose}>
            {deletingRecord && (
                <ConfirmationModal
                    isOpen={!!deletingRecord}
                    onClose={() => setDeletingRecord(null)}
                    onConfirm={handleDeleteConfirm}
                    title={t('deleteRecordConfirmationTitle')}
                >
                    <p>{t('deleteRecordConfirmationMessage')}</p>
                </ConfirmationModal>
            )}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <header className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">{t('bodyDataModalTitle', { name: `${patient.firstName} ${patient.lastName}` })}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><CloseIcon /></button>
                </header>

                <div className="border-b border-gray-200 dark:border-gray-700 px-6">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        <button onClick={() => setActiveTab('form')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'form' ? 'border-violet-500 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            {t('formTab')}
                        </button>
                        <button onClick={() => setActiveTab('history')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'history' ? 'border-violet-500 text-violet-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}>
                            {t('historyTab')}
                        </button>
                    </nav>
                </div>

                {activeTab === 'form' ? (
                    <div className="overflow-y-auto p-8">
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="metric-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data Rilevamento</label>
                                <input
                                    type={isDateFocused ? 'date' : 'text'}
                                    id="metric-date"
                                    value={isDateFocused ? date : formattedDate}
                                    onFocus={() => setIsDateFocused(true)}
                                    onBlur={() => setIsDateFocused(false)}
                                    onChange={e => setDate(e.target.value)}
                                    className="mt-1 block w-full sm:w-1/2 p-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
                                />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <MetricInput label={t('weight')} unit={t('unitKg')} value={bodyMetrics.weightKg} onChange={v => handleMetricChange('weightKg', v)} />
                                <MetricInput label={t('height')} unit={t('unitCm')} value={bodyMetrics.heightCm} onChange={v => handleMetricChange('heightCm', v)} />
                                <MetricInput label={t('bodyFat')} unit={t('unitPercent')} value={bodyMetrics.bodyFatPercentage} onChange={v => handleMetricChange('bodyFatPercentage', v)} />
                                <MetricInput label={t('leanMass')} unit={t('unitKg')} value={bodyMetrics.leanMassKg} onChange={v => handleMetricChange('leanMassKg', v)} />
                                <MetricInput label={t('bodyWater')} unit={t('unitPercent')} value={bodyMetrics.bodyWaterPercentage} onChange={v => handleMetricChange('bodyWaterPercentage', v)} />
                            </div>
                            <div className="flex items-center p-4 bg-slate-50 dark:bg-gray-700/50 rounded-lg">
                                <input id="show-metrics-toggle" type="checkbox" checked={showInApp} onChange={e => setShowInApp(e.target.checked)} className="h-5 w-5 rounded border-gray-300 dark:border-gray-500 text-violet-600 focus:ring-violet-500"/>
                                <label htmlFor="show-metrics-toggle" className="ml-3 block text-sm font-medium text-gray-700 dark:text-gray-300">{t('showBodyMetricsInAppLabel')}</label>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-y-auto p-8">
                        {history.length > 0 ? (
                             <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
                                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">{t('dateColumn')}</th>
                                            <th scope="col" className="px-6 py-3 text-right">{t('weight')} ({t('unitKg')})</th>
                                            <th scope="col" className="px-6 py-3 text-right">{t('bodyFat')} ({t('unitPercent')})</th>
                                            <th scope="col" className="px-6 py-3 text-right">{t('leanMass')} ({t('unitKg')})</th>
                                            <th scope="col" className="px-6 py-3 text-right">{t('bodyWater')} ({t('unitPercent')})</th>
                                            <th scope="col" className="px-6 py-3 text-right">{t('actionsColumnHeader')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map(record => (
                                            <tr key={record.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 group">
                                                <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{formatHistoryDate(record.date)}</th>
                                                <td className="px-6 py-4 text-right">{record.weightKg ?? '-'}</td>
                                                <td className="px-6 py-4 text-right">{record.bodyFatPercentage ?? '-'}</td>
                                                <td className="px-6 py-4 text-right">{record.leanMassKg ?? '-'}</td>
                                                <td className="px-6 py-4 text-right">{record.bodyWaterPercentage ?? '-'}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEdit(record)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400" title={t('editItemTitle')}><EditIcon /></button>
                                                        <button onClick={() => setDeletingRecord(record)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" title={t('deleteItemTitle')}><TrashIcon /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-gray-500 dark:text-gray-400">{t('noHistoryData')}</p>
                            </div>
                        )}
                    </div>
                )}

                <footer className="flex-shrink-0 mt-auto p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-4 bg-slate-50 dark:bg-gray-800/50 rounded-b-2xl">
                    {activeTab === 'form' && editingRecord && (
                         <button onClick={handleCancelEdit} className="bg-gray-200 dark:bg-gray-600 font-semibold px-6 py-2 rounded-full">{t('cancel')}</button>
                    )}
                    <button onClick={handleSave} disabled={isSaving || activeTab !== 'form'} className="bg-violet-600 text-white font-semibold px-6 py-2 rounded-full disabled:bg-violet-400 disabled:cursor-not-allowed">
                        {isSaving ? `${t('recalculating')}...` : (editingRecord ? t('updateButton') : t('save'))}
                    </button>
                </footer>
            </div>
        </div>
    );
});

export default BodyDataModal;