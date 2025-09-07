import React, { useEffect } from 'react';
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
    ExamplePdf
} from './components';
import { TodayIcon, CalendarIcon, ListIcon, PantryIcon, ArchiveIcon, SunIcon, MoonIcon } from './components/Icons';


const App: React.FC = observer(() => {
    const store = mealPlanStore;
    const hasActivePlan = store.mealPlan.length > 0;

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(store.theme === 'light' ? 'dark' : 'light');
        root.classList.add(store.theme);
    }, [store.theme]);

    const renderMainContent = () => {
        if (store.status === AppStatus.LOADING) return <Loader />;
        if (store.status === AppStatus.ERROR) {
            return ( <div className="text-center"><ErrorMessage message={store.error!} /><div className="mt-8"><h2 className="text-2xl font-bold dark:text-gray-200 text-gray-800 mb-4">{t('errorAndUpload')}</h2><FileUpload /></div></div> );
        }

        if (hasActivePlan) {
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

        if (store.activeTab === 'archive') {
             return ( <div><ArchiveView /><div className="text-center mt-8"><button onClick={() => store.setActiveTab('plan')} className="bg-violet-600 text-white font-semibold px-6 py-3 rounded-full hover:bg-violet-700 transition-colors shadow-lg">{t('uploadNew')}</button></div></div> );
        }
        
        return (
            <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-200 mb-2">{t('welcomeTitle')}</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xl mx-auto">{t('welcomeSubtitle')}</p>
                <FileUpload />
                <ExamplePdf />
                {store.archivedPlans.length > 0 && (
                    <div className="mt-12">
                        <p className="text-gray-600 dark:text-gray-400">or</p>
                        <button onClick={() => store.setActiveTab('archive')} className="mt-2 text-violet-600 dark:text-violet-400 font-semibold hover:underline">{t('viewArchived')}</button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen p-4 sm:p-6 lg:p-8">
            <header className="mb-10">
                <div className="max-w-4xl mx-auto relative">
                     <div className="absolute top-0 left-0 -mt-2 sm:mt-0 flex items-center gap-2">
                        <button onClick={() => store.setTheme(store.theme === 'light' ? 'dark' : 'light')} className="p-2 rounded-full bg-white dark:bg-gray-800 shadow-md hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors">
                           {store.theme === 'light' ? <MoonIcon/> : <SunIcon/>}
                        </button>
                         <button onClick={() => store.setLocale(store.locale === 'it' ? 'en' : 'it')} className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 shadow-md hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors font-bold text-violet-600 dark:text-violet-400">
                           {store.locale.toUpperCase()}
                        </button>
                    </div>
                    <div className="text-center">
                        <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600">{t('mainTitle')}</h1>
                        <p className="mt-2 text-lg text-gray-600 dark:text-gray-400">{t('mainSubtitle')}</p>
                    </div>
                    {hasActivePlan && (
                        <div className="absolute top-0 right-0 -mt-2 sm:mt-0">
                             <button onClick={() => store.archiveCurrentPlan()} className="bg-white dark:bg-gray-800 text-violet-700 dark:text-violet-400 font-semibold px-4 py-2 rounded-full shadow-md hover:bg-violet-100 dark:hover:bg-gray-700 transition-colors flex items-center" title={t('changeDietTitle')}>
                                <ChangeDietIcon/><span className="hidden sm:inline ml-2">{t('changeDiet')}</span>
                             </button>
                        </div>
                    )}
                </div>
            </header>
            <main>{renderMainContent()}</main>
            <footer className="text-center mt-12 text-sm text-gray-400 dark:text-gray-500"><p>{t('footer')}</p></footer>
        </div>
    );
});

export default App;