import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore, AppStatus } from './stores/MealPlanStore';
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
    ChangeDietIcon,
    ExamplePdf,
    Snackbar,
    ManualPlanEntryForm,
    ArchivedPlanItem
} from './components';
import { TodayIcon, CalendarIcon, ListIcon, PantryIcon, ArchiveIcon, SunIcon, MoonIcon, CloudOnlineIcon, CloudOfflineIcon } from './components/Icons';

const App: React.FC = observer(() => {
    const store = mealPlanStore;
    const notificationPermission = useRef(Notification.permission);
    const hydrationTimerIdRef = useRef<number | null>(null);
    
    const [viewMode, setViewMode] = useState<'activePlan' | 'newPlan'>(
        store.currentPlanId ? 'activePlan' : 'newPlan'
    );
    const [showManualForm, setShowManualForm] = useState(false);

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(store.theme === 'light' ? 'dark' : 'light');
        root.classList.add(store.theme);
    }, [store.theme]);
    
    useEffect(() => {
        if (store.currentPlanId) {
            setViewMode('activePlan');
            setShowManualForm(false);
        } else {
            setViewMode('newPlan');
        }
    }, [store.currentPlanId]);

    useEffect(() => {
        if (store.currentPlanId && notificationPermission.current === 'default') {
            Notification.requestPermission().then(permission => {
                notificationPermission.current = permission;
            });
        }

        // Timer for MEALS (checks every minute, which is reliable enough for this purpose)
        const mealTimer = setInterval(() => {
            if (!store.currentPlanId) return;

            const now = new Date();
            const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
            
            store.resetSentNotificationsIfNeeded();
            
            if (notificationPermission.current === 'granted') {
                store.dailyPlan?.meals.forEach((meal, mealIndex) => {
                    if (meal.time === currentTime) {
                        const dayIndex = store.mealPlan.findIndex(d => d.day === store.dailyPlan?.day);
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
        
        // Scheduler for HYDRATION (uses precise setTimeout for reliability)
        const scheduleNextHydrationNotification = () => {
            if (hydrationTimerIdRef.current) {
                clearTimeout(hydrationTimerIdRef.current);
            }

            const now = new Date();
            const nextNotificationTime = new Date(now);
            // Start by setting the time to the top of the current hour
            nextNotificationTime.setMinutes(0, 0, 0);

            let nextHour = now.getHours() + 1;
            
            // If before 9am, schedule for 9am today
            if (now.getHours() < 9) {
                nextHour = 9;
            } 
            // If 7pm or later, schedule for 9am tomorrow
            else if (now.getHours() >= 19) {
                nextNotificationTime.setDate(now.getDate() + 1);
                nextHour = 9;
            }

            nextNotificationTime.setHours(nextHour);

            const delay = nextNotificationTime.getTime() - now.getTime();
            
            hydrationTimerIdRef.current = window.setTimeout(() => {
                const hourToNotify = nextNotificationTime.getHours();
                
                // Only notify within the desired window
                if (hourToNotify >= 9 && hourToNotify <= 19) {
                    const key = `hydration-${hourToNotify}`;
                    store.resetSentNotificationsIfNeeded();
                    
                    if (!store.sentNotifications.has(key)) {
                        const amountToDrink = Math.round((store.hydrationGoalLiters * 1000) / 10);
                        const timeStr = `${String(hourToNotify).padStart(2, '0')}:00`;
                        
                        if (notificationPermission.current === 'granted') {
                            new Notification(t('notificationHydrationTitle'), {
                                body: t('notificationHydrationBody', { amount: amountToDrink.toString() })
                            });
                        }
                        store.showHydrationSnackbar(timeStr, amountToDrink);
                        store.markNotificationSent(key);
                    }
                }

                // Reschedule for the next hour
                scheduleNextHydrationNotification();
            }, delay);
        };
        
        if (store.currentPlanId) {
            scheduleNextHydrationNotification();
        }

        // Cleanup function for both timers
        return () => {
            clearInterval(mealTimer);
            if (hydrationTimerIdRef.current) {
                clearTimeout(hydrationTimerIdRef.current);
            }
        };
    }, [store.currentPlanId]);


    const renderMainContent = () => {
        if (store.status === AppStatus.LOADING) return <Loader />;
        if (store.status === AppStatus.ERROR) {
            return ( <div className="text-center"><ErrorMessage message={store.error!} /><div className="mt-8"><h2 className="text-2xl font-bold dark:text-gray-200 text-gray-800 mb-4">{t('errorAndUpload')}</h2><FileUpload /></div></div> );
        }

        if (viewMode === 'activePlan' && store.currentPlanId) {
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
                    {store.activeTab === 'plan' && <MealPlanView plan={store.mealPlan} />}
                    {store.activeTab === 'list' && <ShoppingListView />}
                    {store.activeTab === 'pantry' && <PantryView />}
                    {store.activeTab === 'archive' && <ArchiveView />}
                </>
            );
        }

        // New Plan View
        if (showManualForm) {
            return <ManualPlanEntryForm onCancel={() => setShowManualForm(false)} />;
        }
        
        return (
            <div className="text-center">
                 {store.currentPlanId && (
                    <div className="mb-10">
                        <button 
                            onClick={() => setViewMode('activePlan')}
                            className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-semibold px-8 py-3 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors shadow-md"
                        >
                            {t('cancelAndReturn')}
                        </button>
                    </div>
                )}
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('welcomeTitle')}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xl mx-auto">{t('welcomeSubtitle')}</p>
                <FileUpload />
                <div className="mt-6 text-gray-600 dark:text-gray-400">
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
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
            <header className="mb-10">
                <div className="max-w-4xl mx-auto flex flex-col sm:grid sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-4">
                    {/* Left Controls */}
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <button onClick={() => store.setTheme(store.theme === 'light' ? 'dark' : 'light')} className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-md hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
                           {store.theme === 'light' ? <MoonIcon/> : <SunIcon/>}
                        </button>
                         <button onClick={() => store.setLocale(store.locale === 'it' ? 'en' : 'it')} className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-md hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors font-bold text-violet-600 dark:text-violet-400">
                           {store.locale.toUpperCase()}
                        </button>
                        <div className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-md" title={store.onlineMode ? t('onlineModeTitle') : t('offlineModeTitle')}>
                           {store.onlineMode ? <CloudOnlineIcon/> : <CloudOfflineIcon/>}
                        </div>
                    </div>

                    {/* Title */}
                    <div className="text-center my-4 sm:my-0">
                        <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600">{t('mainTitle')}</h1>
                        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">{t('mainSubtitle')}</p>
                    </div>

                    {/* Right Controls */}
                    <div className="flex justify-center sm:justify-end">
                        {viewMode === 'activePlan' && store.currentPlanId && (
                             <button onClick={() => setViewMode('newPlan')} className="bg-white dark:bg-gray-800 text-violet-700 dark:text-violet-400 font-semibold px-4 py-2 rounded-full shadow-md hover:bg-violet-100 dark:hover:bg-gray-700 transition-colors flex items-center" title={t('changeDietTitle')}>
                                <ChangeDietIcon/><span className="sm:inline ml-2">{t('changeDiet')}</span>
                             </button>
                        )}
                    </div>
                </div>
            </header>
            <main>{renderMainContent()}</main>
            <footer className="text-center mt-12 text-sm text-gray-400 dark:text-gray-500"><p>{t('footer')}</p></footer>
            <Snackbar />
        </div>
    );
});

export default App;