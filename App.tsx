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
    MealPlanView,
    DailyPlanView,
    ArchiveView,
    ActivePlanNameEditor,
    ExamplePdf,
    ManualPlanEntryForm,
    ArchivedPlanItem,
    InstallPwaSnackbar,
    GoogleLogin,
    JsonImportButton,
    Drawer,
    MenuIcon
} from './components';
import { TodayIcon, CalendarIcon, ListIcon, PantryIcon, ArchiveIcon, SunIcon, MoonIcon, CloudOnlineIcon, CloudOfflineIcon, ExportIcon, ChangeDietIcon } from './components/Icons';

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
        // When a new plan is created or an old one is cleared/restored,
        // ensure we exit the "new plan" flow.
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

        // Timer for MEALS (checks every minute)
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
        
        // Timer for HYDRATION (checks every minute)
        const hydrationTimer = setInterval(() => {
             if (store.currentPlanId) {
                store.updateHydrationStatus();
            }
        }, 60 * 1000);

        // Initial check on load
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

    const renderDrawerContent = () => (
        <div className="flex flex-col h-full space-y-6">
            {/* User Profile / Login */}
            <div className="border-b dark:border-gray-700 pb-6">
                <GoogleLogin />
            </div>

            {/* Plan Management */}
            {store.status === AppStatus.SUCCESS && store.currentPlanId && (
                <div className="flex flex-col space-y-4">
                    <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('planManagement')}</h3>
                    <button onClick={() => { setShowNewPlanFlow(true); setIsDrawerOpen(false); }} className="w-full text-left bg-transparent hover:bg-violet-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold px-4 py-3 rounded-lg transition-colors flex items-center">
                        <ChangeDietIcon /> <span className="ml-3">{t('changeDiet')}</span>
                    </button>
                    <button onClick={handleExport} className="w-full text-left bg-transparent hover:bg-violet-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold px-4 py-3 rounded-lg transition-colors flex items-center">
                        <ExportIcon /> <span className="ml-3">{t('exportPlan')}</span>
                    </button>
                </div>
            )}
            
            {/* Settings */}
            <div className="flex-grow flex flex-col justify-end">
                <div className="border-t dark:border-gray-700 pt-6 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{t('settings')}</h3>
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-gray-700/50 p-3 rounded-lg">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{t('theme')}</span>
                        <button onClick={() => store.setTheme(store.theme === 'light' ? 'dark' : 'light')} className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-md hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
                            {store.theme === 'light' ? <MoonIcon /> : <SunIcon />}
                        </button>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-gray-700/50 p-3 rounded-lg">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{t('language')}</span>
                        <button onClick={() => store.setLocale(store.locale === 'it' ? 'en' : 'it')} className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-md hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors font-bold text-violet-600 dark:text-violet-400">
                            {store.locale.toUpperCase()}
                        </button>
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

    const renderMainContent = () => {
        if (store.status === AppStatus.HYDRATING) return <Loader />;
        if (store.status === AppStatus.LOADING) return <Loader />;
        if (store.status === AppStatus.ERROR) {
            return ( <div className="text-center"><ErrorMessage message={store.error!} /><div className="mt-8"><h2 className="text-2xl font-bold dark:text-gray-200 text-gray-800 mb-4">{t('errorAndUpload')}</h2><FileUpload /></div></div> );
        }

        const hasActivePlan = store.status === AppStatus.SUCCESS && store.currentPlanId;

        if (hasActivePlan && !showNewPlanFlow) {
            const tabs = [
                { id: 'daily', icon: <TodayIcon />, label: t('tabDaily') },
                { id: 'plan', icon: <CalendarIcon />, label: t('tabWeekly') },
                { id: 'list', icon: <ListIcon />, label: t('tabShopping') },
                { id: 'pantry', icon: <PantryIcon />, label: t('tabPantry') },
                { id: 'archive', icon: <ArchiveIcon />, label: t('tabArchive') },
            ];
            return (
                <>
                    <ActivePlanNameEditor />
                    <div className="mb-8 flex justify-center flex-wrap gap-2 bg-white dark:bg-gray-800 p-2 rounded-full shadow-md max-w-2xl mx-auto">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => store.setActiveTab(tab.id as any)} className={`flex items-center justify-center flex-grow px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${store.activeTab === tab.id ? 'bg-violet-600 text-white shadow-md' : 'bg-transparent text-gray-600 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-gray-700'}`}>
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>
                    {store.activeTab === 'daily' && <DailyPlanView />}
                    {store.activeTab === 'plan' && <MealPlanView plan={store.activeMealPlan} />}
                    {store.activeTab === 'list' && <ShoppingListView />}
                    {store.activeTab === 'pantry' && <PantryView />}
                    {store.activeTab === 'archive' && <ArchiveView />}
                </>
            );
        }

        // New Plan View / Initial View
        if (showManualForm) {
            return <ManualPlanEntryForm onCancel={() => setShowManualForm(false)} />;
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
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    <div>
                        <h3 className="text-xl font-semibold mb-3 text-gray-700 dark:text-gray-300">{t('uploadPdfTitle')}</h3>
                        <FileUpload />
                    </div>
                    <div>
                        <h3 className="text-xl font-semibold mb-3 text-gray-700 dark:text-gray-300">{t('importJsonTitle')}</h3>
                        <JsonImportButton />
                    </div>
                </div>

                <div className="mt-8 text-gray-600 dark:text-gray-400">
                   {t('or')}
                   <button onClick={() => setShowManualForm(true)} className="ml-2 text-violet-600 dark:text-violet-400 font-semibold hover:underline">
                       {t('orCreateManually')}
                   </button>
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
                        {/* Left side: Menu button */}
                        <div className="justify-self-start">
                            <button
                                onClick={() => setIsDrawerOpen(true)}
                                className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                                aria-label="Open menu"
                            >
                                <MenuIcon />
                            </button>
                        </div>
                        
                        {/* Center: Title */}
                        <div className="text-center">
                            <h1 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600">{t('mainTitle')}</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{t('mainSubtitle')}</p>
                        </div>

                        {/* Right side: Empty placeholder for balance */}
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
