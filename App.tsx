import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore, AppStatus, NavigableTab } from './stores/MealPlanStore';
import { authStore } from './stores/AuthStore';
import { uiStore } from './stores/UIStore';
import { t, setI18nLocaleGetter } from './i18n';
import { syncWithDrive } from './services/syncService';

import Loader from './components/Loader';
import ErrorMessage from './components/ErrorMessage';
import ShoppingListView from './components/ShoppingListView';
import PantryView from './components/PantryView';
import MealPlanView from './components/MealPlanView';
import DailyPlanView from './components/DailyPlanView';
import ArchiveView from './components/ArchiveView';
import ActivePlanNameEditor from './components/ActivePlanNameEditor';
import InstallPwaSnackbar from './components/InstallPwaSnackbar';
import GoogleLogin from './components/GoogleLogin';
import Drawer from './components/Drawer';
import ProgressView from './components/ProgressView';
import SetPlanDatesModal from './components/SetPlanDatesModal';
import CalendarView from './components/CalendarView';
import LoginSuggestionModal from './components/LoginSuggestionModal';
import SettingsView from './components/SettingsView';
import DashboardView from './components/DashboardView';
import AdminLoginPage from './components/admin/AdminLoginPage';
import NutritionistPage from './components/admin/NutritionistPage';
import NotFoundPage from './components/admin/NotFoundPage';
import FileUploadScreen from './components/FileUploadScreen';
import InfoModal from './components/InfoModal';
import ConfirmationModal from './components/ConfirmationModal';

import { TodayIcon, CalendarIcon, ListIcon, PantryIcon, ArchiveIcon, ExportIcon, ChangeDietIcon, EditIcon, ProgressIcon, SettingsIcon, SparklesIcon, ExitIcon, DashboardIcon, ArrowLeftIcon, MenuIcon, AdminIcon } from './components/Icons';

const MainAppContent: React.FC = observer(() => {
    const store = mealPlanStore;

    if (store.status === AppStatus.HYDRATING || store.status === AppStatus.SYNCING) return <Loader />;
    if (store.status === AppStatus.LOADING) return <Loader />;
    if (store.status === AppStatus.ERROR) {
        return ( <div className="text-center"><ErrorMessage message={store.error!} /><div className="mt-8"><button onClick={() => store.navigateTo('upload')} className="text-2xl font-bold dark:text-gray-200 text-gray-800 mb-4 hover:underline">{t('errorAndUpload')}</button><FileUploadScreen /></div></div> );
    }

    const hasActivePlan = store.status === AppStatus.SUCCESS && store.currentPlanId;

    const renderActiveTab = () => {
        if (!hasActivePlan) {
            switch (store.activeTab) {
                case 'settings': return <SettingsView />;
                case 'archive': return <ArchiveView />;
                case 'upload': return <FileUploadScreen />;
                default: return <FileUploadScreen />;
            }
        }

        switch (store.activeTab) {
            case 'dashboard': return <DashboardView />;
            case 'daily': return <DailyPlanView />;
            case 'calendar': return <CalendarView />;
            case 'plan': return <MealPlanView plan={store.masterMealPlan} isMasterPlanView={true} />;
            case 'list': return <ShoppingListView />;
            case 'pantry': return <PantryView />;
            case 'progress': return <ProgressView />;
            case 'archive': return <ArchiveView />;
            case 'settings': return <SettingsView />;
            case 'upload': return <FileUploadScreen />;
            default: return <DashboardView />;
        }
    };
    
    return (
        <>
            {hasActivePlan && store.activeTab !== 'upload' && <ActivePlanNameEditor />}
            {renderActiveTab()}
        </>
    );
});


const MainAppLayout: React.FC = observer(() => {
    const store = mealPlanStore;
    setI18nLocaleGetter(() => store.locale);
    
    const [installPrompt, setInstallPrompt] = useState<any>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [showLoginSuggestion, setShowLoginSuggestion] = useState(false);
    
    const handleBack = () => window.history.back();

    useEffect(() => {
        const initializeApp = async () => {
            const restoredToken = await authStore.init();
            if (restoredToken) {
                // This will sync and then call mealPlanStore.init() inside its finally block
                await syncWithDrive(restoredToken);
            } else {
                // No session, just init the meal plan store with local data (or none)
                await mealPlanStore.init();
            }
        };
        initializeApp();
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
            { id: 'dashboard', icon: <DashboardIcon />, label: t('tabDashboard') },
            { id: 'daily', icon: <TodayIcon />, label: t('tabDaily') },
            { id: 'calendar', icon: <CalendarIcon />, label: t('tabCalendar') },
            { id: 'plan', icon: <EditIcon />, label: t('tabWeekly') },
            { id: 'list', icon: <ListIcon />, label: t('tabShopping') },
            { id: 'pantry', icon: <PantryIcon />, label: t('tabPantry') },
            { id: 'progress', icon: <ProgressIcon />, label: t('tabProgress') },
        ];
        
        const generalTabs = [
            { id: 'archive', icon: <ArchiveIcon />, label: t('tabArchive') },
            { id: 'settings', icon: <SettingsIcon />, label: t('tabSettings') },
        ];

        const handleNavigate = (tab: NavigableTab) => {
            store.navigateTo(tab);
            setIsDrawerOpen(false);
        };

        const renderTab = (tab: { id: string, icon: React.ReactNode, label: string, disabled?: boolean }) => (
            <button
                key={tab.id}
                onClick={() => !tab.disabled && handleNavigate(tab.id as NavigableTab)}
                disabled={tab.disabled}
                className={`flex items-center w-full text-left px-4 py-3 rounded-lg transition-colors ${store.activeTab === tab.id ? 'bg-violet-100 dark:bg-gray-700 text-violet-700 dark:text-violet-300 font-semibold' : 'bg-transparent text-gray-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700/50'} ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                title={tab.disabled ? t('shoppingListSetupMessage') : ''}
                aria-disabled={tab.disabled}
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
                        <button onClick={() => handleNavigate('upload')} className="w-full text-left bg-transparent hover:bg-violet-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold px-4 py-3 rounded-lg transition-colors flex items-center">
                            <ChangeDietIcon /> <span className="ml-3">{t('changeDiet')}</span>
                        </button>
                        {store.status === AppStatus.SUCCESS && store.currentPlanId && (
                            <button onClick={handleExport} className="w-full text-left bg-transparent hover:bg-violet-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-semibold px-4 py-3 rounded-lg transition-colors flex items-center">
                                <ExportIcon /> <span className="ml-3">{t('exportPlan')}</span>
                            </button>
                        )}
                    </div>
                </div>
                
                {/*{process.env.BUILD_TYPE === 'web' && (*/}
                     {(
                    <div className="px-4 pb-4 mt-auto">
                        <button onClick={() => {
                                window.history.pushState({}, '', '/admin');
                                window.dispatchEvent(new PopStateEvent('popstate'));
                                setIsDrawerOpen(false);
                            }} className="flex items-center gap-3 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors w-full text-left">
                            <AdminIcon />
                            <span>{t('adminLoginTitle')}</span>
                        </button>
                    </div>
                )}


                {renderExitSimulationButton()}
            </div>
        );
    }

    const showBackButton = store.activeTab === 'upload' && !!store.currentPlanId;

    return (
        <div className="min-h-screen">
            {store.status === AppStatus.AWAITING_DATES && <SetPlanDatesModal />}
            {showLoginSuggestion && <LoginSuggestionModal onClose={handleCloseLoginSuggestion} />}
            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}>
                {renderDrawerContent()}
            </Drawer>
            <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-30 shadow-sm border-b border-slate-200 dark:border-gray-800">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-3 items-center h-16">
                        <div className="justify-self-start">
                            {showBackButton && (
                                <button
                                    onClick={handleBack}
                                    className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors"
                                    aria-label="Go back"
                                >
                                    <ArrowLeftIcon />
                                </button>
                            )}
                        </div>
                        
                        <div className="text-center">
                            <button onClick={() => store.navigateTo('dashboard')} className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600">{t('mainTitle')}</button>
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
            <main className="pt-8 p-4 sm:p-6 lg:p-8">
                <div key={store.activeTab} className="animate-slide-in-up">
                    <MainAppContent />
                </div>
            </main>
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

const App: React.FC = observer(() => {
    const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(
        () => sessionStorage.getItem('isAdminAuthenticated') === 'true'
    );
    
    const getPathFromUrl = () => window.location.pathname.replace(/^\//, '').split('/')[0] || 'dashboard';
    const [currentPath, setCurrentPath] = useState(getPathFromUrl());

    const { infoModal, hideInfoModal, confirmationModal, hideConfirmationModal } = uiStore;

    useEffect(() => {
        const handleLocationChange = () => {
            const path = getPathFromUrl();
            setCurrentPath(path);
            
            const adminRoutes = ['admin', 'nutritionist', '404'];
            if (!adminRoutes.includes(path)) {
                mealPlanStore.setActiveTab(path as NavigableTab);
            }
        };

        window.addEventListener('popstate', handleLocationChange);
        
        // Initial check to set the correct tab from the URL on load.
        handleLocationChange();
        // Also replace the initial state to ensure our state object is there if the user navigates away and back.
        window.history.replaceState({ tab: getPathFromUrl() }, '', window.location.href);

        return () => window.removeEventListener('popstate', handleLocationChange);
    }, []);

    const handleAdminLogin = () => {
        sessionStorage.setItem('isAdminAuthenticated', 'true');
        setIsAdminAuthenticated(true);
        window.history.pushState({}, '', '/nutritionist');
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    const handleAdminLogout = () => {
        sessionStorage.removeItem('isAdminAuthenticated');
        setIsAdminAuthenticated(false);
        window.history.pushState({}, '', '/admin');
        window.dispatchEvent(new PopStateEvent('popstate'));
    };

    const renderPage = () => {
        switch (currentPath) {
            case 'admin':
                return <AdminLoginPage onLoginSuccess={handleAdminLogin} />;
            case 'nutritionist':
                return isAdminAuthenticated ? <NutritionistPage onLogout={handleAdminLogout} /> : <NotFoundPage />;
            case '404':
                return <NotFoundPage />;
            default:
                return <MainAppLayout />;
        }
    };

    return (
        <>
            <InfoModal 
                isOpen={infoModal.isOpen}
                onClose={hideInfoModal}
                title={infoModal.title}
            >
                {infoModal.message}
            </InfoModal>
            <ConfirmationModal
                isOpen={confirmationModal.isOpen}
                onClose={hideConfirmationModal}
                onConfirm={confirmationModal.onConfirm}
                title={confirmationModal.title}
            >
                {confirmationModal.message}
            </ConfirmationModal>
            {renderPage()}
        </>
    );
});

export default App;