import { mealPlanStore } from '../stores/MealPlanStore';

const translations = {
  it: {
    // App.tsx
    mainTitle: "Smart Diet Planner",
    mainSubtitle: "Il tuo assistente intelligente per la pianificazione dei pasti.",
    changeDiet: "Nuovo Piano",
    changeDietTitle: "Crea o ripristina un piano",
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
    or: "o",
    orCreateManually: "crea un piano manualmente",
    cancelAndReturn: "Annulla e torna al piano",
    restoreFromArchiveTitle: "Oppure, ripristina un piano archiviato",

    // ManualPlanEntryForm.tsx
    manualEntryTitle: "Crea il Tuo Piano Dietetico",
    mealTitleLabel: "Nome del piatto (opzionale)",
    ingredientsLabel: "Ingredienti",
    addIngredient: "Aggiungi Ingrediente",
    removeIngredient: "Rimuovi Ingrediente",
    savePlan: "Genera Piano",
    cancel: "Annulla",
    planEmptyError: "Il piano inviato è vuoto. Per favore, aggiungi almeno un ingrediente.",
    ingredientPlaceholder: "Es. 60g di riso venere",
    
    // FileUpload.tsx
    clickToUpload: "Clicca per caricare",
    dragAndDrop: "o trascina e rilascia",
    pdfFile: "File PDF del tuo piano dietetico",

    // Loader.tsx
    readingPdfTitle: "Lettura del PDF in corso...",
    structuringPlanTitle: "Strutturazione del Piano...",
    analyzingNutritionTitle: "Analisi Nutrizionale...",
    generatingListTitle: "Creazione Lista Spesa...",
    progressComplete: "% Completo",
    readingMessages: [ "Scansionando le pagine...", "Estraendo il testo...", "Riconoscendo la struttura...", ],
    structuringPlanMessages: [ "Organizzando i pasti della tua settimana...", "Identificando gli ingredienti...", "Assegnando gli orari dei pasti...", "Costruendo il piano giornaliero...", ],
    analyzingNutritionMessages: [ "Stimando i valori nutrizionali...", "Calcolando le calorie per ogni pasto...", "Analizzando i macronutrienti...", "Questo richiederà un momento...", ],
    generatingListMessages: [ "Aggregando gli ingredienti...", "Calcolando le quantità totali...", "Categorizzando gli articoli...", "Quasi pronto...", ],

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
    hydrationIntake: "Assunzione di oggi:",
    hydrationUnitMl: "ml",
    editIntakeTitle: "Clicca per modificare",
    mealTime: "Orario pasto",
    notificationMealTitle: "È ora di {mealName}!",
    notificationMealBody: "È il momento di mangiare: {mealTitle}",
    notificationHydrationTitle: "Promemoria Idratazione!",
    notificationHydrationBody: "È ora di bere un po' d'acqua. Bevi circa {amount}ml per rimanere in linea con il tuo obiettivo.",
    snackbarReminder: "Sono le {time}, ora di bere {amount}ml d'acqua!",
    snackbarDone: "Fatto!",

    // Nutrition
    dailySummaryTitle: "Riepilogo Nutrizionale Giornaliero",
    nutritionCarbs: "Carboidrati",
    nutritionProtein: "Proteine",
    nutritionFat: "Grassi",
    nutritionCalories: "Calorie",
    nutritionUnitG: "g",
    nutritionUnitKcal: "kcal",
    recalculateNutrition: "Ricalcola Nutrizione",
    recalculateNutritionTitle: "Ricalcola i valori nutrizionali per questo pasto",
    recalcModalTitle: "Conferma Ricalcolo",
    recalcModalContent: "I valori nutrizionali sono stime generate da un'IA e potrebbero non essere scientificamente accurati. Sono intesi come linee guida. Vuoi procedere?",
    confirm: "Conferma",

    // Meal Modification
    resetMealToPresetTitle: "Ripristina Pasto",
    resetMealModalTitle: "Conferma Ripristino",
    resetMealModalContent: "Tutte le modifiche a questo pasto (ingredienti, tempi, stato 'usato') verranno annullate e verrà ripristinata la versione originale. Sei sicuro?",
  },
  en: {
    // App.tsx
    mainTitle: "Smart Diet Planner",
    mainSubtitle: "Your intelligent meal planning assistant.",
    changeDiet: "New Plan",
    changeDietTitle: "Create or restore a plan",
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
    or: "or",
    orCreateManually: "create a plan manually",
    cancelAndReturn: "Cancel and return to plan",
    restoreFromArchiveTitle: "Or, restore an archived plan",
    
    // ManualPlanEntryForm.tsx
    manualEntryTitle: "Create Your Diet Plan",
    mealTitleLabel: "Dish name (optional)",
    ingredientsLabel: "Ingredients",
    addIngredient: "Add Ingredient",
    removeIngredient: "Remove Ingredient",
    savePlan: "Generate Plan",
    cancel: "Cancel",
    planEmptyError: "The submitted plan is empty. Please add at least one meal item.",
    ingredientPlaceholder: "E.g., 60g of black rice",

    // FileUpload.tsx
    clickToUpload: "Click to upload",
    dragAndDrop: "or drag and drop",
    pdfFile: "PDF file of your diet plan",

    // Loader.tsx
    readingPdfTitle: "Reading Your PDF...",
    structuringPlanTitle: "Structuring Your Plan...",
    analyzingNutritionTitle: "Analyzing Nutrition...",
    generatingListTitle: "Generating Shopping List...",
    progressComplete: "% Complete",
    readingMessages: [ "Scanning pages...", "Extracting text...", "Recognizing structure...", ],
    structuringPlanMessages: [ "Organizing your week's meals...", "Identifying ingredients...", "Assigning meal times...", "Building the daily schedule...", ],
    analyzingNutritionMessages: [ "Estimating nutritional values...", "Calculating calories for each meal...", "Analyzing macronutrients...", "This will take a moment...", ],
    generatingListMessages: [ "Aggregating ingredients...", "Calculating total quantities...", "Categorizing items...", "Almost ready...", ],

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
    hydrationIntake: "Today's Intake:",
    hydrationUnitMl: "ml",
    editIntakeTitle: "Click to edit",
    mealTime: "Meal time",
    notificationMealTitle: "Time for {mealName}!",
    notificationMealBody: "It's time to eat: {mealTitle}",
    notificationHydrationTitle: "Hydration Reminder!",
    notificationHydrationBody: "Time for some water. Drink about {amount}ml to stay on track.",
    snackbarReminder: "It's {time}, time to drink {amount}ml of water!",
    snackbarDone: "Done!",
    
    // Nutrition
    dailySummaryTitle: "Daily Nutrition Summary",
    nutritionCarbs: "Carbs",
    nutritionProtein: "Protein",
    nutritionFat: "Fat",
    nutritionCalories: "Calories",
    nutritionUnitG: "g",
    nutritionUnitKcal: "kcal",
    recalculateNutrition: "Recalculate Nutrition",
    recalculateNutritionTitle: "Recalculate nutritional values for this meal",
    recalcModalTitle: "Confirm Recalculation",
    recalcModalContent: "Nutritional values are AI-generated estimates and may not be scientifically accurate. They are intended as a guideline. Do you want to proceed?",
    confirm: "Confirm",
    
    // Meal Modification
    resetMealToPresetTitle: "Reset Meal",
    resetMealModalTitle: "Confirm Reset",
    resetMealModalContent: "All changes to this meal (ingredients, timings, 'used' status) will be undone, reverting to the original version. Are you sure?",
  }
};

type EnglishTranslations = typeof translations.en;
type StringTranslationKey = { [K in keyof EnglishTranslations]: EnglishTranslations[K] extends string ? K : never }[keyof EnglishTranslations];
type MessagesKey = 'readingMessages' | 'structuringPlanMessages' | 'analyzingNutritionMessages' | 'generatingListMessages';

export const t = (key: StringTranslationKey, replacements?: { [key: string]: string }) => {
    let translation = translations[mealPlanStore.locale][key] || translations.en[key];
    if (replacements) {
        Object.keys(replacements).forEach(rKey => {
            translation = translation.replace(`{${rKey}}`, replacements[rKey]);
        });
    }
    return translation;
};

export const t_dynamic = (key: MessagesKey): string[] => {
    return translations[mealPlanStore.locale][key] || translations.en[key];
}