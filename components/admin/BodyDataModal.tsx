import React, { useState, useEffect, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { Patient, BodyMetrics, ProgressRecord } from '../../types';
import { t } from '../../i18n';
import { CloseIcon, TrashIcon, EditIcon } from '../Icons';
import { patientStore } from '../../stores/PatientStore';
import ConfirmationModal from '../ConfirmationModal';
import Switch from '../Switch';

interface BodyDataModalProps {
    patient: Patient;
    onClose: () => void;
}

const MetricInput: React.FC<{ label: string; unit: string; value: string; onChange: (value: string) => void; }> = 
({ label, unit, value, onChange }) => (
    <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</label>
        <div className="mt-1 flex items-center">
            <input
                type="text"
                inputMode="decimal"
                value={value}
                onChange={e => onChange(e.target.value)}
                className="flex-grow p-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-violet-500 focus:border-violet-500"
            />
            <span className="ml-2 font-semibold text-gray-500 dark:text-gray-400 w-6 text-left">{unit}</span>
        </div>
    </div>
);

const BodyDataModal: React.FC<BodyDataModalProps> = observer(({ patient, onClose }) => {
    const [bodyMetrics, setBodyMetrics] = useState<BodyMetrics>(patient.bodyMetrics || {});
    const [date, setDate] = useState(new Date().toLocaleDateString('en-CA'));
    const [isSaving, setIsSaving] = useState(false);
    const [isDateFocused, setIsDateFocused] = useState(false);
    const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');
    const [history, setHistory] = useState<ProgressRecord[]>([]);
    const [deletingRecord, setDeletingRecord] = useState<ProgressRecord | null>(null);
    const [editingRecord, setEditingRecord] = useState<ProgressRecord | null>(null);

    const [unitMode, setUnitMode] = useState<'absolute' | 'percentage'>('percentage');

    const fetchHistory = async () => {
        const historyData = await patientStore.getProgressHistoryForPatient(patient.id!);
        const relevantHistory = historyData.filter(h => h.weightKg !== undefined || h.bodyFatKg !== undefined || h.bodyFatPercentage !== undefined);
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
        setBodyMetrics(prev => {
            const newState = { ...prev };
            newState[metric] = numericValue;
            
            // When weight changes, recalculate everything
            if (metric === 'weightKg') {
                if (newState.bodyFatKg !== undefined) {
                    newState.bodyFatPercentage = numericValue !== undefined ? parseFloat(((newState.bodyFatKg / numericValue) * 100).toFixed(2)) : undefined;
                }
                if (newState.bodyWaterLiters !== undefined) {
                    newState.bodyWaterPercentage = numericValue !== undefined ? parseFloat(((newState.bodyWaterLiters / numericValue) * 100).toFixed(2)) : undefined;
                }
            }
            
            // Recalculate lean mass from weight and fat mass
            if (newState.weightKg !== undefined && newState.bodyFatKg !== undefined) {
                newState.leanMassKg = parseFloat((newState.weightKg - newState.bodyFatKg).toFixed(2));
            } else {
                newState.leanMassKg = undefined;
            }
            
            return newState;
        });
    };

    const handleFatChange = (valueStr: string) => {
        const numericValue = valueStr === '' ? undefined : parseFloat(valueStr.replace(',', '.'));

        setBodyMetrics(prev => {
            const newState = { ...prev };
            if (unitMode === 'percentage') {
                newState.bodyFatPercentage = numericValue;
                if (newState.weightKg !== undefined && numericValue !== undefined) {
                    newState.bodyFatKg = parseFloat(((numericValue / 100) * newState.weightKg).toFixed(2));
                }
            } else { // absolute
                newState.bodyFatKg = numericValue;
                if (newState.weightKg !== undefined && numericValue !== undefined) {
                    newState.bodyFatPercentage = parseFloat(((numericValue / newState.weightKg) * 100).toFixed(2));
                }
            }
            // Recalculate lean mass
            if (newState.weightKg !== undefined && newState.bodyFatKg !== undefined) {
                newState.leanMassKg = parseFloat((newState.weightKg - newState.bodyFatKg).toFixed(2));
            } else {
                newState.leanMassKg = undefined;
            }
            return newState;
        });
    };
    
    const handleLeanMassChange = (valueStr: string) => {
        const numericValue = valueStr === '' ? undefined : parseFloat(valueStr.replace(',', '.'));
    
        setBodyMetrics(prev => {
            const newState = { ...prev };
            if (unitMode === 'percentage') {
                if (newState.weightKg !== undefined && numericValue !== undefined) {
                    newState.leanMassKg = parseFloat(((numericValue / 100) * newState.weightKg).toFixed(2));
                }
            } else { // absolute
                newState.leanMassKg = numericValue;
            }
            // Recalculate fat mass from lean mass and weight
            if (newState.weightKg !== undefined && newState.leanMassKg !== undefined) {
                newState.bodyFatKg = parseFloat((newState.weightKg - newState.leanMassKg).toFixed(2));
                newState.bodyFatPercentage = parseFloat(((newState.bodyFatKg / newState.weightKg) * 100).toFixed(2));
            } else {
                newState.bodyFatKg = undefined;
                newState.bodyFatPercentage = undefined;
            }
            return newState;
        });
    };

    const handleWaterChange = (valueStr: string) => {
        const numericValue = valueStr === '' ? undefined : parseFloat(valueStr.replace(',', '.'));
        setBodyMetrics(prev => {
            const newState = { ...prev };
            if (unitMode === 'percentage') {
                newState.bodyWaterPercentage = numericValue;
                if (newState.weightKg !== undefined && numericValue !== undefined) {
                    newState.bodyWaterLiters = parseFloat(((numericValue / 100) * newState.weightKg).toFixed(2));
                }
            } else { // 'absolute' mode ('liters')
                newState.bodyWaterLiters = numericValue;
                if (newState.weightKg !== undefined && numericValue !== undefined) {
                    newState.bodyWaterPercentage = parseFloat(((numericValue / newState.weightKg) * 100).toFixed(2));
                }
            }
            return newState;
        });
    };

    const displayValues = useMemo(() => {
        const { weightKg, leanMassKg, bodyFatPercentage, bodyFatKg, bodyWaterPercentage, bodyWaterLiters } = bodyMetrics;
        
        let fat = '';
        if (unitMode === 'percentage') {
            fat = bodyFatPercentage === undefined ? '' : String(bodyFatPercentage);
        } else { // absolute
            fat = bodyFatKg === undefined ? '' : String(bodyFatKg);
        }

        let leanMass = '';
        if (unitMode === 'percentage') {
            if (weightKg && leanMassKg != null && weightKg > 0) {
                leanMass = ((leanMassKg / weightKg) * 100).toFixed(2);
            }
        } else { // absolute
            leanMass = leanMassKg === undefined ? '' : String(leanMassKg);
        }
    
        let water = '';
        if (unitMode === 'percentage') {
            water = bodyWaterPercentage === undefined ? '' : String(bodyWaterPercentage);
        } else { // absolute (liters)
            water = bodyWaterLiters === undefined ? '' : String(bodyWaterLiters);
        }
        return { fat, water, leanMass };
    }, [bodyMetrics, unitMode]);


    const handleSave = async () => {
        setIsSaving(true);
        try {
            await patientStore.savePatientProgress(patient.id!, date, bodyMetrics, editingRecord?.id);
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
            bodyFatKg: record.bodyFatKg,
            bodyWaterLiters: record.bodyWaterLiters,
            leanMassKg: record.leanMassKg,
            bodyFatPercentage: record.bodyFatPercentage,
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
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div>
                                    <label htmlFor="metric-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Data Rilevamento</label>
                                    <input
                                        type={isDateFocused ? 'date' : 'text'}
                                        id="metric-date"
                                        value={isDateFocused ? date : formattedDate}
                                        onFocus={() => setIsDateFocused(true)}
                                        onBlur={() => setIsDateFocused(false)}
                                        onChange={e => setDate(e.target.value)}
                                        className="mt-1 block w-full p-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
                                    />
                                </div>
                                <div className="flex items-center gap-2 self-end">
                                    <span className="text-sm font-medium uppercase text-gray-600 dark:text-gray-400">{t('unitKg')}/{t('unitLiters')}</span>
                                    <Switch checked={unitMode === 'percentage'} onChange={c => setUnitMode(c ? 'percentage' : 'absolute')} />
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">%</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <MetricInput label={t('weight')} unit={t('unitKg')} value={bodyMetrics.weightKg === undefined ? '' : String(bodyMetrics.weightKg)} onChange={v => handleMetricChange('weightKg', v)} />
                                <MetricInput label={t('height')} unit={t('unitCm')} value={bodyMetrics.heightCm === undefined ? '' : String(bodyMetrics.heightCm)} onChange={v => handleMetricChange('heightCm', v)} />
                                <MetricInput label={t('bodyFat')} unit={unitMode === 'percentage' ? '%' : t('unitKg')} value={displayValues.fat} onChange={handleFatChange} />
                                <MetricInput label={t('leanMass')} unit={unitMode === 'percentage' ? '%' : t('unitKg')} value={displayValues.leanMass} onChange={handleLeanMassChange} />
                                <MetricInput label={t('bodyWater')} unit={unitMode === 'percentage' ? '%' : t('unitLiters')} value={displayValues.water} onChange={handleWaterChange} />
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-y-auto p-8">
                         <div className="flex justify-end items-center gap-2 mb-4">
                            <span className="text-sm font-medium uppercase text-gray-600 dark:text-gray-400">{t('unitKg')}/{t('unitLiters')}</span>
                            <Switch checked={unitMode === 'percentage'} onChange={c => setUnitMode(c ? 'percentage' : 'absolute')} />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">%</span>
                        </div>
                        {history.length > 0 ? (
                             <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
                                <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 dark:bg-gray-700 dark:text-gray-400 sticky top-0">
                                        <tr>
                                            <th scope="col" className="px-6 py-3">{t('dateColumn')}</th>
                                            <th scope="col" className="px-6 py-3 text-right">{t('weight')} ({t('unitKg')})</th>
                                            <th scope="col" className="px-6 py-3 text-right">{t('bodyFat')} ({unitMode === 'percentage' ? '%' : t('unitKg')})</th>
                                            <th scope="col" className="px-6 py-3 text-right">{t('leanMass')} ({unitMode === 'percentage' ? '%' : t('unitKg')})</th>
                                            <th scope="col" className="px-6 py-3 text-right">{t('bodyWater')} ({unitMode === 'percentage' ? '%' : t('unitLiters')})</th>
                                            <th scope="col" className="px-6 py-3 text-right">{t('actionsColumnHeader')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map(record => {
                                            const { weightKg } = record;

                                            let bodyFatDisplay: string = '-';
                                            if (unitMode === 'percentage') {
                                                const value = record.bodyFatPercentage ?? (weightKg && record.bodyFatKg != null ? (record.bodyFatKg / weightKg) * 100 : null);
                                                if (value != null) bodyFatDisplay = value.toFixed(1);
                                            } else {
                                                const value = record.bodyFatKg ?? (weightKg && record.bodyFatPercentage != null ? (record.bodyFatPercentage / 100) * weightKg : null);
                                                if (value != null) bodyFatDisplay = value.toFixed(1);
                                            }
                                
                                            let leanMassDisplay: string = '-';
                                            if (unitMode === 'percentage') {
                                                if (record.leanMassKg != null && weightKg != null && weightKg > 0) {
                                                    leanMassDisplay = ((record.leanMassKg / weightKg) * 100).toFixed(1);
                                                } else {
                                                    const fatPercentage = record.bodyFatPercentage ?? (weightKg && record.bodyFatKg != null ? (record.bodyFatKg / weightKg) * 100 : null);
                                                    if (fatPercentage != null) {
                                                        leanMassDisplay = (100 - fatPercentage).toFixed(1);
                                                    }
                                                }
                                            } else {
                                                const value = record.leanMassKg ?? (weightKg != null && record.bodyFatKg != null ? weightKg - record.bodyFatKg : null);
                                                if (value != null) leanMassDisplay = value.toFixed(1);
                                            }

                                            let bodyWaterDisplay: string = '-';
                                            if (unitMode === 'percentage') {
                                                const value = record.bodyWaterPercentage ?? (weightKg && record.bodyWaterLiters != null ? (record.bodyWaterLiters / weightKg) * 100 : null);
                                                if (value != null) bodyWaterDisplay = value.toFixed(1);
                                            } else {
                                                const value = record.bodyWaterLiters ?? (weightKg && record.bodyWaterPercentage != null ? (record.bodyWaterPercentage / 100) * weightKg : null);
                                                if (value != null) bodyWaterDisplay = value.toFixed(1);
                                            }

                                            return (
                                                <tr key={record.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 group">
                                                    <th scope="row" className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-white">{formatHistoryDate(record.date)}</th>
                                                    <td className="px-6 py-4 text-right">{record.weightKg?.toFixed(1) ?? '-'}</td>
                                                    <td className="px-6 py-4 text-right">{bodyFatDisplay}</td>
                                                    <td className="px-6 py-4 text-right">{leanMassDisplay}</td>
                                                    <td className="px-6 py-4 text-right">{bodyWaterDisplay}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => handleEdit(record)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400" title={t('editItemTitle')}><EditIcon /></button>
                                                            <button onClick={() => setDeletingRecord(record)} className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400" title={t('deleteItemTitle')}><TrashIcon /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
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