import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore, AppStatus } from './stores/MealPlanStore';
import { authStore } from './stores/AuthStore';
import { t } from './i18n';
import {
    FileUpload,
    Loader,
    ErrorMessage,
    ShoppingListView,
    PantryView,
    WeeklyCalendarView,
    DailyPlanView,
    ArchiveView,
    ActivePlanNameEditor,
    ExamplePdf,
    ManualPlanEntryForm,
    ArchivedPlanItem,
    InstallPwaSnackbar,
    GoogleLogin,
    Drawer,
    MenuIcon,
    ProgressView,
} from './components';
import { TodayIcon, CalendarIcon, ListIcon, PantryIcon, ArchiveIcon, SunIcon, MoonIcon, CloudOnlineIcon, CloudOfflineIcon, ExportIcon, ChangeDietIcon, EditIcon, ProgressIcon } from './components/Icons';

const App: React.FC = observer(() => {
    const store = mealPlanStore;
    const notificationPermission = useRef(Notification.permission);
    
    const [showNewPlanFlow, setShowNewPlanFlow] = useState(false);
    const [showManualForm, setShowManualForm] = useState(false);
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => {
        authStore.init();
    }, []);

    useEffect(() => {
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    useEffect(() => {
        if (isDrawerOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isDrawerOpen]);

    const handleInstallClick = async () => {
        if (!installPrompt) return;
        const result = await installPrompt.prompt();
        console.log(`Install prompt user choice: ${result.userChoice}`);
        setInstallPrompt(null);
    };

    const handleDismissInstall = () => {
        setInstallPrompt(null);
    };


    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(store.theme === 'light' ? 'dark' : 'light');
        root.classList.add(store.theme);
    }, [store.theme]);
    
    useEffect(() => {
        if (store.currentPlanId) {
            setShowNewPlanFlow(false);
            setShowManualForm(false);
        }
    }, [store.currentPlanId]);

    useEffect(() => {
        if (store.currentPlanId && notificationPermission.current === 'default') {
            Notification.requestPermission().then(permission => {
                notificationPermission.current = permission;
            });
        }

        const mealTimer = setInterval(() => {
            if (!store.currentPlanId) return;

            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            store.resetSentNotificationsIfNeeded();
            
            if (notificationPermission.current === 'granted') {
                store.dailyPlan?.meals.forEach((meal, mealIndex) => {
                    if (meal.time === currentTime) {
                        const dayIndex = store.activeMealPlan.findIndex(d => d.day === store.dailyPlan?.day);
                        const key = `meal-${dayIndex}-${mealIndex}`;
                        if (!store.sentNotifications.has(key)) {
                            new Notification(t('notificationMealTitle', { mealName: meal.name }), {
                                body: t('notificationMealBody', { mealTitle: meal.title || meal.name }),
                            });
                            store.markNotificationSent(key);
                        }
                    }
                });
            }
        }, 60 * 1000);
        
        const hydrationTimer = setInterval(() => {
             if (store.currentPlanId) {
                store.updateHydrationStatus();
            }
        }, 60 * 1000);

        if (store.currentPlanId) {
            store.updateHydrationStatus();
        }

        return () => {
            clearInterval(mealTimer);
            clearInterval(hydrationTimer);
        };
    }, [store.currentPlanId]);

    const handleExport = () => {
        const dataToExport = {
            planName: store.currentPlanName,
            weeklyPlan: store.activeMealPlan,
            shoppingList: store.shoppingList,
            pantry: store.pantry,
        };

        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safePlanName = store.currentPlanName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `diet-plan-${safePlanName}-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const renderDrawerContent = () => {
        const tabs = [
            { id: 'daily', icon: <TodayIcon />, label: t('tabDaily') },
            { id: 'plan', icon: <CalendarIcon />, label: t('tabWeekly') },
            { id: 'list', icon: <ListIcon />, label: t('tabShopping') },
            { id: 'pantry', icon: <PantryIcon />, label: t('tabPantry') },
            { id: 'progress', icon: <ProgressIcon />, label: t('tabProgress') },
            { id: 'archive', icon: <ArchiveIcon />, label: t('tabArchive') },
        ];

        return (
            <div className="flex flex-col h-full">
                <div className="border-b dark:border-gray-700 pb-6">
                    <GoogleLogin />
                </div>

                {store.status === AppStatus.SUCCESS && store.currentPlanId && (
                    <div className="border-b dark:border-gray-700 py-6">
                        <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-4">{t('navigation')}</h3>
                        <div className="flex flex-col space-y-1">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => {
                                        store.setActiveTab(tab.id as any);
                                        setIsDrawerOpen(false);
                                    }}
                                    className={`flex items-center w-full text-left px-4 py-3 rounded-lg transition-colors ${store.activeTab === tab.id ? 'bg-violet-100 dark:bg-gray-700 text-violet-700 dark:text-violet-300 font-semibold' : 'bg-transparent text-gray-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700/50'}`}
                                >
                                    {tab.icon}
                                    <span className="ml-3">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                <div className="py-6 border-b dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-4">{t('planManagement')}</h3>
                    <div className="flex flex-col space-y-1">
                        <button onClick={() => { setShowNewPlanFlow(true); setShowManualForm(false); setIsDrawerOpen(false); }} className="w-full text-left bg-transparent hover:bg-violet-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold px-4 py-3 rounded-lg transition-colors flex items-center">
                            <ChangeDietIcon /> <span className="ml-3">{t('changeDiet')}</span>
                        </button>
                        <button onClick={() => { setShowManualForm(true); setShowNewPlanFlow(true); setIsDrawerOpen(false); }} className="w-full text-left bg-transparent hover:bg-violet-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold px-4 py-3 rounded-lg transition-colors flex items-center">
                            <EditIcon /> <span className="ml-3">{t('createManually')}</span>
                        </button>
                        {store.status === AppStatus.SUCCESS && store.currentPlanId && (
                            <button onClick={handleExport} className="w-full text-left bg-transparent hover:bg-violet-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold px-4 py-3 rounded-lg transition-colors flex items-center">
                                <ExportIcon /> <span className="ml-3">{t('exportPlan')}</span>
                            </button>
                        )}
                    </div>
                </div>
                
                <div className="flex-grow flex flex-col justify-end">
                    <div className="pt-6 space-y-4 px-4">
                        <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('settings')}</h3>
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
                        <div className="flex items-center justify-between bg-slate-50 dark:bg-gray-700/50 p-3 rounded-lg" title={store.onlineMode ? t('onlineModeTitle') : t('offlineModeTitle')}>
                            <span className="font-medium text-gray-700 dark:text-gray-300">{t('connectionStatus')}</span>
                            <div className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-md">
                                {store.onlineMode ? <CloudOnlineIcon /> : <CloudOfflineIcon />}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const renderMainContent = () => {
        if (store.status === AppStatus.HYDRATING || store.status === AppStatus.SYNCING) return <Loader />;
        if (store.status === AppStatus.LOADING) return <Loader />;
        if (store.status === AppStatus.ERROR) {
            return ( <div className="text-center"><ErrorMessage message={store.error!} /><div className="mt-8"><h2 className="text-2xl font-bold dark:text-gray-200 text-gray-800 mb-4">{t('errorAndUpload')}</h2><FileUpload /></div></div> );
        }

        const hasActivePlan = store.status === AppStatus.SUCCESS && store.currentPlanId;

        if (hasActivePlan && !showNewPlanFlow) {
            return (
                <>
                    <ActivePlanNameEditor />
                    {store.activeTab === 'daily' && <DailyPlanView />}
                    {store.activeTab === 'plan' && <WeeklyCalendarView />}
                    {store.activeTab === 'list' && <ShoppingListView />}
                    {store.activeTab === 'pantry' && <PantryView />}
                    {store.activeTab === 'progress' && <ProgressView />}
                    {store.activeTab === 'archive' && <ArchiveView />}
                </>
            );
        }

        if (showManualForm) {
            return <ManualPlanEntryForm onCancel={() => { setShowManualForm(false); if (store.currentPlanId) setShowNewPlanFlow(false); }} />;
        }
        
        return (
            <div className="text-center">
                 {hasActivePlan && (
                    <div className="mb-10">
                        <button 
                            onClick={() => setShowNewPlanFlow(false)}
                            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold px-8 py-3 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors shadow-md"
                        >
                            {t('cancelAndReturn')}
                        </button>
                    </div>
                )}
                <div className="pt-8">
                    <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('welcomeTitle')}</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-2xl mx-auto">{t('welcomeSubtitle')}</p>
                </div>
                
                <div className="max-w-4xl mx-auto">
                    <FileUpload />
                </div>
                
                 {store.archivedPlans.length > 0 && (
                    <div className="mt-12 max-w-4xl mx-auto">
                        <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-4 border-t dark:border-gray-700 pt-8">{t('restoreFromArchiveTitle')}</h3>
                        <div className="space-y-4">
                            {store.archivedPlans.slice().reverse().map((archive) => (
                                <ArchivedPlanItem key={archive.id} archive={archive} />
                            ))}
                        </div>
                    </div>
                )}

                {store.archivedPlans.length === 0 && <ExamplePdf />}
            </div>
        );
    };

    return (
        <div className="min-h-screen">
            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
                {renderDrawerContent()}
            </Drawer>
            <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-30 shadow-sm border-b border-slate-200 dark:border-gray-800">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-3 items-center h-16">
                        <div className="justify-self-start">
                            <button
                                onClick={() => setIsDrawerOpen(true)}
                                className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                                aria-label="Open menu"
                            >
                                <MenuIcon />
                            </button>
                        </div>
                        
                        <div className="text-center">
                            <h1 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600">{t('mainTitle')}</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{t('mainSubtitle')}</p>
                        </div>

                        <div />
                    </div>
                </div>
            </header>
            <main className="pt-8 p-4 sm:p-6 lg:p-8">{renderMainContent()}</main>
            <footer className="text-center mt-12 text-sm text-gray-400 dark:text-gray-500 p-4"><p>{t('footer')}</p></footer>
            {installPrompt && <InstallPwaSnackbar onInstall={handleInstallClick} onDismiss={handleDismissInstall} />}
        </div>
    );
});

export default App;
