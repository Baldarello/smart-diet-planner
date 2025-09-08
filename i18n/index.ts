import { mealPlanStore } from '../stores/MealPlanStore';

const translations = {
  it: {
    // App.tsx
    mainTitle: "Smart Diet Planner",
    mainSubtitle: "Il tuo assistente intelligente per la pianificazione dei pasti.",
    changeDiet: "Cambia Dieta",
    changeDietTitle: "Archivia il piano attuale e iniziane uno nuovo",
    tabDaily: "Oggi",
    tabWeekly: "Settimana",
    tabShopping: "Spesa",
    tabPantry: "Dispensa",
    tabArchive: "Archivio",
    welcomeTitle: "Benvenuto nel tuo Organizzatore di Piani Dietetici",
    welcomeSubtitle: "Carica il tuo piano alimentare settimanale in formato PDF e la nostra IA creerà automaticamente un programma giornaliero e una lista della spesa completa per te.",
    viewArchived: "Vedi Piani Archiviati",
    uploadNew: "Carica un Nuovo Piano Dietetico",
    footer: "Realizzato con React & MobX. Parsing offline.",
    errorAndUpload: "Per favore, prova a caricare un nuovo file",
    onlineModeTitle: "Modalità Online: Analisi AI e nutrizione attive.",
    offlineModeTitle: "Modalità Offline: Quota API superata. Funzionalità di base attive.",
    
    // FileUpload.tsx
    clickToUpload: "Clicca per caricare",
    dragAndDrop: "o trascina e rilascia",
    pdfFile: "File PDF del tuo piano dietetico",

    // Loader.tsx
    readingPdf: "Lettura del PDF in corso...",
    analyzingPlan: "Analisi del tuo piano...",
    progressComplete: "% Completo",
    readingMessages: [ "Scansionando le pagine...", "Estraendo il testo...", "Riconoscendo i giorni...", "Identificando i pasti...", "Elaborando gli ingredienti...", ],
    analyzingMessages: [ "Organizzando i pasti della tua settimana...", "Aggregando gli ingredienti...", "Generando la tua lista della spesa...", "Categorizzando gli ingredienti...", "Quasi pronto...", ],

    // ErrorMessage.tsx
    errorOccurred: "Si è verificato un errore",

    // ActivePlanNameEditor.tsx
    editPlanNameLabel: "Modifica nome del piano dietetico",
    
    // DailyPlanView.tsx
    noPlanToday: "Nessun Piano per Oggi",
    noPlanTodaySubtitle: "Nessun pasto è programmato per oggi nel tuo piano attuale.",
    todaysPlan: "Piano di Oggi:",
    markAsDone: "Segna come completato",
    markAsToDo: "Segna come da fare",

    // ShoppingListView.tsx
    shoppingListTitle: "Lista della Spesa",
    moveToPantry: "Sposta in Dispensa",
    shoppingListEmpty: "La tua lista della spesa è vuota. Ottimo lavoro!",
    shoppingListStaleTitle: "Modifiche Rilevate!",
    shoppingListStaleMessage: "Il tuo piano alimentare è cambiato. La lista e la dispensa potrebbero non essere accurate.",
    recalculateList: "Ricalcola Lista",
    recalculating: "Ricalcolando...",

    // PantryView.tsx
    pantryTitle: "La Mia Dispensa",
    pantryEmpty: "La tua dispensa è vuota. Vai a fare la spesa!",
    moveToShoppingListTitle: "Sposta di nuovo nella Lista della Spesa",

    // ArchiveView.tsx
    archiveEmpty: "Archivio Vuoto",
    archiveEmptySubtitle: "Quando usi il pulsante 'Cambia Dieta', il tuo vecchio piano verrà salvato qui.",
    archiveTitle: "Piani Dietetici Archiviati",

    // ArchivedPlanItem.tsx
    restorePlanTitle: "Ripristina questo piano",
    restore: "Ripristina",

    // ExamplePdf.tsx
    exampleTitle: "Esempio di Formato PDF",
    exampleSubtitle: "Per risultati ottimali, assicurati che il tuo PDF sia strutturato in modo simile, con giorni e pasti chiaramente definiti.",
    exampleDay: "LUNEDI",
    exampleMealBreakfast: "COLAZIONE",
    exampleItem1: "1 vasetto di yogurt di soia (125g)",
    exampleItem2: "30g di cereali integrali",
    exampleMealLunch: "PRANZO",
    exampleItem3: "60g di riso venere",
    exampleItem4: "90g di ceci in barattolo",
    exampleMealDinner: "CENA",
    exampleItem5: "Polpette di ricotta veg",
    exampleItem6: "100g di melanzane grigliate",
    
    // Hydration & Alarms
    hydrationTrackerTitle: "Tracciamento Idratazione",
    hydrationGoal: "Obiettivo giornaliero:",
    hydrationUnit: "Litri",
    mealTime: "Orario pasto",
    notificationMealTitle: "È ora di {mealName}!",
    notificationMealBody: "È il momento di mangiare: {mealTitle}",
    notificationHydrationTitle: "Promemoria Idratazione!",
    notificationHydrationBody: "È ora di bere un po' d'acqua. Bevi circa {amount}ml per rimanere in linea con il tuo obiettivo.",
    // Fix: Add nutrition translation keys
    dailySummaryTitle: "Riepilogo Nutrizionale Giornaliero",
    nutritionCarbs: "Carboidrati",
    nutritionProtein: "Proteine",
    nutritionFat: "Grassi",
    nutritionCalories: "Calorie",
    nutritionUnitG: "g",
    nutritionUnitKcal: "kcal",
  },
  en: {
    // App.tsx
    mainTitle: "Smart Diet Planner",
    mainSubtitle: "Your intelligent meal planning assistant.",
    changeDiet: "Change Diet",
    changeDietTitle: "Archive current plan and start a new one",
    tabDaily: "Daily",
    tabWeekly: "Weekly",
    tabShopping: "Shopping",
    tabPantry: "Pantry",
    tabArchive: "Archive",
    welcomeTitle: "Welcome to your Diet Plan Organizer",
    welcomeSubtitle: "Upload your weekly meal plan in PDF format, and our AI will automatically create a daily schedule and a complete shopping list for you.",
    viewArchived: "View Archived Plans",
    uploadNew: "Upload a New Diet Plan",
    footer: "Powered by React & MobX. Offline parsing.",
    errorAndUpload: "Please try uploading a new file",
    onlineModeTitle: "Online Mode: AI analysis & nutrition facts are active.",
    offlineModeTitle: "Offline Mode: API quota exceeded. Basic features are active.",

    // FileUpload.tsx
    clickToUpload: "Click to upload",
    dragAndDrop: "or drag and drop",
    pdfFile: "PDF file of your diet plan",

    // Loader.tsx
    readingPdf: "Reading Your PDF...",
    analyzingPlan: "Analyzing Your Plan",
    progressComplete: "% Complete",
    readingMessages: [ "Scanning pages...", "Extracting text...", "Recognizing days...", "Identifying meals...", "Processing ingredients...", ],
    analyzingMessages: [ "Organizing your week's meals...", "Aggregating ingredients...", "Generating your shopping list...", "Categorizing items...", "Almost ready...", ],

    // ErrorMessage.tsx
    errorOccurred: "An Error Occurred",

    // ActivePlanNameEditor.tsx
    editPlanNameLabel: "Edit diet plan name",

    // DailyPlanView.tsx
    noPlanToday: "No Plan for Today",
    noPlanTodaySubtitle: "There's no meal scheduled for today in your current plan.",
    todaysPlan: "Today's Plan:",
    markAsDone: "Mark as Done",
    markAsToDo: "Mark as To Do",

    // ShoppingListView.tsx
    shoppingListTitle: "Shopping List",
    moveToPantry: "Move to Pantry",
    shoppingListEmpty: "Your shopping list is empty. Good job!",
    shoppingListStaleTitle: "Changes Detected!",
    shoppingListStaleMessage: "Your meal plan has changed. The list and pantry may be inaccurate.",
    recalculateList: "Recalculate List",
    recalculating: "Recalculating...",

    // PantryView.tsx
    pantryTitle: "My Pantry",
    pantryEmpty: "Your pantry is empty. Go shopping!",
    moveToShoppingListTitle: "Move back to Shopping List",

    // ArchiveView.tsx
    archiveEmpty: "Archive is Empty",
    archiveEmptySubtitle: "When you use the 'Change Diet' button, your old plan will be saved here.",
    archiveTitle: "Archived Diet Plans",

    // ArchivedPlanItem.tsx
    restorePlanTitle: "Restore this plan",
    restore: "Restore",

    // ExamplePdf.tsx
    exampleTitle: "Example PDF Format",
    exampleSubtitle: "For best results, ensure your PDF is structured similarly, with clearly defined days and meals.",
    exampleDay: "MONDAY",
    exampleMealBreakfast: "BREAKFAST",
    exampleItem1: "1 pot of soy yogurt (125g)",
    exampleItem2: "30g of whole grains",
    exampleMealLunch: "LUNCH",
    exampleItem3: "60g of black rice",
    exampleItem4: "90g of canned chickpeas",
    exampleMealDinner: "DINNER",
    exampleItem5: "Veggie ricotta meatballs",
    exampleItem6: "100g of grilled eggplant",
    
    // Hydration & Alarms
    hydrationTrackerTitle: "Hydration Tracking",
    hydrationGoal: "Daily Goal:",
    hydrationUnit: "Liters",
    mealTime: "Meal time",
    notificationMealTitle: "Time for {mealName}!",
    notificationMealBody: "It's time to eat: {mealTitle}",
    notificationHydrationTitle: "Hydration Reminder!",
    notificationHydrationBody: "Time for some water. Drink about {amount}ml to stay on track.",
    // Fix: Add nutrition translation keys
    dailySummaryTitle: "Daily Nutrition Summary",
    nutritionCarbs: "Carbs",
    nutritionProtein: "Protein",
    nutritionFat: "Fat",
    nutritionCalories: "Calories",
    nutritionUnitG: "g",
    nutritionUnitKcal: "kcal",
  }
};

type EnglishTranslations = typeof translations.en;
type StringTranslationKey = { [K in keyof EnglishTranslations]: EnglishTranslations[K] extends string ? K : never }[keyof EnglishTranslations];

export const t = (key: StringTranslationKey, replacements?: { [key: string]: string }) => {
    let translation = translations[mealPlanStore.locale][key] || translations.en[key];
    if (replacements) {
        Object.keys(replacements).forEach(rKey => {
            translation = translation.replace(`{${rKey}}`, replacements[rKey]);
        });
    }
    return translation;
};

export const t_dynamic = (key: 'readingMessages' | 'analyzingMessages') => {
    return translations[mealPlanStore.locale][key] || translations.en[key];
}