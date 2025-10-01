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

  },
  en: {
    // App.tsx
  },
};

export const t = (key: keyof typeof translations.it, options?: { [key: string]: string }) => {
    const locale = mealPlanStore.locale;
    let text = translations[locale][key] || translations.it[key];
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