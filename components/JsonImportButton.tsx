import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { ImportIcon } from './Icons';
import { t } from '../i18n';

const JsonImportButton: React.FC = observer(() => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      mealPlanStore.processJsonFile(file);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <label htmlFor="json-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col justify-center items-center h-48 p-6 hover:border-violet-400 dark:hover:border-violet-500 transition-colors duration-300">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <ImportIcon />
          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">{t('clickToImport')}</span></p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('jsonFile')}</p>
        </div>
        <input id="json-upload" name="json-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".json" />
      </label>
    </div>
  );
});

export default JsonImportButton;