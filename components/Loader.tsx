import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore, AppStatus } from '../stores/MealPlanStore';
import { t, t_dynamic } from '../i18n';

const Loader: React.FC = observer(() => {
    const { pdfParseProgress, status, locale } = mealPlanStore;

    if (status === AppStatus.HYDRATING) {
        return (
            <div className="flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-violet-600 dark:border-violet-500 mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">{t('loadingPlanTitle')}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-4 h-10 flex items-center justify-center">{t('loadingPlanMessage')}</p>
            </div>
        );
    }

    const isReadingPdf = pdfParseProgress <= 30;
    const isStructuring = pdfParseProgress > 30 && pdfParseProgress <= 50;
    const isAnalyzing = pdfParseProgress > 50 && pdfParseProgress <= 90;
    
    let titleKey: 'readingPdfTitle' | 'structuringPlanTitle' | 'analyzingNutritionTitle' | 'generatingListTitle' = 'readingPdfTitle';
    let messagesKey: 'readingMessages' | 'structuringPlanMessages' | 'analyzingNutritionMessages' | 'generatingListMessages' = 'readingMessages';

    if (isStructuring) {
        titleKey = 'structuringPlanTitle';
        messagesKey = 'structuringPlanMessages';
    } else if (isAnalyzing) {
        titleKey = 'analyzingNutritionTitle';
        messagesKey = 'analyzingNutritionMessages';
    } else if (pdfParseProgress > 90) {
        titleKey = 'generatingListTitle';
        messagesKey = 'generatingListMessages';
    }
    
    const [messages, setMessages] = useState(t_dynamic(messagesKey));
    const [message, setMessage] = useState(messages[0]);

    useEffect(() => {
        const currentMessages = t_dynamic(messagesKey);
        setMessages(currentMessages);
        setMessage(currentMessages[0] || '');
    }, [locale, messagesKey]);

    useEffect(() => {
        let messageIndex = 0;
        const interval = setInterval(() => {
            messageIndex = (messageIndex + 1) % messages.length;
            setMessage(messages[messageIndex]);
        }, 2000);
        return () => clearInterval(interval);
    }, [messages]);

    return (
        <div className="flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-violet-600 dark:border-violet-500 mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300">{t(titleKey)}</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4 h-10 flex items-center justify-center">{message}</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div className="bg-violet-600 dark:bg-violet-500 h-2.5 rounded-full transition-all duration-300 ease-in-out" style={{ width: `${pdfParseProgress}%` }}></div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{Math.round(pdfParseProgress)}{t('progressComplete')}</p>
        </div>
    );
});

export default Loader;