import React from 'react';
import { NutritionistPlan, AssignedPlan, DayPlan } from '../../types';
import { t } from '../../i18n';
import { CloseIcon, DownloadIcon } from '../Icons';

interface DownloadPlanModalProps {
    plan: NutritionistPlan | AssignedPlan;
    onClose: () => void;
}

const DownloadPlanModal: React.FC<DownloadPlanModalProps> = ({ plan, onClose }) => {
    
    const handleJsonDownload = () => {
        const planData = 'planData' in plan ? plan.planData : {
            planName: plan.name,
            weeklyPlan: plan.planData.weeklyPlan,
            shoppingList: plan.planData.shoppingList,
        };
        const jsonString = JSON.stringify(planData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safePlanName = planData.planName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `diet-plan-${safePlanName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        onClose();
    };

    const handlePdfDownload = () => {
        const planData = 'planData' in plan ? plan.planData : plan;
        const planName = 'name' in plan ? plan.name : planData.planData.planName;
        const weeklyPlan : DayPlan[] = 'weeklyPlan' in planData ? planData.weeklyPlan : plan.planData.weeklyPlan;
        
        let html = `
            <html>
            <head>
                <title>Piano Nutrizionale - ${planName}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
                    @media print { body { -webkit-print-color-adjust: exact; } }
                    .page-container { width: 100%; max-width: 800px; margin: 0 auto; padding: 20px; }
                    h1 { color: #8b5cf6; border-bottom: 2px solid #8b5cf6; padding-bottom: 10px; }
                    h2 { color: #6d28d9; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px;}
                    h3 { color: #333; margin-top: 20px; margin-bottom: 10px; font-weight: 600; }
                    ul { list-style-type: none; padding-left: 0; }
                    li { background-color: #f9fafb; border-left: 3px solid #c4b5fd; padding: 8px 12px; margin-bottom: 5px; border-radius: 4px; }
                    p { margin-top: 5px; }
                </style>
            </head>
            <body>
                <div class="page-container">
                    <h1>${planName}</h1>`;
        
        weeklyPlan.forEach(day => {
            html += `<h2>${day.day}</h2>`;
            day.meals.forEach(meal => {
                html += `<h3>${meal.name}${meal.title ? ` - ${meal.title}` : ''}</h3>`;
                if(meal.cheat) {
                     html += `<p><strong>Sgarro:</strong> ${meal.cheatMealDescription || 'N/A'}</p>`;
                } else {
                    if (meal.items.length > 0) {
                        html += '<ul>';
                        meal.items.forEach(item => {
                            html += `<li>${item.fullDescription}</li>`;
                        });
                        html += '</ul>';
                    }
                    if (meal.procedure) {
                        html += `<p><strong>Procedura:</strong><br>${meal.procedure.replace(/\n/g, '<br>')}</p>`;
                    }
                }
            });
        });

        html += '</div></body></html>';

        const win = window.open('', '_blank');
        if (win) {
            win.document.write(html);
            win.document.close();
            win.focus();
            win.print();
        }
        onClose();
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[70] p-4" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 animate-slide-in-up" onClick={e => e.stopPropagation()}>
                <header className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">{t('downloadPlanOptions')}</h2>
                    <button onClick={onClose} className="p-2 -mr-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"><CloseIcon /></button>
                </header>
                <div className="space-y-4">
                    <button onClick={handleJsonDownload} className="w-full flex items-center justify-center gap-3 bg-blue-500 text-white font-semibold px-4 py-3 rounded-lg hover:bg-blue-600 transition-colors">
                        <DownloadIcon/>
                        <span>{t('downloadAsJson')}</span>
                    </button>
                     <button onClick={handlePdfDownload} className="w-full flex items-center justify-center gap-3 bg-red-500 text-white font-semibold px-4 py-3 rounded-lg hover:bg-red-600 transition-colors">
                        <DownloadIcon/>
                        <span>{t('downloadAsPdf')}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DownloadPlanModal;