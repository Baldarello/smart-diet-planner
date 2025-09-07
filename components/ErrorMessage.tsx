import React from 'react';
import { t } from '../i18n';

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md max-w-2xl mx-auto dark:bg-red-900/30 dark:border-red-600 dark:text-red-300" role="alert">
    <p className="font-bold">{t('errorOccurred')}</p>
    <p>{message}</p>
  </div>
);

export default ErrorMessage;