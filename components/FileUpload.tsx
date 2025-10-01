import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { UploadIcon } from './Icons';
import { t } from '../i18n';

const FileUpload: React.FC = observer(() => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        mealPlanStore.processPdf(file);
    } else if (file.type === 'application/json' || file.name.toLowerCase().endsWith('.json')) {
        mealPlanStore.processJsonFile(file);
    } else {
        // You could set an error in the store for unsupported file types
        console.error("Unsupported file type:", file.type);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <label htmlFor="file-upload" className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col justify-center items-center h-48 p-6 hover:border-violet-400 dark:hover:border-violet-500 transition-colors duration-300">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadIcon />
          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400"><span className="font-semibold">{t('clickToUpload')}</span> {t('dragAndDrop')}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('pdfOrJsonFile')}</p>
        </div>
        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf,.json" />
      </label>
    </div>
  );
});

export default FileUpload;
