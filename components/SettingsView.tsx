import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';
import { SunIcon, MoonIcon, CloudOnlineIcon, CloudOfflineIcon, BellIcon } from './Icons';
import { subscribeUserToPush, unsubscribeUserFromPush } from '../utils/pushNotifications';
import Switch from './Switch';

const SettingsView: React.FC = observer(() => {
    const store = mealPlanStore;
    
    const [stepGoalState, setStepGoalState] = useState(store.stepGoal.toString());
    const [hydrationGoalState, setHydrationGoalState] = useState(store.hydrationGoalLiters.toString());
    const [heightState, setHeightState] = useState(store.bodyMetrics.heightCm?.toString() ?? '');
    const [pushState, setPushState] = useState<'default' | 'subscribed' | 'denied' | 'unsupported' | 'loading' | 'error'>('default');
    
    useEffect(() => {
        if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
            setPushState('unsupported');
            return;
        }

        if (Notification.permission === 'denied') {
            setPushState('denied');
            return;
        }

        navigator.serviceWorker.ready.then(reg => {
            reg.pushManager.getSubscription().then(sub => {
                if (sub) {
                    setPushState('subscribed');
                } else {
                    setPushState(Notification.permission === 'granted' ? 'default' : Notification.permission);
                }
            });
        });
    }, []);

    const handleEnablePush = async () => {
        setPushState('loading');
        try {
            await subscribeUserToPush();
            setPushState('subscribed');
        } catch (error) {
            console.error('Failed to subscribe to push notifications:', error);
            if (Notification.permission === 'denied') {
                setPushState('denied');
            } else {
                setPushState('error');
            }
        }
    };

    const handleDisablePush = async () => {
        setPushState('loading');
        try {
            await unsubscribeUserFromPush();
            setPushState('default');
        } catch (error) {
            console.error('Failed to unsubscribe from push notifications:', error);
            setPushState('error');
        }
    };

    const handlePushToggle = (checked: boolean) => {
        if (checked) {
            handleEnablePush();
        } else {
            handleDisablePush();
        }
    };
    
    useEffect(() => { setStepGoalState(store.stepGoal.toString()); }, [store.stepGoal]);
    useEffect(() => { setHydrationGoalState(store.hydrationGoalLiters.toString()); }, [store.hydrationGoalLiters]);
    useEffect(() => { setHeightState(store.bodyMetrics.heightCm?.toString() ?? ''); }, [store.bodyMetrics.heightCm]);

    return (
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg transition-all duration-300 max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-6 border-b dark:border-gray-700 pb-4">{t('settings')}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                {/* Column 1: User Goals Section */}
                <div>
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('settingsUserGoals')}</h3>
                    <div className="space-y-4">
                        <div className="bg-slate-50 dark:bg-gray-700/50 p-3 rounded-lg">
                            <label htmlFor="step-goal-setting" className="font-medium text-gray-700 dark:text-gray-300 block mb-1">{t('settingsStepGoal')}</label>
                            <div className="flex items-center bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-violet-500">
                                <input
                                    id="step-goal-setting"
                                    type="number"
                                    value={stepGoalState}
                                    onChange={(e) => setStepGoalState(e.target.value)}
                                    onBlur={() => {
                                        const value = parseInt(stepGoalState, 10);
                                        if (!isNaN(value) && value > 0) store.setStepGoal(value);
                                        else setStepGoalState(store.stepGoal.toString());
                                    }}
                                    className="w-full bg-transparent p-2 outline-none"
                                    placeholder="6000"
                                />
                                <span className="pr-3 font-semibold text-gray-500 dark:text-gray-400">{t('stepsUnit')}</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-gray-700/50 p-3 rounded-lg">
                            <label htmlFor="hydration-goal-setting" className="font-medium text-gray-700 dark:text-gray-300 block mb-1">{t('settingsHydrationGoal')}</label>
                            <div className="flex items-center bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-violet-500">
                                <input
                                    id="hydration-goal-setting"
                                    type="number"
                                    step="0.1"
                                    value={hydrationGoalState}
                                    onChange={(e) => setHydrationGoalState(e.target.value)}
                                    onBlur={() => {
                                        const value = parseFloat(hydrationGoalState.replace(',', '.'));
                                        if (!isNaN(value) && value > 0) store.setHydrationGoal(value);
                                        else setHydrationGoalState(store.hydrationGoalLiters.toString());
                                    }}
                                    className="w-full bg-transparent p-2 outline-none"
                                    placeholder="3"
                                />
                                <span className="pr-3 font-semibold text-gray-500 dark:text-gray-400">{t('hydrationUnit')}</span>
                            </div>
                        </div>

                        <div className="bg-slate-50 dark:bg-gray-700/50 p-3 rounded-lg">
                            <label htmlFor="height-setting" className="font-medium text-gray-700 dark:text-gray-300 block mb-1">{t('height')}</label>
                            <div className="flex items-center bg-white dark:bg-gray-800 rounded-md border border-gray-300 dark:border-gray-600 focus-within:ring-2 focus-within:ring-violet-500">
                                <input
                                    id="height-setting"
                                    type="number"
                                    value={heightState}
                                    onChange={(e) => setHeightState(e.target.value)}
                                    onBlur={() => {
                                        const value = parseFloat(heightState.replace(',', '.'));
                                        if (!isNaN(value) && value > 0) {
                                            store.setBodyMetric('heightCm', value);
                                        } else if (heightState.trim() === '') {
                                            store.setBodyMetric('heightCm', undefined);
                                        } else {
                                            setHeightState(store.bodyMetrics.heightCm?.toString() ?? '');
                                        }
                                    }}
                                    className="w-full bg-transparent p-2 outline-none"
                                    placeholder="175"
                                />
                                <span className="pr-3 font-semibold text-gray-500 dark:text-gray-400">{t('unitCm')}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 2: App Preferences & Status */}
                <div className="space-y-10">
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

                    <div className="space-y-10">
                         <div>
                            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('notifications')}</h3>
                            <div className="bg-slate-50 dark:bg-gray-700/50 p-4 rounded-lg">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex items-center min-w-0">
                                        <BellIcon />
                                        <div className="ml-3">
                                            <label htmlFor="push-toggle" className="font-medium text-gray-700 dark:text-gray-300 cursor-pointer">{t('pushNotifications')}</label>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{t('pushNotificationsDescription')}</p>
                                        </div>
                                    </div>
                                    <div className="flex-shrink-0 flex items-center gap-2">
                                        {pushState === 'loading' && <div className="animate-spin h-5 w-5 border-b-2 border-violet-600 rounded-full"></div>}
                                        <Switch
                                            id="push-toggle"
                                            checked={pushState === 'subscribed'}
                                            onChange={handlePushToggle}
                                            disabled={pushState === 'denied' || pushState === 'unsupported' || pushState === 'loading'}
                                        />
                                    </div>
                                </div>
                                {pushState === 'denied' && <p className="mt-2 text-sm font-semibold text-red-500">{t('pushNotificationsDenied')}</p>}
                                {pushState === 'unsupported' && <p className="mt-2 text-sm font-semibold text-gray-500">{t('pushNotificationsUnsupported')}</p>}
                                {pushState === 'error' && <p className="mt-2 text-sm font-semibold text-red-500">{t('pushNotificationsError')}</p>}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">{t('settingsStatus')}</h3>
                             <div className="space-y-4">
                                <div className="flex items-center justify-between bg-slate-50 dark:bg-gray-700/50 p-3 rounded-lg" title={store.onlineMode ? t('onlineModeTitle') : t('offlineModeTitle')}>
                                    <span className="font-medium text-gray-700 dark:text-gray-300">{t('connectionStatus')}</span>
                                    <div className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-md flex items-center gap-2">
                                        {store.onlineMode ? <CloudOnlineIcon /> : <CloudOfflineIcon />}
                                        <span className="font-semibold text-sm">{store.onlineMode ? 'Online' : 'Offline'}</span>
                                    </div>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default SettingsView;
