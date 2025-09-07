import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { UploadIcon } from './Icons';

const FileUpload: React.FC = observer(() => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      mealPlanStore.processPdf(file);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-lg border-2 border-dashed border-gray-300 flex flex-col justify-center items-center h-48 p-6 hover:border-violet-400 transition-colors duration-300">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadIcon />
          <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
          <p className="text-xs text-gray-500">PDF file of your diet plan</p>
        </div>
        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf" />
      </label>
    </div>
  );
});

export default FileUpload;
