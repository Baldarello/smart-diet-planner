import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import ArchivedPlanItem from './ArchivedPlanItem';
import { t } from '../i18n';

const ArchiveView: React.FC = observer(() => {
    const { archivedPlans } = mealPlanStore;
    if (archivedPlans.length === 0) { return ( <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg text-center max-w-2xl mx-auto"><h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('archiveEmpty')}</h2><p className="text-gray-500 dark:text-gray-400">{t('archiveEmptySubtitle')}</p></div> ); }
    return (
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg transition-all duration-300 max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6 border-b dark:border-gray-700 pb-4">{t('archiveTitle')}</h2>
            <div className="space-y-4">
                {archivedPlans.slice().reverse().map((archive) => ( <ArchivedPlanItem key={archive.id} archive={archive}/> ))}
            </div>
        </div>
    );
});

export default ArchiveView;