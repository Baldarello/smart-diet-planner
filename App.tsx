import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore, AppStatus } from './stores/MealPlanStore';
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
    ChangeDietIcon
} from './components';
import { TodayIcon, CalendarIcon, ListIcon, PantryIcon, ArchiveIcon } from './components/Icons';


const App: React.FC = observer(() => {
    const store = mealPlanStore;
    const hasActivePlan = store.mealPlan.length > 0;

    const renderMainContent = () => {
        if (store.status === AppStatus.LOADING) return <Loader />;
        if (store.status === AppStatus.ERROR) {
            return ( <div className="text-center"><ErrorMessage message={store.error!} /><div className="mt-8"><h2 className="text-2xl font-bold text-gray-800 mb-4">Please try uploading a new file</h2><FileUpload /></div></div> );
        }

        if (hasActivePlan) {
            const tabs = [
                { id: 'daily', icon: <TodayIcon />, label: 'Daily Plan' },
                { id: 'plan', icon: <CalendarIcon />, label: 'Weekly Plan' },
                { id: 'list', icon: <ListIcon />, label: 'Shopping List' },
                { id: 'pantry', icon: <PantryIcon />, label: 'Pantry' },
                { id: 'archive', icon: <ArchiveIcon />, label: 'Archive' },
            ];
            return (
                <>
                    <ActivePlanNameEditor />
                    <div className="mb-8 flex justify-center flex-wrap gap-2 bg-white p-2 rounded-full shadow-md max-w-xl mx-auto">
                        {tabs.map(tab => (
                            <button key={tab.id} onClick={() => store.setActiveTab(tab.id as any)} className={`flex items-center justify-center flex-grow px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${store.activeTab === tab.id ? 'bg-violet-600 text-white shadow-md' : 'bg-transparent text-gray-600 hover:bg-violet-100'}`}>
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
             return ( <div><ArchiveView /><div className="text-center mt-8"><button onClick={() => store.setActiveTab('plan')} className="bg-violet-600 text-white font-semibold px-6 py-3 rounded-full hover:bg-violet-700 transition-colors shadow-lg">Upload a New Diet Plan</button></div></div> );
        }
        
        return (
            <div className="text-center">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Welcome to your Diet Plan Organizer</h2>
                <p className="text-gray-500 mb-8 max-w-xl mx-auto">Upload your weekly meal plan in PDF format, and our AI will automatically create a daily schedule and a complete shopping list for you.</p>
                <FileUpload />
                {store.archivedPlans.length > 0 && (
                    <div className="mt-12">
                        <p className="text-gray-600">or</p>
                        <button onClick={() => store.setActiveTab('archive')} className="mt-2 text-violet-600 font-semibold hover:underline">View Archived Plans</button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 text-gray-800 p-4 sm:p-6 lg:p-8">
            <header className="text-center mb-10">
                <div className="max-w-4xl mx-auto relative">
                    <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-purple-600">Smart Diet Planner</h1>
                    <p className="mt-2 text-lg text-gray-600">Your intelligent meal planning assistant.</p>
                    {hasActivePlan && (
                        <div className="absolute top-0 right-0 -mt-2 sm:mt-0">
                             <button onClick={() => store.archiveCurrentPlan()} className="bg-white text-violet-700 font-semibold px-4 py-2 rounded-full shadow-md hover:bg-violet-100 transition-colors flex items-center" title="Archive current plan and start a new one">
                                <ChangeDietIcon/><span className="hidden sm:inline ml-2">Change Diet</span>
                             </button>
                        </div>
                    )}
                </div>
            </header>
            <main>{renderMainContent()}</main>
            <footer className="text-center mt-12 text-sm text-gray-400"><p>Powered by Gemini AI. Created with React & MobX.</p></footer>
        </div>
    );
});

export default App;
