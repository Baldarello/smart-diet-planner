import React from 'react';
import { NutritionistPlan, AssignedPlan, DayPlan } from '../../types';
import { t } from '../../i18n';
import { CloseIcon, DownloadIcon } from '../Icons';
import { pdfSettingsStore } from '../../stores/PdfSettingsStore';

interface DownloadPlanModalProps {
    plan: NutritionistPlan | AssignedPlan;
    onClose: () => void;
}

const DownloadPlanModal: React.FC<DownloadPlanModalProps> = ({ plan, onClose }) => {
    
    const handleJsonDownload = () => {
        // Fix: The original ternary operator was incorrect as both types have `planData`.
        // This is simplified to correctly use `plan.planData`, which is of the correct type for both union members.
        const planData = plan.planData;
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
        let planName: string;
        let weeklyPlan: DayPlan[];
    
        if ('name' in plan) { // NutritionistPlan
            planName = plan.name;
            weeklyPlan = plan.planData.weeklyPlan;
        } else { // AssignedPlan
            planName = plan.planData.planName;
            weeklyPlan = plan.planData.weeklyPlan;
        }
        
        const { settings } = pdfSettingsStore;
        const { 
            logo, headerText, footerText, primaryColor, textColor, fontFamily, 
            fontSizeH1, fontSizeH2, fontSizeH3, fontSizeBody, lineHeight, 
            showPageNumbers, showMealNutrition, showDailySummary, showProcedures 
        } = settings;

        let mainContentHtml = `<h1>${planName}</h1>`;
        weeklyPlan.forEach(day => {
            mainContentHtml += `<h2>${day.day}</h2>`;

            if (showDailySummary) {
                const summary = { carbs: 0, protein: 0, fat: 0, calories: 0 };
                let hasData = false;
                day.meals.forEach(meal => {
                    if (meal.nutrition && !meal.cheat) {
                        hasData = true;
                        summary.carbs += meal.nutrition.carbs;
                        summary.protein += meal.nutrition.protein;
                        summary.fat += meal.nutrition.fat;
                        summary.calories += meal.nutrition.calories;
                    }
                });
                if (hasData) {
                    mainContentHtml += `
                        <div class="daily-summary">
                            <div><strong>${t('nutritionCalories')}:</strong> ${Math.round(summary.calories)}${t('nutritionUnitKcal')}</div>
                            <div><strong>${t('nutritionCarbs')}:</strong> ${Math.round(summary.carbs)}${t('nutritionUnitG')}</div>
                            <div><strong>${t('nutritionProtein')}:</strong> ${Math.round(summary.protein)}${t('nutritionUnitG')}</div>
                            <div><strong>${t('nutritionFat')}:</strong> ${Math.round(summary.fat)}${t('nutritionUnitG')}</div>
                        </div>`;
                }
            }


            day.meals.forEach(meal => {
                mainContentHtml += `<h3>${meal.name}${meal.title ? ` - ${meal.title}` : ''}</h3>`;
                if(meal.cheat) {
                     mainContentHtml += `<p><strong>Sgarro:</strong> ${meal.cheatMealDescription || 'N/A'}</p>`;
                } else {
                    if (meal.items.length > 0) {
                        mainContentHtml += '<ul>';
                        meal.items.forEach(item => {
                            mainContentHtml += `<li>${item.fullDescription}</li>`;
                        });
                        mainContentHtml += '</ul>';
                    }
                    if (showProcedures && meal.procedure) {
                        mainContentHtml += `<p class="procedure"><strong>Procedura:</strong><br>${meal.procedure.replace(/\n/g, '<br>')}</p>`;
                    }
                     if (showMealNutrition && meal.nutrition) {
                        mainContentHtml += `
                            <div class="meal-nutrition">
                                <span><strong>Kcal:</strong> ${Math.round(meal.nutrition.calories)}</span>
                                <span><strong>C:</strong> ${Math.round(meal.nutrition.carbs)}g</span>
                                <span><strong>P:</strong> ${Math.round(meal.nutrition.protein)}g</span>
                                <span><strong>F:</strong> ${Math.round(meal.nutrition.fat)}g</span>
                            </div>`;
                    }
                }
            });
        });

        let fontFamilyString = '';
        switch(fontFamily) {
            case 'Serif': fontFamilyString = 'Georgia, serif'; break;
            case 'Roboto': fontFamilyString = "'Roboto', sans-serif"; break;
            case 'Lato': fontFamilyString = "'Lato', sans-serif"; break;
            case 'Merriweather': fontFamilyString = "'Merriweather', serif"; break;
            default: fontFamilyString = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
        }
        
        const googleFonts = ['Roboto', 'Lato', 'Merriweather'];
        const googleFontImport = googleFonts.includes(fontFamily) ? `
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=${fontFamily.replace(' ', '+')}:wght@400;700&display=swap" rel="stylesheet">
        ` : '';


        const html = `
            <html>
            <head>
                <title>Piano Nutrizionale - ${planName}</title>
                ${googleFontImport}
                <style>
                    body { 
                        font-family: ${fontFamilyString}; 
                        line-height: ${lineHeight}; 
                        color: ${textColor};
                        font-size: ${fontSizeBody}px;
                        counter-reset: page;
                    }
                    @media print { 
                        body { -webkit-print-color-adjust: exact; } 
                        thead, tfoot { display: table-header-group; }
                    }
                    table { width: 100%; border-collapse: collapse; }
                    thead, tfoot { page-break-inside: avoid; }
                    thead td { padding: 20px 0; border-bottom: 1px solid #eee; }
                    tfoot td { padding: 20px 0; border-top: 1px solid #eee; }
                    .header { text-align: center; }
                    .logo { max-height: 80px; margin-bottom: 10px; }
                    .header-text { white-space: pre-wrap; color: #555; }
                    .footer-content { text-align: center; font-size: 0.8em; color: #666; white-space: pre-wrap; }
                    .page-number { text-align: center; font-size: 0.8em; color: #666; }
                    .page-number::before { counter-increment: page; content: "Pag. " counter(page); }
                    
                    h1, h2 { color: ${primaryColor}; }
                    h1 { border-bottom: 2px solid ${primaryColor}; padding-bottom: 10px; text-align: center; font-size: ${fontSizeH1}px; margin-bottom: 20px;}
                    h2 { margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px; font-size: ${fontSizeH2}px;}
                    h3 { color: ${textColor}; margin-top: 20px; margin-bottom: 10px; font-weight: 600; font-size: ${fontSizeH3}px;}
                    ul { list-style-type: none; padding-left: 0; }
                    li { background-color: #f9fafb; border-left: 3px solid ${primaryColor}; opacity: 0.8; padding: 8px 12px; margin-bottom: 5px; border-radius: 4px; }
                    p { margin-top: 5px; }
                    .procedure { margin-top: 10px; font-style: italic; }
                    .meal-nutrition { display: flex; gap: 15px; font-size: 0.8em; color: #555; background: #f3f4f6; padding: 5px 10px; border-radius: 5px; margin-top: 10px; }
                    .daily-summary { display: flex; justify-content: space-around; background: #f3f4f6; padding: 10px; border-radius: 8px; margin: 10px 0; font-size: 0.9em; }
                </style>
            </head>
            <body>
                <table>
                    <thead>
                        <tr>
                            <td>
                                <div class="header">
                                    ${logo ? `<img src="${logo}" alt="Logo" class="logo"/>` : ''}
                                    ${headerText ? `<div class="header-text">${headerText.replace(/\n/g, '<br>')}</div>` : ''}
                                </div>
                            </td>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                ${mainContentHtml}
                            </td>
                        </tr>
                    </tbody>
                    <tfoot>
                        <tr>
                            <td>
                                <div class="footer-content">${footerText.replace(/\n/g, '<br>')}</div>
                                ${showPageNumbers ? '<div class="page-number"></div>' : ''}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </body>
            </html>`;

        const win = window.open('', '_blank');
        if (win) {
            win.document.write(html);
            win.document.close();
            win.focus();
            setTimeout(() => {
                win.print();
                win.close();
            }, 250); // Small delay to ensure content is rendered before printing
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