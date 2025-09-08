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
    footer: "Realizzato con Gemini AI. Creato con React & MobX.",
    errorAndUpload: "Per favore, prova a caricare un nuovo file",
    
    // FileUpload.tsx
    clickToUpload: "Clicca per caricare",
    dragAndDrop: "o trascina e rilascia",
    pdfFile: "File PDF del tuo piano dietetico",

    // Loader.tsx
    readingPdf: "Lettura del PDF in corso...",
    analyzingPlan: "Analisi del tuo piano...",
    progressComplete: "% Completo",
    readingMessages: [
        "Riscaldando lo chef IA...",
        "Scansionando le ricette della colazione...",
        "Decodificando le opzioni per il pranzo...",
        "Analizzando gli ingredienti della cena...",
        "Affettando e sminuzzando i dati...",
        "Estraendo le note nutrizionali...",
    ],
    analyzingMessages: [
        "Consultando i nutrizionisti digitali...",
        "Organizzando i pasti della tua settimana...",
        "Calibrando il contatore di calorie...",
        "Generando la tua lista della spesa...",
        "Categorizzando gli ingredienti per te...",
    ],

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

    // Nutrition Info
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
    footer: "Powered by Gemini AI. Created with React & MobX.",
    errorAndUpload: "Please try uploading a new file",

    // FileUpload.tsx
    clickToUpload: "Click to upload",
    dragAndDrop: "or drag and drop",
    pdfFile: "PDF file of your diet plan",

    // Loader.tsx
    readingPdf: "Reading Your PDF...",
    analyzingPlan: "Analyzing Your Plan",
    progressComplete: "% Complete",
    readingMessages: [
      "Warming up the AI chef...",
      "Scanning for breakfast recipes...",
      "Decoding your lunch options...",
      "Unpacking dinner ingredients...",
      "Slicing and dicing the data...",
      "Extracting nutritional notes...",
    ],
    analyzingMessages: [
      "Consulting with digital nutritionists...",
      "Organizing your week's meals...",
      "Calibrating the calorie counter...",
      "Generating your shopping list...",
      "Categorizing ingredients for you...",
    ],

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
    
    // Nutrition Info
    nutritionCarbs: "Carbs",
    nutritionProtein: "Protein",
    nutritionFat: "Fat",
    nutritionCalories: "Calories",
    nutritionUnitG: "g",
    nutritionUnitKcal: "kcal",
  }
};

// FIX: Create a type for translation keys that ensures the value is a string, not a string array.
// This prevents type errors when using `t()` for attributes that expect a string, like `title` or `aria-label`.
type EnglishTranslations = typeof translations.en;
type StringTranslationKey = { [K in keyof EnglishTranslations]: EnglishTranslations[K] extends string ? K : never }[keyof EnglishTranslations];

export const t = (key: StringTranslationKey) => {
    return translations[mealPlanStore.locale][key] || translations.en[key];
};

export const t_dynamic = (key: 'readingMessages' | 'analyzingMessages') => {
    return translations[mealPlanStore.locale][key] || translations.en[key];
}