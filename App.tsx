import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore, AppStatus } from './stores/MealPlanStore';
// FIX: Imported ShoppingListItem to resolve type errors.
import { DayPlan, ShoppingListCategory, MealItem, PantryItem, ShoppingListItem } from './types';

// --- ICONS (as components) ---
const CalendarIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> );
const ListIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg> );
const UploadIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg> );
const TodayIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> );
const ArchiveIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg> );
const ChangeDietIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2v-4l4-4z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 3h4v4" /></svg> );
const RestoreIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5" /><path strokeLinecap="round" strokeLinejoin="round" d="M4 12a8 8 0 018-8h8M20 12a8 8 0 01-8 8H4" /></svg> );
const EditIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" /></svg> );
const PantryIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> );
const SendToShoppingListIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /><path d="M1 11l4-4-4-4" stroke-linecap="round" stroke-linejoin="round" /></svg> );


// --- UI COMPONENTS ---

const FileUpload: React.FC = observer(() => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      mealPlanStore.processPdf(file);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-lg border-2 border-dashed border-gray-300 flex flex-col justify-center items-center h-48 p-6 hover:border-violet-400 transition-colors duration-300">
        <div className="flex flex-col items-center justify-center pt-5 pb-6">
          <UploadIcon />
          <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Click to upload</span> or drag and drop</p>
          <p className="text-xs text-gray-500">PDF file of your diet plan</p>
        </div>
        <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={handleFileChange} accept=".pdf" />
      </label>
    </div>
  );
});

const readingMessages = ["Warming up the AI chef...","Scanning for breakfast recipes...","Decoding your lunch options...","Unpacking dinner ingredients...","Slicing and dicing the data...","Extracting nutritional notes...",];
const analyzingMessages = ["Consulting with digital nutritionists...","Organizing your week's meals...","Calibrating the calorie counter...","Generating your shopping list...","Categorizing ingredients for you...",];

const Loader: React.FC = observer(() => {
    const { pdfParseProgress } = mealPlanStore;
    const isReadingPdf = pdfParseProgress < 100;
    const [message, setMessage] = useState(readingMessages[0]);

    useEffect(() => {
        const messages = isReadingPdf ? readingMessages : analyzingMessages;
        let messageIndex = 0;
        const interval = setInterval(() => {
            messageIndex = (messageIndex + 1) % messages.length;
            setMessage(messages[messageIndex]);
        }, 2000);
        return () => clearInterval(interval);
    }, [isReadingPdf]);

    return (
        <div className="flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-violet-600 mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-700">{isReadingPdf ? 'Reading Your PDF...' : 'Analyzing Your Plan'}</h2>
            <p className="text-gray-500 mb-4 h-10 flex items-center justify-center">{message}</p>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-violet-600 h-2.5 rounded-full transition-all duration-300 ease-in-out" style={{ width: `${pdfParseProgress}%` }}></div>
            </div>
            <p className="text-sm text-gray-500 mt-2">{Math.round(pdfParseProgress)}% Complete</p>
        </div>
    );
});

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => ( <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md max-w-2xl mx-auto" role="alert"><p className="font-bold">An Error Occurred</p><p>{message}</p></div> );

const ShoppingListView: React.FC<{ categories: ShoppingListCategory[] }> = observer(() => {
    // FIX: Changed item type from MealItem to ShoppingListItem to match the data being used.
    const [checkedItems, setCheckedItems] = useState<Map<string, { item: ShoppingListItem, category: string }>>(new Map());

    // FIX: Changed item type from MealItem to ShoppingListItem to correctly handle shopping list items.
    const handleCheck = (item: ShoppingListItem, category: string) => {
        const key = `${category}-${item.item}`;
        const newCheckedItems = new Map(checkedItems);
        if (newCheckedItems.has(key)) {
            newCheckedItems.delete(key);
        } else {
            newCheckedItems.set(key, { item, category });
        }
        setCheckedItems(newCheckedItems);
    };

    const handleMoveToPantry = () => {
        checkedItems.forEach(({ item, category }) => {
            mealPlanStore.moveShoppingItemToPantry(item, category);
        });
        setCheckedItems(new Map());
    };

    return (
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg transition-all duration-300 max-w-4xl mx-auto">
            <div className="flex justify-between items-center border-b pb-4 mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Shopping List</h2>
                {checkedItems.size > 0 && (
                    <button onClick={handleMoveToPantry} className="bg-violet-600 text-white font-semibold px-4 py-2 rounded-full hover:bg-violet-700 transition-colors shadow-md flex items-center">
                        <PantryIcon /> Move to Pantry
                    </button>
                )}
            </div>
            {mealPlanStore.shoppingList.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Your shopping list is empty. Good job!</p>
            ) : (
                <div className="space-y-6">
                    {mealPlanStore.shoppingList.map((category, catIndex) => (
                        <details key={catIndex} className="group" open>
                            <summary className="font-bold text-xl text-violet-700 cursor-pointer list-none flex items-center">
                                 <span className="transform transition-transform duration-200 group-open:rotate-90">&#9656;</span>
                                 <span className="ml-2">{category.category}</span>
                            </summary>
                            <ul className="mt-4 pl-6 border-l-2 border-violet-100 space-y-3">
                                {category.items.map((item, itemIndex) => {
                                    const key = `${category.category}-${item.item}`;
                                    return (
                                        <li key={itemIndex} className="flex items-center">
                                            <input type="checkbox" id={`item-${catIndex}-${itemIndex}`} className="h-5 w-5 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer" onChange={() => handleCheck(item, category.category)} checked={checkedItems.has(key)} aria-labelledby={`label-item-${catIndex}-${itemIndex}`} />
                                            <label id={`label-item-${catIndex}-${itemIndex}`} htmlFor={`item-${catIndex}-${itemIndex}`} className={`ml-3 flex-grow cursor-pointer ${checkedItems.has(key) ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                                <span className="font-medium">{item.item}</span>: <span className="text-gray-600">{item.quantity}</span>
                                            </label>
                                        </li>
                                    );
                                })}
                            </ul>
                        </details>
                    ))}
                </div>
            )}
        </div>
    );
});

const PantryView: React.FC = observer(() => {
    const { pantry, updatePantryItemQuantity, movePantryItemToShoppingList } = mealPlanStore;

    const handleQuantityChange = (itemName: string, newQuantity: string) => {
        updatePantryItemQuantity(itemName, newQuantity);
    };

    return (
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg transition-all duration-300 max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">My Pantry</h2>
            {pantry.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Your pantry is empty. Go shopping!</p>
            ) : (
                <ul className="space-y-3">
                    {pantry.map((pantryItem, index) => (
                        <li key={index} className="flex items-center justify-between bg-slate-50 p-3 rounded-lg">
                            <span className="font-medium text-gray-800">{pantryItem.item}</span>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    value={pantryItem.quantity}
                                    onChange={(e) => handleQuantityChange(pantryItem.item, e.target.value)}
                                    className="text-gray-600 bg-white border border-gray-300 rounded px-2 py-1 w-32 text-right"
                                />
                                <button onClick={() => movePantryItemToShoppingList(pantryItem)} className="text-gray-400 hover:text-red-500 transition-colors" title="Move back to Shopping List">
                                    <SendToShoppingListIcon />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
});

const MealItemChecklist: React.FC<{items: MealItem[], dayIndex: number, mealIndex: number}> = observer(({items, dayIndex, mealIndex}) => {
    return (
        <ul className="list-disc list-inside text-gray-600 text-sm mt-2 space-y-2">
            {items.map((item, itemIndex) => (
                 <li key={itemIndex} className="flex items-center">
                    <input
                        type="checkbox"
                        id={`mealitem-${dayIndex}-${mealIndex}-${itemIndex}`}
                        className="h-4 w-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                        checked={item.used}
                        onChange={() => mealPlanStore.toggleMealItem(dayIndex, mealIndex, itemIndex)}
                    />
                    <label htmlFor={`mealitem-${dayIndex}-${mealIndex}-${itemIndex}`} className={`ml-2 cursor-pointer ${item.used ? 'line-through text-gray-400' : ''}`}>
                       {item.fullDescription}
                    </label>
                </li>
            ))}
        </ul>
    )
})

const MealPlanView: React.FC<{ plan: DayPlan[] }> = observer(({ plan }) => (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {plan.map((day, dayIndex) => (
            <div key={dayIndex} className="bg-white rounded-2xl shadow-lg p-6 flex flex-col hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <h3 className="text-2xl font-bold text-violet-700 mb-4 capitalize">{day.day.toLowerCase()}</h3>
                <div className="space-y-4 flex-grow">
                    {day.meals.map((meal, mealIndex) => (
                        <div key={mealIndex} className="border-t border-gray-100 pt-3">
                            <h4 className="font-semibold text-gray-800">{meal.name}</h4>
                            {meal.title && <p className="text-sm font-medium text-violet-600">{meal.title}</p>}
                            <MealItemChecklist items={meal.items} dayIndex={dayIndex} mealIndex={mealIndex} />
                        </div>
                    ))}
                </div>
            </div>
        ))}
    </div>
));

const DailyPlanView: React.FC = observer(() => {
    const { dailyPlan, mealPlan } = mealPlanStore;
    if (!dailyPlan) {
        return ( <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-2xl mx-auto"><h2 className="text-2xl font-bold text-gray-800 mb-2">No Plan for Today</h2><p className="text-gray-500">There's no meal scheduled for today in your current plan.</p></div> );
    }
    const dayIndex = mealPlan.findIndex(d => d.day.toUpperCase() === dailyPlan.day.toUpperCase());
    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8 hover:shadow-xl transition-all duration-300 max-w-4xl mx-auto">
            <h3 className="text-3xl font-bold text-violet-700 mb-6 capitalize border-b pb-4">Today's Plan: {dailyPlan.day.toLowerCase()}</h3>
            <div className="space-y-5">
                {dailyPlan.meals.map((meal, mealIndex) => (
                    <div key={mealIndex} className="bg-slate-50 p-4 rounded-lg">
                        <h4 className="text-xl font-semibold text-gray-800">{meal.name}</h4>
                        {meal.title && <p className="text-md font-medium text-violet-600 mt-1">{meal.title}</p>}
                        <MealItemChecklist items={meal.items} dayIndex={dayIndex} mealIndex={mealIndex} />
                    </div>
                ))}
            </div>
        </div>
    );
});

const ArchivedPlanItem: React.FC<{ archive: any }> = observer(({ archive }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(archive.name);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSave = () => { mealPlanStore.updateArchivedPlanName(archive.id, name); setIsEditing(false); };
    useEffect(() => { if (isEditing) { inputRef.current?.focus(); inputRef.current?.select(); } }, [isEditing]);
    
    return (
         <details key={archive.id} className="group bg-gray-50 p-4 rounded-lg transition-colors duration-200 hover:bg-violet-50">
            <summary className="font-semibold text-lg text-gray-700 cursor-pointer list-none flex justify-between items-center group-open:text-violet-600">
                <div className="flex items-center gap-2 flex-grow">
                    <span className="text-violet-500 transform transition-transform duration-200 group-open:rotate-90">&#9656;</span>
                     {isEditing ? ( <input ref={inputRef} type="text" value={name} onChange={(e) => setName(e.target.value)} onBlur={handleSave} onKeyDown={(e) => e.key === 'Enter' && handleSave()} className="text-lg font-semibold bg-white border border-violet-300 rounded px-2 py-1" /> ) : ( <span className="font-bold">{archive.name}</span> )}
                    <button onClick={() => setIsEditing(!isEditing)} className="text-gray-400 hover:text-violet-600"><EditIcon /></button>
                    <span className="text-sm text-gray-500 font-normal ml-2">({archive.date})</span>
                </div>
                <button onClick={(e) => { e.preventDefault(); mealPlanStore.restorePlanFromArchive(archive.id); }} className="bg-violet-100 text-violet-700 font-semibold px-3 py-1 rounded-full hover:bg-violet-200 transition-colors text-sm flex items-center flex-shrink-0" title="Restore this plan">
                    <RestoreIcon/><span className="ml-2 hidden sm:inline">Restore</span>
                </button>
            </summary>
            <div className="mt-4 border-t pt-4"> <MealPlanView plan={archive.plan} /> </div>
        </details>
    );
});

const ArchiveView: React.FC = observer(() => {
    const { archivedPlans } = mealPlanStore;
    if (archivedPlans.length === 0) { return ( <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-2xl mx-auto"><h2 className="text-2xl font-bold text-gray-800 mb-2">Archive is Empty</h2><p className="text-gray-500">When you use the 'Change Diet' button, your old plan will be saved here.</p></div> ); }
    return (
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg transition-all duration-300 max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">Archived Diet Plans</h2>
            <div className="space-y-4">
                {archivedPlans.slice().reverse().map((archive) => ( <ArchivedPlanItem key={archive.id} archive={archive}/> ))}
            </div>
        </div>
    );
});

const ActivePlanNameEditor: React.FC = observer(() => {
    const { currentPlanName, setCurrentPlanName } = mealPlanStore;
    return ( <div className="mb-8 text-center"><input type="text" value={currentPlanName} onChange={(e) => setCurrentPlanName(e.target.value)} className="text-2xl font-bold text-gray-700 text-center bg-transparent border-b-2 border-transparent focus:border-violet-400 outline-none transition-colors duration-300 p-1" aria-label="Edit diet plan name" /></div> )
});

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
                    {store.activeTab === 'list' && <ShoppingListView categories={store.shoppingList} />}
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