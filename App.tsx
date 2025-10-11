import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore, AppStatus } from './stores/MealPlanStore';
import { authStore } from './stores/AuthStore';
import { t, setI18nLocaleGetter } from './i18n';
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
    Drawer,
    MenuIcon,
    ProgressView,
    SetPlanDatesModal,
    CalendarView,
    LoginSuggestionModal,
    SettingsView,
    DashboardView,
} from './components';
import { TodayIcon, CalendarIcon, ListIcon, PantryIcon, ArchiveIcon, ExportIcon, ChangeDietIcon, EditIcon, ProgressIcon, SettingsIcon, SparklesIcon, ExitIcon, DashboardIcon, ArrowLeftIcon } from './components/Icons';

const App: React.FC = observer(() => {
    const store = mealPlanStore;
    setI18nLocaleGetter(() => store.locale);
    
    const [showNewPlanFlow, setShowNewPlanFlow] = useState(false);
    const [showManualForm, setShowManualForm] = useState(false);
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [showLoginSuggestion, setShowLoginSuggestion] = useState(false);

    useEffect(() => {
        authStore.init();
    }, []);

    useEffect(() => {
        if (authStore.status === 'LOGGED_OUT') {
            const hasSeenLoginSuggestion = sessionStorage.getItem('hasSeenLoginSuggestion');
            if (!hasSeenLoginSuggestion) {
                setShowLoginSuggestion(true);
            }
        } else if (authStore.status === 'LOGGED_IN') {
            setShowLoginSuggestion(false);
        }
    }, [authStore.status]);

    const handleCloseLoginSuggestion = () => {
        setShowLoginSuggestion(false);
        sessionStorage.setItem('hasSeenLoginSuggestion', 'true');
    };

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
        const mealTimer = setInterval(() => {
            if (!store.currentPlanId || !store.dailyPlan) return;

            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            store.resetSentNotificationsIfNeeded();
            
            if (Notification.permission === 'granted') {
                store.dailyPlan?.meals.forEach((meal, mealIndex) => {
                    if (meal.time === currentTime) {
                        const dayIndex = store.masterMealPlan.findIndex(d => d.day === store.dailyPlan?.day);
                        const key = `meal-${dayIndex}-${mealIndex}`;
                        if (!store.sentNotifications.has(key)) {
                            new Notification(t('notificationMealTitle', { mealName: meal.name }), {
                                body: t('notificationMealBody', { mealTitle: meal.title || meal.name }),
                                icon: 'icon-192x192.png'
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
    }, [store, store.currentPlanId]);

    const handleExport = () => {
        const dataToExport = {
            planName: store.currentPlanName,
            weeklyPlan: store.masterMealPlan,
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
        const isPlanLocked = !store.shoppingListManaged && !!store.currentPlanId;
        const planSpecificTabs = [
            { id: 'dashboard', icon: <DashboardIcon />, label: t('tabDashboard'), disabled: isPlanLocked },
            { id: 'daily', icon: <TodayIcon />, label: t('tabDaily'), disabled: isPlanLocked },
            { id: 'calendar', icon: <CalendarIcon />, label: t('tabCalendar'), disabled: isPlanLocked },
            { id: 'plan', icon: <EditIcon />, label: t('tabWeekly') },
            { id: 'list', icon: <ListIcon />, label: t('tabShopping') },
            { id: 'pantry', icon: <PantryIcon />, label: t('tabPantry') },
            { id: 'progress', icon: <ProgressIcon />, label: t('tabProgress'), disabled: isPlanLocked },
        ];
        
        const generalTabs = [
            { id: 'archive', icon: <ArchiveIcon />, label: t('tabArchive') },
            { id: 'settings', icon: <SettingsIcon />, label: t('tabSettings') },
        ];

        // Fix: Replace JSX.Element with React.ReactNode to resolve "Cannot find namespace 'JSX'" error.
        const renderTab = (tab: { id: string, icon: React.ReactNode, label: string, disabled?: boolean }) => (
             <button
                key={tab.id}
                onClick={() => {
                    store.setActiveTab(tab.id as any);
                    setShowNewPlanFlow(false);
                    setIsDrawerOpen(false);
                }}
                disabled={tab.disabled}
                className={`flex items-center w-full text-left px-4 py-3 rounded-lg transition-colors ${store.activeTab === tab.id ? 'bg-violet-100 dark:bg-gray-700 text-violet-700 dark:text-violet-300 font-semibold' : 'bg-transparent text-gray-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700/50'} ${tab.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={tab.disabled ? t('shoppingListSetupMessage') : ''}
            >
                {tab.icon}
                <span className="ml-3">{tab.label}</span>
            </button>
        );
        
        const renderSimulateButton = () => {
            if (authStore.status === 'LOGGED_OUT' && !store.currentPlanId) {
                return (
                    <div className="border-b dark:border-gray-700 py-6">
                         <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-4">{t('simulateAppDescription')}</h3>
                         <button
                            onClick={() => {
                                store.startSimulation();
                                setIsDrawerOpen(false);
                            }}
                            className="flex items-center w-full text-left px-4 py-3 rounded-lg bg-violet-500 text-white font-semibold hover:bg-violet-600 transition-colors shadow-md hover:shadow-lg"
                            title={t('simulateAppTitle')}
                        >
                            <SparklesIcon />
                            <span className="ml-3">{t('simulateApp')}</span>
                        </button>
                    </div>
                );
            }
            return null;
        }

        const renderExitSimulationButton = () => {
            if (store.currentPlanId === 'simulated_plan_123') {
                return (
                    <div className="border-t dark:border-gray-700 pt-6 pb-2">
                         <button
                            onClick={() => {
                                store.exitSimulation();
                                setIsDrawerOpen(false);
                            }}
                            className="flex items-center w-full text-left px-4 py-3 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors shadow-md hover:shadow-lg"
                            title={t('exitSimulationTitle')}
                        >
                            <ExitIcon />
                            <span className="ml-3">{t('exitSimulation')}</span>
                        </button>
                    </div>
                );
            }
            return null;
        }

        return (
            <div className="flex flex-col h-full">
                <div className="border-b dark:border-gray-700 pb-6">
                    <GoogleLogin />
                </div>

                {renderSimulateButton()}

                <div className="border-b dark:border-gray-700 py-6">
                    <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-4">{t('navigation')}</h3>
                    <div className="flex flex-col space-y-1">
                        {store.status === AppStatus.SUCCESS && store.currentPlanId && (
                            planSpecificTabs.map(renderTab)
                        )}
                        {generalTabs.map(renderTab)}
                    </div>
                </div>

                <div className="py-6 flex-grow">
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
                {renderExitSimulationButton()}
            </div>
        );
    }
    
    const renderUploadScreen = () => {
        const hasActivePlan = store.status === AppStatus.SUCCESS && store.currentPlanId;
        return (
            <div className="text-center">
                {hasActivePlan && showNewPlanFlow && (
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

    const renderMainContent = () => {
        if (store.status === AppStatus.HYDRATING || store.status === AppStatus.SYNCING) return <Loader />;
        if (store.status === AppStatus.LOADING) return <Loader />;
        if (store.status === AppStatus.AWAITING_DATES) return <SetPlanDatesModal />;
        if (store.status === AppStatus.ERROR) {
            return ( <div className="text-center"><ErrorMessage message={store.error!} /><div className="mt-8"><h2 className="text-2xl font-bold dark:text-gray-200 text-gray-800 mb-4">{t('errorAndUpload')}</h2><FileUpload /></div></div> );
        }

        // New plan flow is a special state that overrides tab navigation
        if (showNewPlanFlow) {
            if (showManualForm) {
                return <ManualPlanEntryForm onCancel={() => { setShowManualForm(false); if (store.currentPlanId) setShowNewPlanFlow(false); }} />;
            }
            return renderUploadScreen();
        }

        const hasActivePlan = store.status === AppStatus.SUCCESS && store.currentPlanId;

        // If no active plan, show a limited set of views
        if (!hasActivePlan) {
            if (store.activeTab === 'settings') return <SettingsView />;
            if (store.activeTab === 'archive') return <ArchiveView />;
            return renderUploadScreen(); // Default for initial state
        }
        
        // Main router for when a plan is active
        let activeContent;
        switch(store.activeTab) {
            case 'dashboard':
                activeContent = <DashboardView />;
                break;
            case 'daily':
                activeContent = <DailyPlanView />;
                break;
            case 'calendar':
                activeContent = <CalendarView />;
                break;
            case 'plan':
                activeContent = <MealPlanView plan={store.masterMealPlan} isMasterPlanView={true} />;
                break;
            case 'list':
                activeContent = <ShoppingListView />;
                break;
            case 'pantry':
                activeContent = <PantryView />;
                break;
            case 'progress':
                activeContent = <ProgressView />;
                break;
            case 'archive':
                activeContent = <ArchiveView />;
                break;
            case 'settings':
                activeContent = <SettingsView />;
                break;
            default:
                activeContent = <DashboardView />;
        }

        return (
            <>
                <ActivePlanNameEditor />
                {activeContent}
            </>
        );
    };

    return (
        <div className="min-h-screen">
            {showLoginSuggestion && <LoginSuggestionModal onClose={handleCloseLoginSuggestion} />}
            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
                {renderDrawerContent()}
            </Drawer>
            <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-30 shadow-sm border-b border-slate-200 dark:border-gray-800">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-3 items-center h-16">
                        <div className="justify-self-start">
                            {store.navigationHistory.length > 0 && (
                                <button
                                    onClick={store.goBack}
                                    className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                                    aria-label="Go back"
                                >
                                    <ArrowLeftIcon />
                                </button>
                            )}
                        </div>
                        
                        <div className="text-center">
                            <h1 className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600">{t('mainTitle')}</h1>
                            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{t('mainSubtitle')}</p>
                        </div>

                        <div className="justify-self-end">
                            <button
                                onClick={() => setIsDrawerOpen(true)}
                                className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                                aria-label="Open menu"
                            >
                                <MenuIcon />
                            </button>
                        </div>
                    </div>
                </div>
            </header>
            <main className="pt-8 p-4 sm:p-6 lg:p-8">{renderMainContent()}</main>
            <footer className="text-center mt-12 text-sm text-gray-400 dark:text-gray-500 p-4"><p>{t('footer')}</p></footer>
            
            {store.recalculatingProgress && (
                <div 
                    className="fixed bottom-6 right-6 z-50 bg-violet-600 text-white p-4 rounded-full shadow-lg flex items-center justify-center transition-opacity duration-300 animate-pulse"
                    role="status"
                    aria-live="polite"
                    title={t('recalculatingProgressButtonTextLoading')}
                >
                    <div className="animate-spin h-6 w-6 border-4 border-solid border-white border-t-transparent rounded-full"></div>
                </div>
            )}

            {installPrompt && <InstallPwaSnackbar onInstall={handleInstallClick} onDismiss={handleDismissInstall} />}
        </div>
    );
});

export default App;
