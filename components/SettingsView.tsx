import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';
import { SunIcon, MoonIcon } from './Icons';

const SettingsView: React.FC = observer(() => {
    const store = mealPlanStore;
    
    return (
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg transition-all duration-300 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6 border-b dark:border-gray-700 pb-4">{t('settings')}</h2>
            
            <div className="space-y-10">
                {/* App Preferences Section */}
                <div>
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('settingsAppPreferences')}</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between bg-slate-50 dark:bg-gray-700/50 p-3 rounded-lg">
                            <span className="font-medium text-gray-700 dark:text-gray-300">{t('theme')}</span>
                            <button onClick={() => store.setTheme(store.theme === 'light' ? 'dark' : 'light')} className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-md hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
                                {store.theme === 'light' ? <MoonIcon /> : <SunIcon />}
                            </button>
                        </div>
                        
                        <div className="bg-slate-50 dark:bg-gray-700/50 p-3 rounded-lg">
                            <span className="font-medium text-gray-700 dark:text-gray-300 mb-2 block">{t('language')}</span>
                            <div className="flex items-center bg-gray-200 dark:bg-gray-800 rounded-full p-1">
                                <button
                                    onClick={() => store.setLocale('it')}
                                    className={`w-full text-center px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${store.locale === 'it' ? 'bg-violet-600 text-white shadow-md' : 'bg-transparent text-gray-600 dark:text-gray-300'}`}
                                >
                                    Italiano
                                </button>
                                <button
                                    onClick={() => store.setLocale('en')}
                                    className={`w-full text-center px-3 py-1.5 rounded-full text-sm font-semibold transition-all duration-300 ${store.locale === 'en' ? 'bg-violet-600 text-white shadow-md' : 'bg-transparent text-gray-600 dark:text-gray-300'}`}
                                >
                                    English
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default SettingsView;