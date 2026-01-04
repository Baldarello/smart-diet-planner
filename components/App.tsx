
import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';
// Fix: corrected import for NavigableTab
import { mealPlanStore, AppStatus, NavigableTab } from '../stores/MealPlanStore';
import { authStore } from '../stores/AuthStore';
import { uiStore } from '../stores/UIStore';
import { t, setI18nLocaleGetter } from '../i18n';
import { syncWithDrive, syncNutritionistData } from '../services/syncService';
import { initGoogleAuth, handleSignOut } from '../services/authService';
import { setupDbListeners } from '../services/dbListeners';

import Loader from './Loader';
import ErrorMessage from './ErrorMessage';
import ShoppingListView from './ShoppingListView';
import PantryView from './PantryView';
import MealPlanView from './MealPlanView';
import DailyPlanView from './DailyPlanView';
import ArchiveView from './ArchiveView';
import ActivePlanNameEditor from './ActivePlanNameEditor';
import InstallPwaSnackbar from './InstallPwaSnackbar';
import GoogleLogin from './GoogleLogin';
import Drawer from './Drawer';
import ProgressView from './ProgressView';
import SetPlanDatesModal from './SetPlanDatesModal';
import CalendarView from './CalendarView';
import LoginSuggestionModal from './LoginSuggestionModal';
import SettingsView from './SettingsView';
import DashboardView from './DashboardView';
import AdminLoginPage from './admin/AdminLoginPage';
import NutritionistPage from './admin/NutritionistPage';
import NotFoundPage from './admin/NotFoundPage';
import FileUploadScreen from './FileUploadScreen';
import InfoModal from './InfoModal';
import ConfirmationModal from './ConfirmationModal';
import AchievementsModal from './AchievementsModal';
import HomePage from './HomePage';

import { TodayIcon, CalendarIcon, ListIcon, PantryIcon, ArchiveIcon, UploadIcon, EditIcon, ProgressIcon, SettingsIcon, SparklesIcon, ExitIcon, DashboardIcon, ArrowLeftIcon, MenuIcon, AdminIcon } from './Icons';

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
                default: return <HomePage />;
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
        if (authStore.status === 'LOGGED_OUT') {
            const hasSeenLoginSuggestion = sessionStorage.getItem('hasSeenLoginSuggestion');
            if (!hasSeenLoginSuggestion) setShowLoginSuggestion(true);
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
        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    useEffect(() => {
        if (isDrawerOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isDrawerOpen]);

    const handleInstallClick = async () => {
        if (!installPrompt) return;
        await installPrompt.prompt();
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
        // Fix: correctly call updateHydrationStatus from store
        const hydrationTimer = setInterval(() => { if (store.currentPlanId) store.updateHydrationStatus(); }, 60 * 1000);
        if (store.currentPlanId) store.updateHydrationStatus();
        return () => { clearInterval(mealTimer); clearInterval(hydrationTimer); };
    }, [store, store.currentPlanId]);

    const renderDrawerContent = () => {
        const planSpecificTabs = [
            { id: 'dashboard', icon: <DashboardIcon />, label: t('tabDashboard') },
            { id: 'daily', icon: <TodayIcon />, label: t('tabDaily') },
            { id: 'calendar', icon: <CalendarIcon />, label: t('tabCalendar') },
            { id: 'plan', icon: <EditIcon />, label: t('tabWeekly') },
            { id: 'list', icon: <ListIcon />, label: t('tabShopping') },
            { id: 'pantry', icon: <PantryIcon />, label: t('tabPantry') },
            { id: 'progress', icon: <ProgressIcon />, label: t('tabProgress') },
        ];
        
        const handleNavigate = (tab: NavigableTab) => { store.navigateTo(tab); setIsDrawerOpen(false); };

        const renderTab = (tab: { id: string, icon: React.ReactNode, label: string, disabled?: boolean }) => (
            <button
                key={tab.id}
                onClick={() => !tab.disabled && handleNavigate(tab.id as NavigableTab)}
                disabled={tab.disabled}
                className={`flex items-center w-full text-left px-4 py-3 rounded-lg transition-colors ${store.activeTab === tab.id ? 'bg-violet-100 dark:bg-gray-700 text-violet-700 dark:text-violet-300 font-semibold' : 'bg-transparent text-gray-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700/50'} ${tab.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
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
                         <div className="space-y-2 px-4">
                            <button
                                onClick={() => { store.startSimulationClassic(); setIsDrawerOpen(false); }}
                                className="flex items-center w-full text-left px-4 py-2 rounded-lg bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 transition-colors shadow-md"
                            >
                                <SparklesIcon />
                                <span className="ml-3">{t('simulateAppClassic')}</span>
                            </button>
                            <button
                                onClick={() => { store.startSimulationGeneric(); setIsDrawerOpen(false); }}
                                className="flex items-center w-full text-left px-4 py-2 rounded-lg bg-purple-500 text-white text-sm font-semibold hover:bg-purple-600 transition-colors shadow-md"
                            >
                                <SparklesIcon />
                                <span className="ml-3">{t('simulateAppGeneric')}</span>
                            </button>
                         </div>
                    </div>
                );
            }
            return null;
        }

        const renderExitSimulationButton = () => {
            if (store.currentPlanId?.startsWith('sim_')) {
                return (
                    <div className="border-t dark:border-gray-700 pt-6 pb-2">
                         <button
                            onClick={() => { store.exitSimulation(); setIsDrawerOpen(false); }}
                            className="flex items-center w-full text-left px-4 py-3 rounded-lg bg-red-500 text-white font-semibold hover:bg-red-600 transition-colors shadow-md"
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
                <div className="flex-shrink-0">
                    <div className="border-b dark:border-gray-700 pb-6">
                        <GoogleLogin />
                    </div>
                    {renderSimulateButton()}
                    {store.status === AppStatus.SUCCESS && store.currentPlanId && (
                        <div className="py-6">
                            <h3 className="text-sm font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-4">{t('navigation')}</h3>
                            <div className="flex flex-col space-y-1"> {planSpecificTabs.map(renderTab)} </div>
                        </div>
                    )}
                </div>
                <div className="flex-grow"></div>
                <div className="flex-shrink-0">
                    <div className="py-6 border-t dark:border-gray-700">
                        <div className="flex flex-col space-y-1"> {renderTab({ id: 'settings', icon: <SettingsIcon />, label: t('tabSettings') })} </div>
                    </div>
                    <div className="px-4 pb-4">
                        <button onClick={() => {
                                window.history.pushState({}, '', '/admin');
                                window.dispatchEvent(new PopStateEvent('popstate'));
                                setIsDrawerOpen(false);
                            }} className="flex items-center gap-3 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors w-full text-left">
                            <AdminIcon />
                            <span>{t('adminLoginTitle')}</span>
                        </button>
                    </div>
                    {renderExitSimulationButton()}
                </div>
            </div>
        );
    }

    const showBackButton = store.activeTab === 'upload' && !!store.currentPlanId;

    return (
        <div className="min-h-screen">
            {store.status === AppStatus.AWAITING_DATES && <SetPlanDatesModal />}
            {showLoginSuggestion && <LoginSuggestionModal onClose={handleCloseLoginSuggestion} />}
            <Drawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)}> {renderDrawerContent()} </Drawer>
            <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm sticky top-0 z-30 shadow-sm border-b border-slate-200 dark:border-gray-800">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-3 items-center h-16">
                        <div className="justify-self-start">
                            {showBackButton && (
                                <button onClick={handleBack} className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors" aria-label="Go back">
                                    <ArrowLeftIcon />
                                </button>
                            )}
                        </div>
                        <div className="text-center">
                            <button onClick={() => store.navigateTo('dashboard')} className="text-xl sm:text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600">{t('mainTitle')}</button>
                            <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">{t('mainSubtitle', { version: process.env.APP_VERSION })}</p>
                        </div>
                        <div className="justify-self-end">
                            <button onClick={() => setIsDrawerOpen(true)} className="p-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors" aria-label="Open menu">
                                <MenuIcon />
                            </button>
                        </div>
                    </div>
                </div>
            </header>
            <main className="pt-8 p-4 sm:p-6 lg:p-8">
                <div key={store.activeTab} className="animate-slide-in-up"> <MainAppContent /> </div>
            </main>
            <footer className="text-center mt-12 text-sm text-gray-400 dark:text-gray-500 p-4"><p>{t('footer')}</p></footer>
            {store.recalculatingProgress && (
                <div className="fixed bottom-6 right-6 z-50 bg-violet-600 text-white p-4 rounded-full shadow-lg flex items-center justify-center animate-pulse" role="status" aria-live="polite">
                    <div className="animate-spin h-6 w-6 border-4 border-solid border-white border-t-transparent rounded-full"></div>
                </div>
            )}
            {installPrompt && <InstallPwaSnackbar onInstall={handleInstallClick} onDismiss={() => setInstallPrompt(null)} />}
        </div>
    );
});

const App: React.FC = observer(() => {
    const getPathFromUrl = () => window.location.pathname.replace(/^\//, '').split('/')[0] || 'dashboard';
    const [currentPath, setCurrentPath] = useState(getPathFromUrl());
    const [appInitialized, setAppInitialized] = useState(false);

    const { infoModalIsOpen, infoModalTitle, infoModalMessage, hideInfoModal, confirmationModalIsOpen, confirmationModalTitle, confirmationModalMessage, confirmationModalOnConfirm, hideConfirmationModal, achievementsModalIsOpen, hideAchievementsModal } = uiStore;

    useEffect(() => {
        const initializeAllStoresAndAuth = async () => {
            setupDbListeners();
            initGoogleAuth();
            const restoredToken = await authStore.init();
            if (restoredToken) {
                if (authStore.loginMode === 'user') await syncWithDrive(restoredToken);
                else if (authStore.loginMode === 'nutritionist') { await mealPlanStore.init(); await syncNutritionistData(restoredToken); }
                else await mealPlanStore.init();
            } else await mealPlanStore.init();
            setAppInitialized(true);
        };
        initializeAllStoresAndAuth();

        const handleLocationChange = () => {
            const path = getPathFromUrl();
            setCurrentPath(path);
            const adminRoutes = ['admin', 'nutritionist', '404'];
            if (!adminRoutes.includes(path)) mealPlanStore.setActiveTab(path as NavigableTab);
        };
        window.addEventListener('popstate', handleLocationChange);
        handleLocationChange();
        window.history.replaceState({ tab: getPathFromUrl() }, '', window.location.href);
        return () => window.removeEventListener('popstate', handleLocationChange);
    }, []);

    if (!appInitialized) return <Loader />;

    const renderPage = () => {
        switch (currentPath) {
            case 'admin':
                if (authStore.isLoggedIn && authStore.loginMode === 'nutritionist') return <Redirect to="/nutritionist" />;
                return <AdminLoginPage onLoginSuccess={() => { window.history.pushState({}, '', '/nutritionist'); window.dispatchEvent(new PopStateEvent('popstate')); }} />;
            case 'nutritionist':
                if (authStore.isLoggedIn && authStore.loginMode === 'nutritionist') return <NutritionistPage onLogout={() => { handleSignOut(); window.history.pushState({}, '', '/admin'); window.dispatchEvent(new PopStateEvent('popstate')); }} />;
                return <Redirect to="/admin" />;
            case '404': return <NotFoundPage />;
            default:
                if (authStore.isLoggedIn && authStore.loginMode === 'nutritionist') return <Redirect to="/nutritionist" />;
                return <MainAppLayout />;
        }
    };

    return (
        <>
            <InfoModal isOpen={infoModalIsOpen} onClose={hideInfoModal} title={infoModalTitle}> {infoModalMessage} </InfoModal>
            <ConfirmationModal isOpen={confirmationModalIsOpen} onClose={hideConfirmationModal} onConfirm={confirmationModalOnConfirm} title={confirmationModalTitle}> {confirmationModalMessage} </ConfirmationModal>
            <AchievementsModal isOpen={achievementsModalIsOpen} onClose={hideAchievementsModal} />
            {renderPage()}
        </>
    );
});

const Redirect = ({ to }: { to: string }) => {
    useEffect(() => {
        if (window.location.pathname !== to) {
            window.history.replaceState({}, '', to);
            window.dispatchEvent(new PopStateEvent('popstate'));
        }
    }, [to]);
    return null;
};

export default App;
