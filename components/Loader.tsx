import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';

const readingMessages = ["Warming up the AI chef...","Scanning for breakfast recipes...","Decoding your lunch options...","Unpacking dinner ingredients...","Slicing and dicing the data...","Extracting nutritional notes...",];
const analyzingMessages = ["Consulting with digital nutritionists...","Organizing your week's meals...","Calibrating the calorie counter...","Generating your shopping list...","Categorizing ingredients for you...",];

const Loader: React.FC = observer(() => {
    const { pdfParseProgress } = mealPlanStore;
    const isReadingPdf = pdfParseProgress < 100;
    const [message, setMessage] = useState(readingMessages[0]);

    useEffect(() => {
        const messages = isReadingPdf ? readingMessages : analyzingMessages;
        let messageIndex = 0;
        const interval = setInterval(() => {
            messageIndex = (messageIndex + 1) % messages.length;
            setMessage(messages[messageIndex]);
        }, 2000);
        return () => clearInterval(interval);
    }, [isReadingPdf]);

    return (
        <div className="flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-violet-600 mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-700">{isReadingPdf ? 'Reading Your PDF...' : 'Analyzing Your Plan'}</h2>
            <p className="text-gray-500 mb-4 h-10 flex items-center justify-center">{message}</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-violet-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" style={{ width: `${pdfParseProgress}%` }}></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">{Math.round(pdfParseProgress)}% Complete</p>
        </div>
    );
});

export default Loader;
