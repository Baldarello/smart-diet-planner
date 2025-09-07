import React from 'react';
import { t } from '../i18n';

const ExamplePdf: React.FC = () => {
    return (
        <div className="mt-12 max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">{t('exampleTitle')}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{t('exampleSubtitle')}</p>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-200 dark:border-gray-700">
                <div className="text-center mb-4">
                    <h4 className="font-bold text-lg text-violet-700 dark:text-violet-400">{t('exampleDay')}</h4>
                </div>
                <div className="space-y-4 text-sm">
                    <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{t('exampleMealBreakfast')}</p>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 pl-4">
                            <li>{t('exampleItem1')}</li>
                            <li>{t('exampleItem2')}</li>
                        </ul>
                    </div>
                     <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{t('exampleMealLunch')}</p>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 pl-4">
                            <li>{t('exampleItem3')}</li>
                            <li>{t('exampleItem4')}</li>
                        </ul>
                    </div>
                     <div>
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{t('exampleMealDinner')}</p>
                        <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 pl-4">
                            <li>{t('exampleItem5')}</li>
                            <li>{t('exampleItem6')}</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ExamplePdf;
