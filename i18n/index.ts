import { mealPlanStore } from '../stores/MealPlanStore';

const translations = {
  it: {
    // App.tsx
    mainTitle: "Smart Diet Planner",
    mainSubtitle: "Il tuo assistente intelligente per la pianificazione dei pasti.",
    changeDiet: "Nuovo Piano",
    changeDietTitle: "Crea o ripristina un piano",
    exportPlan: "Esporta",
    exportPlanTitle: "Esporta i dati del piano in formato JSON",
    tabDaily: "Oggi",
    tabWeekly: "Settimana",
    tabShopping: "Spesa",
    tabPantry: "Dispensa",
    tabArchive: "Archivio",
    welcomeTitle: "Inizia un Nuovo Piano Dietetico",
    welcomeSubtitle: "Carica un PDF, importa un file JSON, o inserisci il tuo piano manualmente per iniziare.",
    uploadPdfTitle: "Carica il tuo PDF",
    importJsonTitle: "Importa da JSON",
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
    planManagement: "Gestione Piano",
    settings: "Impostazioni",
    theme: "Tema",
    language: "Lingua",
    connectionStatus: "Stato Connessione",

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
    
    // JsonImportButton.tsx
    clickToImport: "Clicca per importare",
    jsonFile: "File JSON del tuo piano dietetico",

    // Loader.tsx
    loadingPlanTitle: "Caricamento del piano...",
    loadingPlanMessage: "Un momento, stiamo recuperando i tuoi dati.",
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
    addItem: "Aggiungi Voce",
    addCategory: "Aggiungi Categoria",
    newCategoryPrompt: "Nome nuova categoria",
    save: "Salva",
    deleteItemTitle: "Elimina Voce",
    editItemTitle: "Modifica Voce",
    quantityPlaceholder: "Quantità",

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
    snackbarReminder: "Sei indietro con l'idratazione! Bevi {amount}ml per rimetterti in pari.",
    snackbarDone: "Fatto!",
    quickAddWaterTitle: "Aggiunta Rapida",

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
    actualIntakeTitle: "Assunzione Effettiva",
    recalculatingActuals: "Calcolo assunzione effettiva in corso...",
    recalculateActualsButton: "Calcola Assunzione Effettiva",
    plannedShort: "Pian.",
    nutritionDisclaimer: "I valori sono stime AI e da intendersi come guida, non come parere medico.",

    // Meal Modification
    resetMealToPresetTitle: "Ripristina Pasto",
    resetMealModalTitle: "Conferma Ripristino",
    resetMealModalContent: "Tutte le modifiche a questo pasto (ingredienti, tempi, stato 'usato') verranno annullate e verrà ripristinata la versione originale. Sei sicuro?",

    // PWA
    installPwaPrompt: "Installa questa app per un'esperienza migliore e accesso offline.",
    install: "Installa",
    dismiss: "Ignora",

    // Google Login & Sync
    signIn: "Accedi",
    signOut: "Esci",
    signInTitle: "Accedi con Google per sincronizzare i dati",
    signOutTitle: "Esci dall'account",
    syncDisabled: "Accesso non configurato. La sincronizzazione è disabilitata.",

  },
  en: {
    // App.tsx
    mainTitle: "Smart Diet Planner",
    mainSubtitle: "Your intelligent meal planning assistant.",
    changeDiet: "New Plan",
    changeDietTitle: "Create or restore a plan",
    exportPlan: "Export",
    exportPlanTitle: "Export plan data as JSON",
    tabDaily: "Daily",
    tabWeekly: "Weekly",
    tabShopping: "Shopping",
    tabPantry: "Pantry",
    tabArchive: "Archive",
    welcomeTitle: "Start a New Diet Plan",
    welcomeSubtitle: "Upload a PDF, import a JSON file, or enter your plan manually to get started.",
    uploadPdfTitle: "Upload Your PDF",
    importJsonTitle: "Import from JSON",
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
    planManagement: "Plan Management",
    settings: "Settings",
    theme: "Theme",
    language: "Language",
    connectionStatus: "Connection Status",
    
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

    // JsonImportButton.tsx
    clickToImport: "Click to import",
    jsonFile: "JSON file of your diet plan",

    // Loader.tsx
    loadingPlanTitle: "Loading your plan...",
    loadingPlanMessage: "One moment, we're retrieving your data.",
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
    addItem: "Add Item",
    addCategory: "Add Category",
    newCategoryPrompt: "New category name",
    save: "Save",
    deleteItemTitle: "Delete Item",
    editItemTitle: "Edit Item",
    quantityPlaceholder: "Quantity",

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
    snackbarReminder: "You're behind on hydration! Drink {amount}ml to catch up.",
    snackbarDone: "Done!",
    quickAddWaterTitle: "Quick Add",
    
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
    actualIntakeTitle: "Actual Intake",
    recalculatingActuals: "Calculating actual intake...",
    recalculateActualsButton: "Calculate Actual Intake",
    plannedShort: "Plan.",
    nutritionDisclaimer: "Values are AI estimates intended as a guideline, not as medical advice.",

    // Meal Modification
    resetMealToPresetTitle: "Reset Meal",
    resetMealModalTitle: "Confirm Reset",
    resetMealModalContent: "All changes to this meal (ingredients, timings, 'used' status) will be undone, reverting to the original version. Are you sure?",

    // PWA
    installPwaPrompt: "Install this app for a better experience and offline access.",
    install: "Install",
    dismiss: "Dismiss",

     // Google Login & Sync
    signIn: "Sign In",
    signOut: "Sign Out",
    signInTitle: "Sign in with Google to sync data",
    signOutTitle: "Sign out of your account",
    syncDisabled: "Login not configured. Sync is disabled.",
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