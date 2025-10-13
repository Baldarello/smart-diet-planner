import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';
import FileUpload from './FileUpload';
import ArchivedPlanItem from './ArchivedPlanItem';

const FileUploadScreen: React.FC = observer(() => {
    const store = mealPlanStore;
    return (
        <div className="text-center">
            <div className="pt-8">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('welcomeTitle')}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-2xl mx-auto">{t('welcomeSubtitle')}</p>
            </div>
            
            <div className="max-w-4xl mx-auto">
                <FileUpload />
            </div>
            
            {store.archivedPlans.length > 0 && (
                <div className="mt-12 max-w-4xl mx-auto">
                    <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-4 border-t dark:border-gray-700 pt-8">{t('restoreFromArchiveTitle')}</h3>
                    <div className="space-y-4">
                        {store.archivedPlans.slice().reverse().map((archive) => (
                            <ArchivedPlanItem key={archive.id} archive={archive} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
});

export default FileUploadScreen;