import React, { useState, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';

const SetPlanDatesModal: React.FC = observer(() => {
    const { commitNewPlan, cancelNewPlan } = mealPlanStore;

    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const nextMonthStr = nextMonth.toISOString().split('T')[0];

    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(nextMonthStr);
    const [error, setError] = useState('');
    const [isStartDateFocused, setIsStartDateFocused] = useState(false);
    const [isEndDateFocused, setIsEndDateFocused] = useState(false);

    const formattedStartDate = useMemo(() => {
        if (!startDate) return '';
        try {
            const [year, month, day] = startDate.split('-');
            return `${day}/${month}/${year}`;
        } catch(e) {
            return startDate;
        }
    }, [startDate]);

    const formattedEndDate = useMemo(() => {
        if (!endDate) return '';
        try {
            const [year, month, day] = endDate.split('-');
            return `${day}/${month}/${year}`;
        } catch(e) {
            return endDate;
        }
    }, [endDate]);

    const handleSubmit = async () => {
        if (new Date(endDate) <= new Date(startDate)) {
            setError(t('dateValidationError'));
            return;
        }
        setError('');
        await commitNewPlan(startDate, endDate);
        mealPlanStore.navigateTo('list');
    };
    
    const commonInputProps = {
        className: "mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent sm:text-sm appearance-none"
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-slide-in-up">
                <h2 id="modal-title" className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('setPlanDatesTitle')}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{t('setPlanDatesSubtitle')}</p>
                
                <div className="space-y-4">
                    <div>
                        <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('startDateLabel')}</label>
                        <input
                            type={isStartDateFocused ? 'date' : 'text'}
                            id="start-date"
                            value={isStartDateFocused ? startDate : formattedStartDate}
                            onFocus={() => setIsStartDateFocused(true)}
                            onBlur={() => setIsStartDateFocused(false)}
                            onChange={(e) => setStartDate(e.target.value)}
                            {...commonInputProps}
                        />
                    </div>
                     <div>
                        <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">{t('endDateLabel')}</label>
                        <input
                            type={isEndDateFocused ? 'date' : 'text'}
                            id="end-date"
                            value={isEndDateFocused ? endDate : formattedEndDate}
                            onFocus={() => setIsEndDateFocused(true)}
                            onBlur={() => setIsEndDateFocused(false)}
                            onChange={(e) => setEndDate(e.target.value)}
                            min={startDate}
                            {...commonInputProps}
                        />
                    </div>
                </div>

                {error && <p className="text-red-500 text-sm mt-4">{error}</p>}

                <div className="flex justify-end gap-4 mt-8">
                    <button onClick={cancelNewPlan} className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold px-6 py-2 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
                        {t('cancel')}
                    </button>
                    <button onClick={handleSubmit} className="bg-violet-600 text-white font-semibold px-6 py-2 rounded-full hover:bg-violet-700 transition-colors">
                        {t('startPlanButton')}
                    </button>
                </div>
            </div>
        </div>
    );
});

export default SetPlanDatesModal;