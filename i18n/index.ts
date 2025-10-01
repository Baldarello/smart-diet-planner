import { mealPlanStore } from '../stores/MealPlanStore';

const translations = {
  it: {
    // App.tsx
    mainTitle: "LifePulse",
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
    tabProgress: "Progressi",
    welcomeTitle: "Inizia un Nuovo Piano Dietetico",
    welcomeSubtitle: "Carica un file PDF o JSON del tuo piano per iniziare.",
    uploadPdfTitle: "Carica il tuo Piano",
    viewArchived: "Vedi Piani Archiviati",
    uploadNew: "Carica un Nuovo Piano Dietetico",
    footer: "Realizzato con React & MobX. Parsing offline.",
    errorAndUpload: "Per favore, prova a caricare un nuovo file",
    onlineModeTitle: "Modalità Online: Analisi AI e nutrizione attive.",
    offlineModeTitle: "Modalità Offline: Quota API superata. Funzionalità di base attive.",
    createManually: "Crea Manualmente",
    cancelAndReturn: "Annulla e torna al piano",
    restoreFromArchiveTitle: "Oppure, ripristina un piano archiviato",
    planManagement: "Gestione Piano",
    settings: "Impostazioni",
    theme: "Tema",
    language: "Lingua",
    connectionStatus: "Stato Connessione",
    navigation: "Navigazione",

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
    pdfOrJsonFile: "File PDF o JSON del tuo piano dietetico",

    // Fix: Add missing translation keys for JsonImportButton.tsx
    // JsonImportButton.tsx
    clickToImport: "Clicca per importare",
    jsonFile: "File JSON",

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

    // Steps
    stepTrackerTitle: "Tracciamento Passi",
    stepGoal: "Obiettivo giornaliero:",
    stepsUnit: "passi",
    stepsTaken: "Passi di oggi:",
    editStepsTitle: "Clicca per modificare",
    quickAddStepsTitle: "Aggiunta Rapida",
    activityHours: "Ore di attività:",
    estimatedCalories: "Calorie Bruciate Stimate:",
    caloriesUnit: "kcal",
    hoursUnit: "h",
    quickAddDurationTitle: "Aggiunta Rapida",

    // Body Metrics
    bodyMetricsTitle: "Dati Corporei",
    weight: "Peso",
    height: "Altezza",
    bodyFat: "Massa Grassa",
    leanMass: "Massa Magra",
    bodyWater: "Acqua Corporea",
    unitKg: "kg",
    unitCm: "cm",
    unitPercent: "%",
    
    // Progress View
    progressTitle: "I Tuoi Progressi",
    dateRange: "Intervallo di Tempo",
    last7Days: "Ultimi 7 Giorni",
    last30Days: "Ultimi 30 Giorni",
    last90Days: "Ultimi 90 Giorni",
    weightAndFatChartTitle: "Andamento Peso e Massa Grassa",
    adherenceChartTitle: "Aderenza al Piano Pasti",
    calorieIntakeChartTitle: "Introito Calorico (Pianificato vs. Effettivo)",
    noProgressDataTitle: "Nessun dato sui progressi ancora",
    noProgressDataSubtitle: "Completa i tuoi pasti giornalieri e inserisci i dati corporei per iniziare a tracciare i tuoi progressi qui.",
    adherence: "Aderenza",
    planned: "Pianificato",
    actual: "Effettivo",
  },
  en: {
    // App.tsx
    mainTitle: "LifePulse",
    mainSubtitle: "Your intelligent meal planning assistant.",
    changeDiet: "New Plan",
    changeDietTitle: "Create or restore a plan",
    exportPlan: "Export",
    exportPlanTitle: "Export plan data to a JSON file",
    tabDaily: "Today",
    tabWeekly: "Week",
    tabShopping: "Shopping",
    tabPantry: "Pantry",
    tabArchive: "Archive",
    tabProgress: "Progress",
    welcomeTitle: "Start a New Diet Plan",
    welcomeSubtitle: "Upload a PDF or JSON file of your plan to get started.",
    uploadPdfTitle: "Upload Your Plan",
    viewArchived: "View Archived Plans",
    uploadNew: "Upload a New Diet Plan",
    footer: "Made with React & MobX. Offline-first parsing.",
    errorAndUpload: "Please try uploading a new file",
    onlineModeTitle: "Online Mode: AI analysis and nutrition are active.",
    offlineModeTitle: "Offline Mode: API quota exceeded. Basic functionality is active.",
    createManually: "Create Manually",
    cancelAndReturn: "Cancel and return to plan",
    restoreFromArchiveTitle: "Or, restore an archived plan",
    planManagement: "Plan Management",
    settings: "Settings",
    theme: "Theme",
    language: "Language",
    connectionStatus: "Connection Status",
    navigation: "Navigation",

    // ManualPlanEntryForm.tsx
    manualEntryTitle: "Create Your Diet Plan",
    mealTitleLabel: "Dish name (optional)",
    ingredientsLabel: "Ingredients",
    addIngredient: "Add Ingredient",
    removeIngredient: "Remove Ingredient",
    savePlan: "Generate Plan",
    cancel: "Cancel",
    planEmptyError: "The submitted plan is empty. Please add at least one ingredient.",
    ingredientPlaceholder: "e.g. 60g of brown rice",
    
    // FileUpload.tsx
    clickToUpload: "Click to upload",
    dragAndDrop: "or drag and drop",
    pdfOrJsonFile: "PDF or JSON file of your diet plan",
    
    // JsonImportButton.tsx
    clickToImport: "Click to import",
    jsonFile: "JSON file",

    // Loader.tsx
    loadingPlanTitle: "Loading your plan...",
    loadingPlanMessage: "Just a moment while we retrieve your data.",
    readingPdfTitle: "Reading your PDF...",
    structuringPlanTitle: "Structuring Your Plan...",
    analyzingNutritionTitle: "Analyzing Nutrition...",
    generatingListTitle: "Creating Shopping List...",
    progressComplete: "% Complete",
    readingMessages: [ "Scanning pages...", "Extracting text...", "Recognizing structure...", ],
    structuringPlanMessages: [ "Organizing your week's meals...", "Identifying ingredients...", "Assigning meal times...", "Building the daily schedule...", ],
    analyzingNutritionMessages: [ "Estimating nutritional values...", "Calculating calories per meal...", "Analyzing macronutrients...", "This will take a moment...", ],
    generatingListMessages: [ "Aggregating ingredients...", "Calculating total quantities...", "Categorizing items...", "Almost ready...", ],

    // ErrorMessage.tsx
    errorOccurred: "An error occurred",

    // ActivePlanNameEditor.tsx
    editPlanNameLabel: "Edit diet plan name",
    
    // DailyPlanView.tsx
    noPlanToday: "No Plan for Today",
    noPlanTodaySubtitle: "No meals are scheduled for today in your current plan.",
    todaysPlan: "Today's Plan:",
    markAsDone: "Mark as done",
    markAsToDo: "Mark as to-do",

    // ShoppingListView.tsx
    shoppingListTitle: "Shopping List",
    moveToPantry: "Move to Pantry",
    shoppingListEmpty: "Your shopping list is empty. Good job!",
    shoppingListStaleTitle: "Changes Detected!",
    shoppingListStaleMessage: "Your meal plan has changed. The list and pantry may not be accurate.",
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
    pantryEmpty: "Your pantry is empty. Time to go shopping!",
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
    exampleItem1: "1 tub of soy yogurt (125g)",
    exampleItem2: "30g of whole grain cereal",
    exampleMealLunch: "LUNCH",
    exampleItem3: "60g of brown rice",
    exampleItem4: "90g of canned chickpeas",
    exampleMealDinner: "DINNER",
    exampleItem5: "Veggie ricotta meatballs",
    exampleItem6: "100g of grilled eggplant",
    
    // Hydration & Alarms
    hydrationTrackerTitle: "Hydration Tracking",
    hydrationGoal: "Daily goal:",
    hydrationUnit: "Liters",
    hydrationIntake: "Today's intake:",
    hydrationUnitMl: "ml",
    editIntakeTitle: "Click to edit",
    mealTime: "Meal time",
    notificationMealTitle: "It's time for {mealName}!",
    notificationMealBody: "Time to eat: {mealTitle}",
    notificationHydrationTitle: "Hydration Reminder!",
    notificationHydrationBody: "It's time to drink some water. Have about {amount}ml to stay on track.",
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
    nutritionDisclaimer: "Values are AI estimates and intended as a guideline, not medical advice.",

    // Meal Modification
    resetMealToPresetTitle: "Reset Meal",
    resetMealModalTitle: "Confirm Reset",
    resetMealModalContent: "All changes to this meal (ingredients, time, 'used' status) will be reverted to the original version. Are you sure?",

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

    // Steps
    stepTrackerTitle: "Step Tracking",
    stepGoal: "Daily goal:",
    stepsUnit: "steps",
    stepsTaken: "Today's steps:",
    editStepsTitle: "Click to edit",
    quickAddStepsTitle: "Quick Add",
    activityHours: "Hours of activity:",
    estimatedCalories: "Estimated Calories Burned:",
    caloriesUnit: "kcal",
    hoursUnit: "h",
    quickAddDurationTitle: "Quick Add",

    // Body Metrics
    bodyMetricsTitle: "Body Metrics",
    weight: "Weight",
    height: "Height",
    bodyFat: "Body Fat",
    leanMass: "Lean Mass",
    bodyWater: "Body Water",
    unitKg: "kg",
    unitCm: "cm",
    unitPercent: "%",
    
    // Progress View
    progressTitle: "Your Progress",
    dateRange: "Time Range",
    last7Days: "Last 7 Days",
    last30Days: "Last 30 Days",
    last90Days: "Last 90 Days",
    weightAndFatChartTitle: "Weight & Body Fat Trend",
    adherenceChartTitle: "Meal Plan Adherence",
    calorieIntakeChartTitle: "Calorie Intake (Planned vs. Actual)",
    noProgressDataTitle: "No Progress Data Yet",
    noProgressDataSubtitle: "Complete your daily meals and enter body metrics to start tracking your progress here.",
    adherence: "Adherence",
    planned: "Planned",
    actual: "Actual",
  },
};

export const t = (key: keyof typeof translations.it, options?: { [key: string]: string }): string => {
    const locale = mealPlanStore.locale;
    const translationValue = translations[locale][key] || translations.it[key];

    let text: string;

    if (Array.isArray(translationValue)) {
        console.warn(`Translation key '${key}' returned an array for t(), which expects a string. Using the first element.`);
        text = translationValue[0] || '';
    } else {
        text = translationValue;
    }
    
    if (options) {
        Object.keys(options).forEach(k => {
            text = text.replace(`{${k}}`, options[k]);
        });
    }
    return text;
};

export const t_dynamic = (key: keyof typeof translations.it): string[] => {
    const locale = mealPlanStore.locale;
    const value = translations[locale][key] || translations.it[key];
    if (Array.isArray(value)) {
        return value;
    }
    return [];
}