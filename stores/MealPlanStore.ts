import { makeAutoObservable, runInAction, toJS } from 'mobx';
// Fix: Import Dexie to resolve type error when calling db.transaction
import Dexie from 'dexie';
// Fix: Import the 'StoredState' type to resolve 'Cannot find name' errors.
import { MealPlanData, DayPlan, ShoppingListCategory, ArchivedPlan, PantryItem, ShoppingListItem, Theme, Locale, Meal, NutritionInfo, HydrationSnackbarInfo, BodyMetrics, ProgressRecord, DailyLog, StoredState, MealItem } from '../types';
import { parsePdfText, generateShoppingList as generateShoppingListOffline, extractIngredientInfo, singularize, categorizeIngredient } from '../services/offlineParser';
import { parseMealStructure, getNutritionForMeal, getPlanDetailsAndShoppingList, isQuotaError } from '../services/geminiService';
import { parseQuantity, formatQuantity } from '../utils/quantityParser';
import { db } from '../services/db';
import { calculateCaloriesBurned } from '../utils/calories';
import { authStore } from './AuthStore';

export enum AppStatus {
  INITIAL,
  HYDRATING,
  LOADING,
  SYNCING,
  SUCCESS,
  ERROR,
  AWAITING_DATES,
}

interface ImportedJsonData {
  planName: string;
  weeklyPlan: DayPlan[];
  shoppingList: ShoppingListCategory[];
  pantry?: PantryItem[];
}

const getTodayDateString = () => new Date().toLocaleDateString('en-CA');

const MOCK_MEAL_PLAN_DATA = {
    planName: 'Demo Plan',
    weeklyPlan: [
        {
            day: 'LUNEDI',
            meals: [
                { name: 'COLAZIONE', title: 'Yogurt & Cereali', items: [{ ingredientName: 'Yogurt Greco', fullDescription: '150g di Yogurt Greco', used: false }, { ingredientName: 'Miele', fullDescription: '1 cucchiaino di miele', used: false }, { ingredientName: 'Noci', fullDescription: '3 noci', used: false }], done: false, time: '08:00', nutrition: { carbs: 25, protein: 15, fat: 10, calories: 250 } },
                { name: 'PRANZO', title: 'Insalata di Riso', items: [{ ingredientName: 'Riso Integrale', fullDescription: '80g di riso integrale', used: false }, { ingredientName: 'Pomodorini', fullDescription: '100g di pomodorini', used: false }, { ingredientName: 'Mais', fullDescription: '50g di mais', used: false }], done: false, time: '13:00', nutrition: { carbs: 70, protein: 10, fat: 5, calories: 365 } },
                { name: 'CENA', title: 'Salmone & Asparagi', items: [{ ingredientName: 'Filetto di Salmone', fullDescription: '150g di filetto di salmone', used: false }, { ingredientName: 'Asparagi', fullDescription: '200g di asparagi', used: false }, { ingredientName: 'Olio EVO', fullDescription: '1 cucchiaio di Olio EVO', used: false }], done: false, time: '20:00', nutrition: { carbs: 5, protein: 30, fat: 25, calories: 365 } },
            ]
        },
        // Fill other days with a simplified version to make it feel complete
        ...['MARTEDI', 'MERCOLEDI', 'GIOVEDI', 'VENERDI', 'SABATO', 'DOMENICA'].map(day => ({
            day,
            meals: [
                { name: 'COLAZIONE', title: 'Fette Biscottate & Marmellata', items: [{ ingredientName: 'Fette Biscottate Integrali', fullDescription: '4 fette biscottate integrali', used: false }, { ingredientName: 'Marmellata', fullDescription: '2 cucchiaini di marmellata', used: false }], done: false, time: '08:00', nutrition: { carbs: 30, protein: 4, fat: 2, calories: 154 } },
                { name: 'PRANZO', title: 'Pasta al Pesto', items: [{ ingredientName: 'Pasta Integrale', fullDescription: '80g di pasta integrale', used: false }, { ingredientName: 'Pesto', fullDescription: '2 cucchiai di pesto', used: false }], done: false, time: '13:00', nutrition: { carbs: 60, protein: 12, fat: 15, calories: 423 } },
                { name: 'CENA', title: 'Petto di Pollo & Verdure Grigliate', items: [{ ingredientName: 'Petto di Pollo', fullDescription: '150g di petto di pollo', used: false }, { ingredientName: 'Verdure Miste', fullDescription: '250g di verdure miste', used: false }], done: false, time: '20:00', nutrition: { carbs: 10, protein: 35, fat: 8, calories: 252 } },
            ]
        })),
    ],
    shoppingList: [
        { category: 'Proteine (Carne, Pesce, Legumi)', items: [{ item: 'Filetto di Salmone', quantityValue: 150, quantityUnit: 'g' }, { item: 'Petto di Pollo', quantityValue: 900, quantityUnit: 'g' }] },
        { category: 'Carboidrati e Cereali', items: [{ item: 'Riso Integrale', quantityValue: 80, quantityUnit: 'g' }, { item: 'Fette Biscottate Integrali', quantityValue: 24, quantityUnit: 'fetta/e' }, { item: 'Pasta Integrale', quantityValue: 480, quantityUnit: 'g' }] },
        { category: 'Latticini e Derivati', items: [{ item: 'Yogurt Greco', quantityValue: 150, quantityUnit: 'g' }] },
        { category: 'Verdura e Ortaggi', items: [{ item: 'Pomodorini', quantityValue: 100, quantityUnit: 'g' }, { item: 'Asparagi', quantityValue: 200, quantityUnit: 'g' }, { item: 'Verdure Miste', quantityValue: 1.5, quantityUnit: 'kg' }] },
        { category: 'Condimenti e Spezie', items: [{ item: 'Miele', quantityValue: 1, quantityUnit: 'cucchiaino/i' }, { item: 'Pesto', quantityValue: 12, quantityUnit: 'cucchiaio/i' }] },
        { category: 'Grassi e Frutta Secca', items: [{ item: 'Noci', quantityValue: 3, quantityUnit: 'pezzo/i' }] },
    ],
    pantry: [
        { item: 'Olio EVO', quantityValue: 1, quantityUnit: 'bottiglia/e', originalCategory: 'Condimenti e Spezie' },
        { item: 'Mais', quantityValue: 1, quantityUnit: 'scatoletta/e', originalCategory: 'Dispensa (Secchi, Scatolati, Pasta, Cereali)' },
        { item: 'Marmellata', quantityValue: 1, quantityUnit: 'vasetto/i', originalCategory: 'Condimenti e Spezie' },
        { item: 'Caffè', quantityValue: 1, quantityUnit: 'confezione/i', originalCategory: 'Bevande' },
        { item: 'Sale', quantityValue: 1, quantityUnit: 'kg', originalCategory: 'Condimenti e Spezie' }
    ]
};

export type NavigableTab = 'plan' | 'list' | 'daily' | 'archive' | 'pantry' | 'progress' | 'calendar' | 'settings' | 'dashboard';

export class MealPlanStore {
  status: AppStatus = AppStatus.HYDRATING;
  error: string | null = null;
  masterMealPlan: DayPlan[] = [];
  presetMealPlan: DayPlan[] = []; // Used to reset the master plan
  shoppingList: ShoppingListCategory[] = [];
  pantry: PantryItem[] = [];
  archivedPlans: ArchivedPlan[] = [];
  activeTab: NavigableTab = 'dashboard';
  pdfParseProgress = 0;
  currentPlanName = 'My Diet Plan';
  theme: Theme = 'light';
  locale: Locale = 'it';
  hasUnsavedChanges = false;
  currentPlanId: string | null = null;

  // Plan dates and daily log
  startDate: string | null = null;
  endDate: string | null = null;
  currentDate: string = getTodayDateString();
  currentDayPlan: DailyLog | null = null;
  planToSet: DayPlan[] | null = null; // Holds a new plan before dates are set
  shoppingListManaged = false;

  // Day-specific progress tracking
  currentDayProgress: ProgressRecord | null = null;
  
  onlineMode = true;
  recalculating = false;
  recalculatingMeal: { dayIndex: number; mealIndex: number } | null = null;
  recalculatingActualMeal: { dayIndex: number; mealIndex: number } | null = null;
  recalculatingProgress = false;

  // Global goals and settings
  hydrationGoalLiters = 3;
  stepGoal = 6000;
  bodyMetrics: BodyMetrics = {}; // Holds the LATEST known body metrics for carry-over
  hydrationSnackbar: HydrationSnackbarInfo | null = null;
  progressHistory: ProgressRecord[] = [];
  earnedAchievements: string[] = [];

  sentNotifications = new Map<string, boolean>();
  lastActiveDate: string = getTodayDateString();
  lastModified: number = 0;
  navigationHistory: NavigableTab[] = [];


  constructor() {
    makeAutoObservable(this, {}, { autoBind: true });
    this.init();
    this.loadSessionState();
  }

  init = async () => {
    try {
        const [savedState, progressHistory] = await Promise.all([
            db.appState.get('dietPlanData'),
            db.progressHistory.orderBy('date').toArray()
        ]);
        
        runInAction(() => {
            this.progressHistory = progressHistory;

            if (savedState) {
                const data = savedState.value;

                // Migration for quantity structure
                const migratedPantry = (data.pantry || []).map((p: any) => {
                    if (p.quantity && p.quantityValue === undefined) {
                        const parsed = parseQuantity(p.quantity);
                        p.quantityValue = parsed?.value ?? null;
                        p.quantityUnit = parsed?.unit ?? 'unità';
                    }
                    if (p.originalQuantity && p.originalQuantityValue === undefined) {
                        const parsed = parseQuantity(p.originalQuantity);
                        p.originalQuantityValue = parsed?.value ?? null;
                        p.originalQuantityUnit = parsed?.unit ?? 'unità';
                    }
                    delete p.quantity;
                    delete p.originalQuantity;
                    return p as PantryItem;
                });

                const migratedShoppingList = (data.shoppingList || []).map((cat: any) => ({
                    ...cat,
                    items: cat.items.map((item: any) => {
                        if (item.quantity && item.quantityValue === undefined) {
                            const parsed = parseQuantity(item.quantity);
                            item.quantityValue = parsed?.value ?? null;
                            item.quantityUnit = parsed?.unit ?? 'unità';
                        }
                        delete item.quantity;
                        return item as ShoppingListItem;
                    })
                }));


                this.masterMealPlan = data.masterMealPlan || [];
                this.presetMealPlan = data.presetMealPlan || [];
                this.shoppingList = (migratedShoppingList || []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
                this.pantry = migratedPantry || [];
                this.archivedPlans = data.archivedPlans || [];
                this.currentPlanName = data.currentPlanName || 'My Diet Plan';
                this.theme = data.theme || 'light';
                this.locale = data.locale || 'it';
                this.hasUnsavedChanges = data.hasUnsavedChanges || false;
                this.hydrationGoalLiters = data.hydrationGoalLiters || 3;
                this.lastActiveDate = data.lastActiveDate || getTodayDateString();
                this.currentPlanId = data.currentPlanId || null;
                this.stepGoal = data.stepGoal || 6000;
                this.bodyMetrics = data.bodyMetrics || {};
                this.startDate = data.startDate || null;
                this.endDate = data.endDate || null;
                this.shoppingListManaged = data.shoppingListManaged ?? true; // Default to true for existing users
                this.lastModified = data.lastModified || Date.now();

                if (data.sentNotifications) {
                    this.sentNotifications = new Map(data.sentNotifications);
                }

                if (this.masterMealPlan.length > 0 && !this.currentPlanId) {
                    this.currentPlanId = 'migrated_' + Date.now().toString();
                }

                this.resetSentNotificationsIfNeeded();
                this.updateAchievements();

                if (this.masterMealPlan.length > 0 && this.currentPlanId) {
                    this.status = AppStatus.SUCCESS;
                    if (!this.shoppingListManaged) {
                        this.activeTab = 'list';
                    } else {
                        this.activeTab = 'dashboard';
                    }
                    this.loadPlanForDate(this.currentDate);
                } else {
                    this.status = AppStatus.INITIAL;
                }
            } else {
                this.status = AppStatus.INITIAL;
                this._generateAndInjectMockData();
            }
        });
    } catch (error) {
        console.error("Initialization from DB failed. Starting with a fresh state.", error);
        runInAction(() => {
            this.status = AppStatus.ERROR;
            this.error = "Failed to load data from the database.";
        });
    }
  }

  public startSimulation = async () => {
    runInAction(() => {
        authStore.setLoggedIn({
            id: 'simulated_user',
            name: 'Mario Rossi',
            email: 'mario.rossi@example.com',
            picture: `https://api.dicebear.com/8.x/initials/svg?seed=Mario%20Rossi`,
        }, 'simulated_token');

        const planData = MOCK_MEAL_PLAN_DATA;
        
        // Add items to trigger dashboard alerts
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);
        const threeDaysFromNow = new Date(today);
        threeDaysFromNow.setDate(today.getDate() + 3);

        const alertItems: PantryItem[] = [
            { // Expired item
                item: 'Latte',
                quantityValue: 0.5,
                quantityUnit: 'l',
                originalCategory: 'Latticini e Derivati',
                expiryDate: yesterday.toLocaleDateString('en-CA'),
            },
            { // Expiring soon item
                item: 'Uova',
                quantityValue: 6,
                quantityUnit: 'pezzo/i',
                originalCategory: 'Proteine (Carne, Pesce, Legumi)',
                expiryDate: threeDaysFromNow.toLocaleDateString('en-CA'),
            },
            { // Low stock item
                item: 'Pasta',
                quantityValue: 200,
                quantityUnit: 'g',
                originalCategory: 'Carboidrati e Cereali',
                lowStockThreshold: '250 g', // Threshold is higher than quantity
            },
        ];

        // Add the new items to the mock pantry data
        planData.pantry = [...planData.pantry, ...alertItems];

        const sanitizedPlan = planData.weeklyPlan.map(day => ({
            ...day,
            meals: day.meals.map(meal => ({
                ...meal,
                done: false,
                cheat: false,
                cheatMealDescription: undefined,
                actualNutrition: null,
                items: meal.items.map(item => ({ ...item, used: false }))
            }))
        }));
        
        this.masterMealPlan = sanitizedPlan;
        this.presetMealPlan = JSON.parse(JSON.stringify(sanitizedPlan));
        this.shoppingList = planData.shoppingList.map((cat, index) => ({...cat, sortOrder: index}));
        this.pantry = planData.pantry;
        this.currentPlanName = planData.planName;
        
        const simToday = new Date();
        const endDate = new Date(simToday);
        const startDate = new Date(simToday);
        startDate.setDate(simToday.getDate() - 89);
        
        this.startDate = startDate.toLocaleDateString('en-CA');
        this.endDate = endDate.toLocaleDateString('en-CA');
        
        this.currentPlanId = 'simulated_plan_123';
        this.shoppingListManaged = true;
        this.status = AppStatus.SUCCESS;
        this.activeTab = 'dashboard';
    });
    
    // Generate and inject 90 days of rich progress history
    const mockProgress: ProgressRecord[] = [];
    const mockLogs: DailyLog[] = [];
    const today = new Date();
    const daysToGenerate = 90;
    const DAY_KEYWORDS_FOR_MOCK = ['LUNEDI', 'MARTEDI', 'MERCOLEDI', 'GIOVEDI', 'VENERDI', 'SABATO', 'DOMENICA'];
    let currentWeight = 85;
    let currentBodyFat = 25;
    let currentBodyWater = 55;

    for (let i = daysToGenerate - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toLocaleDateString('en-CA');

        currentWeight -= (Math.random() * 0.15);
        if (date.getDay() === 0 || date.getDay() === 6) { 
            currentWeight += (Math.random() * 0.3 - 0.1);
        }
        currentBodyFat -= (Math.random() * 0.05);
        currentBodyWater += (Math.random() * 0.04);
        
        let adherence: number;
        let waterIntakeMl: number;
        let stepsTaken: number;
        const plannedCalories = 1850;
        let actualCalories: number;

        if (i === 0) {
            adherence = 91; // Stay above 90 to maintain streak
            waterIntakeMl = 3050; // Stay above 3000ml goal to maintain streak
            stepsTaken = 6200 + Math.random() * 1000; // Slightly above goal
            actualCalories = plannedCalories * (adherence / 100);
        } else if (i < 8) { // Ensure the last 7 days also fulfill streak achievements
            adherence = 90 + Math.random() * 10;
            waterIntakeMl = 3000 + Math.random() * 500; // At or above goal
            stepsTaken = 6000 + Math.random() * 6000; // At or above goal
            actualCalories = plannedCalories * (adherence / 100) + (Math.random() * 200 - 100);
        } else { // Generic past data
            adherence = 70 + Math.random() * 30;
            waterIntakeMl = 2000 + Math.random() * 1500;
            stepsTaken = 4000 + Math.random() * 8000;
            actualCalories = plannedCalories * (adherence / 100) + (Math.random() * 200 - 100);
        }
        
        const activityHours = 1 + Math.random() * 1.5;
        const weightKg = parseFloat(currentWeight.toFixed(2));
        const bodyFatPercentage = parseFloat(currentBodyFat.toFixed(2));
        const bodyWaterPercentage = parseFloat(currentBodyWater.toFixed(2));
        const leanMassKg = parseFloat((weightKg * (1 - bodyFatPercentage / 100)).toFixed(2));
        
        const record: ProgressRecord = {
            date: dateStr,
            adherence: Math.round(adherence),
            plannedCalories: Math.round(plannedCalories),
            actualCalories: Math.round(actualCalories),
            weightKg: weightKg,
            bodyFatPercentage: bodyFatPercentage,
            leanMassKg: leanMassKg,
            stepsTaken: Math.round(stepsTaken),
            waterIntakeMl: Math.round(waterIntakeMl),
            bodyWaterPercentage: bodyWaterPercentage,
            activityHours: parseFloat(activityHours.toFixed(2)),
            estimatedCaloriesBurned: calculateCaloriesBurned(stepsTaken, activityHours, weightKg) ?? 0,
        };
        mockProgress.push(record);
        
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        if (isWeekend && Math.random() > 0.6) {
             const dayIndex = (date.getDay() + 6) % 7;
             const log: DailyLog = {
                date: dateStr, day: DAY_KEYWORDS_FOR_MOCK[dayIndex],
                meals: [ { name: 'COLAZIONE', items: [], done: true, time: '08:00' }, { name: 'PRANZO', items: [], done: true, time: '13:00' }, { name: 'CENA', items: [], done: false, cheat: true, cheatMealDescription: 'Pizza night!', time: '20:00' }, ]
            };
            mockLogs.push(log);
        }
    }
    
    await db.dailyLogs.clear();
    await db.progressHistory.clear();

    try {
        await (db as Dexie).transaction('rw', [db.progressHistory, db.dailyLogs], async () => {
            await db.progressHistory.bulkPut(mockProgress);
            await db.dailyLogs.bulkPut(mockLogs);
        });
        runInAction(() => { this.progressHistory = mockProgress; });
        console.log("Mock simulation data injected and saved to DB.");
    } catch (error) {
        console.error("Failed to inject mock simulation data into the database:", error);
    }
    
    await this.saveToDB();
    await this.loadPlanForDate(this.currentDate);
    await this.updateAchievements();
  }

  private async _generateAndInjectMockData() {
    console.log("No existing data found. Generating and injecting mock data for demonstration.");
    const mockProgress: ProgressRecord[] = [];
    const mockLogs: DailyLog[] = [];
    const today = new Date();
    const daysToGenerate = 90;

    const DAY_KEYWORDS_FOR_MOCK = ['LUNEDI', 'MARTEDI', 'MERCOLEDI', 'GIOVEDI', 'VENERDI', 'SABATO', 'DOMENICA'];

    let currentWeight = 85;
    let currentBodyFat = 25;
    let currentBodyWater = 55;

    for (let i = daysToGenerate - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateStr = date.toLocaleDateString('en-CA');

        // Simulate trends with noise
        currentWeight -= (Math.random() * 0.15);
        if (date.getDay() === 0 || date.getDay() === 6) { // Weekend fluctuation
            currentWeight += (Math.random() * 0.3 - 0.1);
        }
        currentBodyFat -= (Math.random() * 0.05);
        currentBodyWater += (Math.random() * 0.04);
        
        let adherence: number;
        let waterIntakeMl: number;

        // Ensure the last 7 days (i < 7) fulfill streak achievements
        if (i < 7) { 
            adherence = 90 + Math.random() * 10;
            waterIntakeMl = 3000 + Math.random() * 500;
        } else {
            adherence = 70 + Math.random() * 30;
            waterIntakeMl = 2000 + Math.random() * 1500;
        }
        
        const plannedCalories = 1850;
        const actualCalories = plannedCalories * (adherence / 100) + (Math.random() * 200 - 100);
        const stepsTaken = 4000 + Math.random() * 8000;
        const activityHours = 1 + Math.random() * 1.5;
        const weightKg = parseFloat(currentWeight.toFixed(2));
        const bodyFatPercentage = parseFloat(currentBodyFat.toFixed(2));
        const bodyWaterPercentage = parseFloat(currentBodyWater.toFixed(2));
        const leanMassKg = parseFloat((weightKg * (1 - bodyFatPercentage / 100)).toFixed(2));
        
        const record: ProgressRecord = {
            date: dateStr,
            adherence: Math.round(adherence),
            plannedCalories: Math.round(plannedCalories),
            actualCalories: Math.round(actualCalories),
            weightKg: weightKg,
            bodyFatPercentage: bodyFatPercentage,
            leanMassKg: leanMassKg,
            stepsTaken: Math.round(stepsTaken),
            waterIntakeMl: Math.round(waterIntakeMl),
            bodyWaterPercentage: bodyWaterPercentage,
            activityHours: parseFloat(activityHours.toFixed(2)),
            estimatedCaloriesBurned: calculateCaloriesBurned(stepsTaken, activityHours, weightKg) ?? 0,
        };
        mockProgress.push(record);

        // Simulate cheat meals on some weekends
        const isWeekend = date.getDay() === 0 || date.getDay() === 6;
        if (isWeekend && Math.random() > 0.6) { // 40% chance of cheat meal on a weekend day
             const dayIndex = (date.getDay() + 6) % 7;
             const log: DailyLog = {
                date: dateStr,
                day: DAY_KEYWORDS_FOR_MOCK[dayIndex],
                meals: [
                    { name: 'COLAZIONE', items: [], done: true, time: '08:00' },
                    { name: 'PRANZO', items: [], done: true, time: '13:00' },
                    { name: 'CENA', items: [], done: false, cheat: true, cheatMealDescription: 'Pizza night!', time: '20:00' },
                ]
            };
            mockLogs.push(log);
        }
    }
    
    try {
        // Fix: Cast `db` to `Dexie` and use array syntax for tables to fix transaction method type error.
        await (db as Dexie).transaction('rw', [db.progressHistory, db.dailyLogs], async () => {
            await db.progressHistory.bulkPut(mockProgress);
            await db.dailyLogs.bulkPut(mockLogs);
        });
        runInAction(() => {
            this.progressHistory = mockProgress;
        });
        console.log("Mock data injected and saved to DB.");
    } catch (error) {
        console.error("Failed to inject mock data into the database:", error);
    }
  }

  loadSessionState = () => {
    try {
        const onlineMode = sessionStorage.getItem('onlineMode');
        if (onlineMode !== null) {
            this.onlineMode = JSON.parse(onlineMode);
        }
    } catch (e) {
        console.error("Could not load session state", e);
        this.onlineMode = true;
    }
  }

  saveSessionState = () => {
    try {
        sessionStorage.setItem('onlineMode', JSON.stringify(this.onlineMode));
    } catch (e) {
        console.error("Could not save session state", e);
    }
  }

  setTheme = (theme: Theme) => { this.theme = theme; this.saveToDB(); }
  setLocale = (locale: Locale) => { this.locale = locale; this.saveToDB(); }
  
  setCurrentDate = (dateStr: string) => {
    if (this.startDate && this.endDate) {
        const newDate = new Date(dateStr);
        const start = new Date(this.startDate);
        const end = new Date(this.endDate);
        if (newDate >= start && newDate <= end) {
            this.currentDate = dateStr;
            this.loadPlanForDate(dateStr);
        }
    }
  }

  setPlanStartDate = (date: string) => {
    if (date && (!this.endDate || date <= this.endDate)) {
        this.startDate = date;
        this.saveToDB();
    }
  }

  setPlanEndDate = (date: string) => {
    if (date && (!this.startDate || date >= this.startDate)) {
        this.endDate = date;
        this.saveToDB();
    }
  }

  setHydrationGoal = (liters: number) => {
    if (liters > 0 && liters <= 10) {
      this.hydrationGoalLiters = liters;
      this.updateHydrationStatus();
      this.saveToDB();
    }
  }
  
  setStepGoal = (steps: number) => {
    if (steps > 0 && steps <= 100000) {
        this.stepGoal = steps;
        this.saveToDB();
    }
  }

  showHydrationSnackbar = (time: string, amount: number) => { this.hydrationSnackbar = { visible: true, time, amount }; }
  dismissHydrationSnackbar = () => { this.hydrationSnackbar = null; }

  updateMealTime = async (dayIndex: number, mealIndex: number, newTime: string) => {
    const meal = this.masterMealPlan[dayIndex]?.meals[mealIndex];
    if (meal) {
      meal.time = newTime;
      const dayOfWeek = new Date(this.currentDate).getDay();
      const masterDayOfWeek = new Date(2024, 0, dayIndex + 1).getDay();
      if (dayOfWeek === masterDayOfWeek && this.currentDayPlan) {
        const dailyMeal = this.currentDayPlan.meals[mealIndex];
        if (dailyMeal) {
            dailyMeal.time = newTime;
            await db.dailyLogs.put(toJS(this.currentDayPlan));
        }
      }
      this.saveToDB();
    }
  }

  markNotificationSent = (key: string) => { this.sentNotifications.set(key, true); this.saveToDB(); }

  resetSentNotificationsIfNeeded = async () => {
    const today = getTodayDateString();
    if (this.lastActiveDate !== today) {
        if (this.currentPlanId) {
            await this.recordDailyProgress(this.lastActiveDate);
        }
        
        runInAction(() => {
            this.sentNotifications.clear();
            this.lastActiveDate = today;
            this.setCurrentDate(today);
            this.saveToDB();
        });
    }
  }

  updateHydrationStatus = () => {
    this.resetSentNotificationsIfNeeded();
    const todayStr = getTodayDateString();
    
    let todaysWaterIntake = 0;
    if (this.currentDate === todayStr && this.currentDayProgress) {
        todaysWaterIntake = this.currentDayProgress.waterIntakeMl ?? 0;
    } else {
        const todaysRecord = this.progressHistory.find(p => p.date === todayStr);
        todaysWaterIntake = todaysRecord?.waterIntakeMl ?? 0;
    }

    const waterIntakeMl = todaysWaterIntake;
    const now = new Date();
    const currentHour = now.getHours();
    if (waterIntakeMl >= this.hydrationGoalLiters * 1000 || currentHour < 9) {
      this.dismissHydrationSnackbar();
      return;
    }
    const amountPerSlot = Math.round((this.hydrationGoalLiters * 1000) / 10);
    const slotsPassed = Math.min(10, Math.max(0, currentHour - 8)); 
    const expectedIntake = slotsPassed * amountPerSlot;
    const missedAmount = expectedIntake - waterIntakeMl;
    if (missedAmount > 50) {
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const roundedMissedAmount = Math.ceil(missedAmount / 50) * 50;
        this.showHydrationSnackbar(currentTime, roundedMissedAmount);
    } else {
        this.dismissHydrationSnackbar();
    }
  };

  // Day-specific progress methods
  saveCurrentDayProgress = async () => {
    if (!this.currentDayProgress) return;
    try {
        const progressToSave = toJS(this.currentDayProgress);
        await db.progressHistory.put(progressToSave, 'date');
        runInAction(() => {
            const existingIndex = this.progressHistory.findIndex(p => p.date === progressToSave.date);
            if (existingIndex > -1) {
                this.progressHistory[existingIndex] = progressToSave;
            } else {
                this.progressHistory.push(progressToSave);
                this.progressHistory.sort((a, b) => a.date.localeCompare(b.date));
            }
        });
        this.updateAchievements();
    } catch (error) {
        console.error("Failed to save progress record to DB", error);
    }
  };

  updateCurrentDayProgress = (field: keyof ProgressRecord, value: number | undefined) => {
    if (!this.currentDayProgress) return;
    
    const updatedProgress = { ...this.currentDayProgress, [field]: value };

    if (['stepsTaken', 'activityHours', 'weightKg'].includes(field)) {
        const { stepsTaken = 0, activityHours = 1, weightKg } = updatedProgress;
        const weightToUse = weightKg ?? this.bodyMetrics.weightKg ?? 70;
        updatedProgress.estimatedCaloriesBurned = calculateCaloriesBurned(stepsTaken, activityHours, weightToUse) ?? 0;
    }
    
    runInAction(() => {
        this.currentDayProgress = updatedProgress;
    });

    if (['weightKg', 'bodyFatPercentage', 'leanMassKg', 'bodyWaterPercentage'].includes(field)) {
        this.setBodyMetric(field as keyof BodyMetrics, value);
    }
    
    this.saveCurrentDayProgress();
  }

  logWaterIntake = (amountMl: number) => {
    if (!this.currentDayProgress) return;
    const currentIntake = this.currentDayProgress.waterIntakeMl || 0;
    this.updateCurrentDayProgress('waterIntakeMl', currentIntake + amountMl);
  }

  setWaterIntake = (amountMl: number) => {
    if (amountMl >= 0) this.updateCurrentDayProgress('waterIntakeMl', amountMl);
  }

  logSteps = (amount: number) => {
    if (!this.currentDayProgress) return;
    const currentSteps = this.currentDayProgress.stepsTaken || 0;
    this.updateCurrentDayProgress('stepsTaken', currentSteps + amount);
  }

  setSteps = (amount: number) => {
    if (amount >= 0) this.updateCurrentDayProgress('stepsTaken', amount);
  }

  setActivityHours = (hours: number) => {
    if (hours >= 0) this.updateCurrentDayProgress('activityHours', hours);
  }

  setBodyMetric = (metric: keyof BodyMetrics, value: number | undefined) => {
    if (value !== undefined && (isNaN(value) || value < 0)) return;
    
    runInAction(() => {
        if (value === undefined) {
            delete this.bodyMetrics[metric];
        } else {
            this.bodyMetrics[metric] = value;
        }
    });

    // Height is a global property, so we save the entire app state when it changes.
    // Other body metrics are part of the daily progress record and are saved there.
    // The `bodyMetrics` object for other metrics acts as a cache for the latest known value
    // to pre-populate future days, and it's updated from `updateCurrentDayProgress`.
    if (['heightCm'].includes(metric)) {
      this.saveToDB();
    }
  }

  recordDailyProgress = async (date: string) => {
    const dayPlan = await db.dailyLogs.get(date);
    if (!dayPlan || dayPlan.meals.length === 0) return;

    let totalDone = 0;
    let plannedCalories = 0;
    let actualCalories = 0;

    dayPlan.meals.forEach(meal => {
        if (meal.done) {
            totalDone++;
            if (meal.actualNutrition) actualCalories += meal.actualNutrition.calories;
            else if (meal.nutrition) actualCalories += meal.nutrition.calories;
        }
        if (meal.nutrition) plannedCalories += meal.nutrition.calories;
    });

    const adherence = Math.round((totalDone / dayPlan.meals.length) * 100);

    let record = await db.progressHistory.get(date);
    if (!record) {
        const latestRecord = await db.progressHistory.where('date').below(date).last();
        record = {
            date,
            adherence: 0,
            plannedCalories: 0,
            actualCalories: 0,
            stepsTaken: 0,
            waterIntakeMl: 0,
            weightKg: latestRecord?.weightKg,
            activityHours: 1, // Default value
        };
    }

    record.adherence = isNaN(adherence) ? 0 : adherence;
    record.plannedCalories = plannedCalories;
    record.actualCalories = actualCalories;

    const weightToUse = record.weightKg ?? this.bodyMetrics.weightKg ?? 70;
    record.estimatedCaloriesBurned = calculateCaloriesBurned(record.stepsTaken, record.activityHours ?? 1, weightToUse) ?? 0;


    try {
        await db.progressHistory.put(record, 'date');
        runInAction(() => {
            const existingIndex = this.progressHistory.findIndex(p => p.date === date);
            if (existingIndex > -1) this.progressHistory[existingIndex] = record!;
            else {
                this.progressHistory.push(record!);
                this.progressHistory.sort((a, b) => a.date.localeCompare(b.date));
            }
        });
        this.updateAchievements();
    } catch (error) {
        console.error("Failed to save progress record to DB", error);
    }
  };

  recalculateAllProgress = async () => {
    if (!this.startDate) {
        console.warn("Recalculation skipped: start date not set.");
        return;
    }
    
    runInAction(() => {
        this.recalculatingProgress = true;
    });

    try {
        const startDate = new Date(this.startDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Iterate from start date up to and including today
        for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toLocaleDateString('en-CA');
            await this.recordDailyProgress(dateStr);
        }

    } catch(e) {
        console.error("Error during manual progress recalculation:", e);
    } finally {
        runInAction(() => {
            this.recalculatingProgress = false;
        });
    }
  }

  setActiveTab = (tab: NavigableTab) => {
    if (tab !== this.activeTab) {
      this.navigationHistory.push(this.activeTab);
      if (this.navigationHistory.length > 10) {
        this.navigationHistory.shift();
      }
      this.activeTab = tab;
    }
  }

  goBack = () => {
    const previousTab = this.navigationHistory.pop();
    if (previousTab) {
      this.activeTab = previousTab;
    }
  }
  
  setCurrentPlanName = (name: string) => { this.currentPlanName = name; this.saveToDB(); }
  updateArchivedPlanName = (planId: string, newName: string) => {
    const planIndex = this.archivedPlans.findIndex(p => p.id === planId);
    if (planIndex > -1) {
      this.archivedPlans[planIndex].name = newName;
      this.saveToDB();
    }
  }
  
  updateItemDescription = (dayIndex: number, mealIndex: number, itemIndex: number, newDescription: string) => {
      const item = this.masterMealPlan[dayIndex]?.meals[mealIndex]?.items[itemIndex];
      if (item && item.fullDescription !== newDescription) {
          item.fullDescription = newDescription;
          const { ingredientName } = extractIngredientInfo(newDescription);
          item.ingredientName = ingredientName;
          if (this.onlineMode) this.hasUnsavedChanges = true;
          this.saveToDB();
      }
  }

  recalculateShoppingList = async () => {
    if (!this.hasUnsavedChanges || !this.onlineMode) return;
    runInAction(() => { this.recalculating = true; });
    try {
        const result = await getPlanDetailsAndShoppingList(this.masterMealPlan);
        if (!result) throw new Error("Failed to get updated plan and list from Gemini.");

        runInAction(() => {
            this.masterMealPlan = result.weeklyPlan.map((day: DayPlan) => ({ ...day, meals: day.meals.map((meal: Meal) => ({ ...meal, done: false, items: meal.items.map(item => ({ ...item, used: false })) })) }));
            this.shoppingList = result.shoppingList.map((cat, index) => ({ ...cat, sortOrder: index }));
            this.pantry = [];
        });

    } catch (error: any) {
        if (isQuotaError(error)) {
            console.warn("Gemini quota exceeded during recalculation. Switching to offline mode.");
            runInAction(() => { this.onlineMode = false; });
            this.saveSessionState();
        } else {
             console.error("Failed to recalculate shopping list:", error);
            runInAction(() => { this.error = error.message; });
        }
    } finally {
        runInAction(() => { this.hasUnsavedChanges = false; this.recalculating = false; });
        this.saveToDB();
    }
  }

  recalculateMealNutrition = async (dayIndex: number, mealIndex: number) => {
    if (!this.onlineMode) return;
    const meal = this.masterMealPlan[dayIndex]?.meals[mealIndex];
    if (!meal) return;
    runInAction(() => { this.recalculatingMeal = { dayIndex, mealIndex }; });
    try {
        const newNutrition = await getNutritionForMeal(meal);
        runInAction(() => {
            if (this.masterMealPlan[dayIndex]?.meals[mealIndex]) {
                this.masterMealPlan[dayIndex].meals[mealIndex].nutrition = newNutrition;
            }
        });
    } catch (error) {
        console.error(`Failed to recalculate nutrition for meal: ${meal.name}`, error);
        if (isQuotaError(error)) { runInAction(() => { this.onlineMode = false }); this.saveSessionState(); }
    } finally {
        runInAction(() => { this.recalculatingMeal = null; });
        this.saveToDB();
    }
  }

    recalculateActualMealNutrition = async () => {
        if (!this.onlineMode || !this.currentDayPlan) return;
        const meal = this.currentDayPlan.meals.find(m => m.done && m.items.some(i => i.used) && m.items.some(i => !i.used));
        if (!meal) return;
        const mealIndex = this.currentDayPlan.meals.indexOf(meal);
        const consumedItems = meal.items.filter(item => item.used);
        if (consumedItems.length === 0 || consumedItems.length === meal.items.length) return;
        runInAction(() => { this.recalculatingActualMeal = { dayIndex: -1, mealIndex: mealIndex }; });
        try {
            const mealWithConsumedItemsOnly = { ...meal, items: consumedItems };
            const newNutrition = await getNutritionForMeal(mealWithConsumedItemsOnly);
            runInAction(() => {
                if (this.currentDayPlan?.meals[mealIndex]) {
                    this.currentDayPlan.meals[mealIndex].actualNutrition = newNutrition;
                    db.dailyLogs.put(toJS(this.currentDayPlan));
                }
            });
        } catch (error) {
            console.error(`Failed to recalculate actual nutrition for meal: ${meal.name}`, error);
            if (isQuotaError(error)) { runInAction(() => { this.onlineMode = false }); this.saveSessionState(); }
        } finally {
            runInAction(() => { this.recalculatingActualMeal = null; });
        }
    }

    resetMealToPreset = (dayIndex: number, mealIndex: number) => {
        if (this.presetMealPlan[dayIndex]?.meals[mealIndex] && this.masterMealPlan[dayIndex]?.meals[mealIndex]) {
            runInAction(() => {
                const presetMeal = JSON.parse(JSON.stringify(this.presetMealPlan[dayIndex].meals[mealIndex]));
                this.masterMealPlan[dayIndex].meals[mealIndex] = presetMeal;

                const masterDay = this.masterMealPlan[dayIndex];
                if (this.currentDayPlan && this.currentDayPlan.day.toUpperCase() === masterDay.day.toUpperCase()) {
                    const updatedDailyLog = toJS(this.currentDayPlan);
                    
                    const newDailyMeal = JSON.parse(JSON.stringify(masterDay.meals[mealIndex]));
                    newDailyMeal.done = false;
                    newDailyMeal.cheat = false;
                    newDailyMeal.cheatMealDescription = undefined;
                    newDailyMeal.actualNutrition = null;
                    newDailyMeal.items.forEach((item: MealItem) => { item.used = false; });
                    
                    updatedDailyLog.meals[mealIndex] = newDailyMeal;
                    this.currentDayPlan = updatedDailyLog;
                    db.dailyLogs.put(updatedDailyLog);
                }
            });
            this.saveToDB();
        }
    }

  saveToDB = async () => {
    try {
      this.lastModified = Date.now();
      const dataToSave: Omit<StoredState, 'waterIntakeMl' | 'stepsTaken'> = {
        masterMealPlan: toJS(this.masterMealPlan),
        presetMealPlan: toJS(this.presetMealPlan),
        shoppingList: toJS(this.shoppingList),
        pantry: toJS(this.pantry),
        archivedPlans: toJS(this.archivedPlans),
        currentPlanName: this.currentPlanName,
        theme: this.theme,
        locale: this.locale,
        hasUnsavedChanges: this.hasUnsavedChanges,
        hydrationGoalLiters: this.hydrationGoalLiters,
        lastActiveDate: this.lastActiveDate,
        currentPlanId: this.currentPlanId,
        sentNotifications: Array.from(this.sentNotifications.entries()),
        stepGoal: this.stepGoal,
        bodyMetrics: toJS(this.bodyMetrics),
        startDate: this.startDate,
        endDate: this.endDate,
        shoppingListManaged: this.shoppingListManaged,
        lastModified: this.lastModified,
      };
      await db.appState.put({ key: 'dietPlanData', value: dataToSave as StoredState });
    } catch (error) {
      console.error("Failed to save data to IndexedDB", error);
    }
  }

  archiveCurrentPlan = () => {
    if (this.masterMealPlan.length === 0) return;
    runInAction(() => {
        this.masterMealPlan = [];
        this.presetMealPlan = [];
        this.shoppingList = [];
        this.pantry = [];
        this.status = AppStatus.INITIAL;
        this.activeTab = 'dashboard';
        this.pdfParseProgress = 0;
        this.currentPlanName = 'My Diet Plan';
        this.hasUnsavedChanges = false;
        this.sentNotifications.clear();
        this.currentPlanId = null;
        this.startDate = null;
        this.endDate = null;
        this.currentDayPlan = null;
        this.currentDayProgress = null;
        this.shoppingListManaged = false;
        db.dailyLogs.clear();
        this.saveToDB();
    });
  }
  
  exitSimulation = async () => {
    runInAction(() => {
        this.masterMealPlan = [];
        this.presetMealPlan = [];
        this.shoppingList = [];
        this.pantry = [];
        this.status = AppStatus.INITIAL;
        this.activeTab = 'dashboard';
        this.pdfParseProgress = 0;
        this.currentPlanName = 'My Diet Plan';
        this.hasUnsavedChanges = false;
        this.sentNotifications.clear();
        this.currentPlanId = null;
        this.startDate = null;
        this.endDate = null;
        this.currentDayPlan = null;
        this.currentDayProgress = null;
        this.shoppingListManaged = false;
        this.progressHistory = []; // Clear in-memory progress
    });
    
    await db.dailyLogs.clear();
    await db.progressHistory.clear();
    
    authStore.setLoggedOut();

    this.saveToDB();
  }

  restorePlanFromArchive = (planId: string) => {
    const planToRestore = this.archivedPlans.find(p => p.id === planId);
    if (!planToRestore) return;
    const restoredPlan = planToRestore.plan.map(day => ({ ...day, meals: day.meals.map(meal => ({ ...meal, done: false, cheat: false, cheatMealDescription: undefined, actualNutrition: null, items: meal.items.map(item => ({...item, used: false})) })) }));
    runInAction(() => {
        this.planToSet = restoredPlan;
        this.status = AppStatus.AWAITING_DATES;
        this.currentPlanName = planToRestore.name;
        this.shoppingList = (planToRestore.shoppingList || []).map((cat, index) => ({...cat, sortOrder: index}));
        this.pantry = [];
        this.archivedPlans = this.archivedPlans.filter(p => p.id !== planId);
    });
  }

  moveShoppingItemToPantry = (itemToMove: ShoppingListItem, categoryName: string) => {
    const existingPantryItem = this.pantry.find(p => p.item.toLowerCase() === itemToMove.item.toLowerCase());
    
    if (existingPantryItem && itemToMove.quantityValue !== null && existingPantryItem.quantityValue !== null && singularize(existingPantryItem.quantityUnit) === singularize(itemToMove.quantityUnit)) {
        existingPantryItem.quantityValue += itemToMove.quantityValue;
        existingPantryItem.originalQuantityValue = itemToMove.quantityValue;
        existingPantryItem.originalQuantityUnit = itemToMove.quantityUnit;
    } else {
        this.pantry.push({
            item: itemToMove.item,
            quantityValue: itemToMove.quantityValue,
            quantityUnit: itemToMove.quantityUnit,
            originalCategory: categoryName,
            originalQuantityValue: itemToMove.quantityValue,
            originalQuantityUnit: itemToMove.quantityUnit
        });
    }
    
    const category = this.shoppingList.find(c => c.category === categoryName);
    if (category) {
        category.items = category.items.filter(i => i.item !== itemToMove.item);
        if (category.items.length === 0) {
            this.shoppingList = this.shoppingList.filter(c => c.category !== categoryName);
        }
    }
    
    runInAction(() => { this.shoppingListManaged = true; });
    this.saveToDB();
    this.updateAchievements();
  }


  movePantryItemToShoppingList = (pantryItemToMove: PantryItem) => {
    runInAction(() => {
        const { originalCategory, quantityValue, quantityUnit, ...shoppingItemData } = pantryItemToMove;
        
        const shoppingItemToMove: ShoppingListItem = {
            item: shoppingItemData.item,
            quantityValue,
            quantityUnit
        };

        const categoryIndex = this.shoppingList.findIndex(c => c.category === originalCategory);
        
        if (categoryIndex === -1) {
            this.shoppingList = [
                ...this.shoppingList,
                { category: originalCategory, items: [shoppingItemToMove], sortOrder: this.shoppingList.length }
            ];
        } else {
            const category = this.shoppingList[categoryIndex];
            const existingShoppingItem = category.items.find(i => i.item.toLowerCase() === shoppingItemToMove.item.toLowerCase());

            if (existingShoppingItem && existingShoppingItem.quantityValue !== null && shoppingItemToMove.quantityValue !== null && singularize(existingShoppingItem.quantityUnit) === singularize(shoppingItemToMove.quantityUnit)) {
                existingShoppingItem.quantityValue += shoppingItemToMove.quantityValue;
            } else {
                category.items.push(shoppingItemToMove);
            }
        }

        this.pantry = this.pantry.filter(p => p.item.toLowerCase() !== pantryItemToMove.item.toLowerCase());
    });
    this.saveToDB();
  }


  updatePantryItem = (itemName: string, updates: Partial<PantryItem>) => {
    const item = this.pantry.find(p => p.item === itemName);
    if (item) {
        Object.assign(item, updates);
        this.saveToDB();
    }
  }

  updatePantryItemLowStockThreshold = (itemName: string, newThreshold: string) => { const item = this.pantry.find(p => p.item === itemName); if (item) { item.lowStockThreshold = newThreshold; this.saveToDB(); } }
  
  addPantryItem = (itemName: string, quantityValue: number | null, quantityUnit: string, category: string) => {
    const trimmedItemName = itemName.trim();
    if (!trimmedItemName || quantityValue === null || !category.trim()) return;
    
    const existingPantryItem = this.pantry.find(p => p.item.toLowerCase() === trimmedItemName.toLowerCase());
    
    if (existingPantryItem && existingPantryItem.quantityValue !== null && quantityValue !== null && singularize(existingPantryItem.quantityUnit) === singularize(quantityUnit)) {
        existingPantryItem.quantityValue += quantityValue;
    } else {
        this.pantry.push({ 
            item: trimmedItemName, 
            quantityValue, 
            quantityUnit, 
            originalCategory: category,
            originalQuantityValue: quantityValue,
            originalQuantityUnit: quantityUnit,
        });
    }
    this.saveToDB();
  }

  addShoppingListItem = (categoryName: string, item: ShoppingListItem) => {
    const category = this.shoppingList.find(c => c.category === categoryName);
    if (category) {
        category.items.push(item);
        this.saveToDB();
    }
  }
  
  deleteShoppingListItem = (categoryName: string, itemIndex: number) => {
    const categoryIndex = this.shoppingList.findIndex(c => c.category === categoryName);
    if (categoryIndex > -1) {
        this.shoppingList[categoryIndex].items.splice(itemIndex, 1);
        if (this.shoppingList[categoryIndex].items.length === 0) {
            this.shoppingList.splice(categoryIndex, 1);
        }
        this.saveToDB();
    }
  }

  updateShoppingListItem = (categoryName: string, itemIndex: number, updatedItem: ShoppingListItem) => {
    const category = this.shoppingList.find(c => c.category === categoryName);
    if (category && category.items[itemIndex]) {
        category.items[itemIndex] = updatedItem;
        this.saveToDB();
    }
  }
  
  addShoppingListCategory = (categoryName: string) => {
    const trimmedName = categoryName.trim();
    if (trimmedName && !this.shoppingList.some(c => c.category.toLowerCase() === trimmedName.toLowerCase())) {
        this.shoppingList.push({ category: trimmedName, items: [], sortOrder: this.shoppingList.length });
        this.saveToDB();
    }
  }

  updateShoppingListCategoryOrder = (categoryName: string, direction: 'up' | 'down') => {
      const index = this.shoppingList.findIndex(c => c.category === categoryName);
      if (index === -1) return;

      const list = toJS(this.shoppingList);
      if (direction === 'up' && index > 0) {
          [list[index - 1], list[index]] = [list[index], list[index - 1]];
      } else if (direction === 'down' && index < list.length - 1) {
          [list[index], list[index + 1]] = [list[index + 1], list[index]];
      }
      
      runInAction(() => {
          this.shoppingList = list.map((cat, i) => ({ ...cat, sortOrder: i }));
      });
      this.saveToDB();
  }
  
  private addPantryItemToShoppingList = (pantryItem: PantryItem) => {
    const { originalCategory } = pantryItem;
    const itemToRestock: ShoppingListItem = {
        item: pantryItem.item,
        quantityValue: pantryItem.originalQuantityValue || pantryItem.quantityValue,
        quantityUnit: pantryItem.originalQuantityUnit || pantryItem.quantityUnit,
    };

    // Prevent duplicates
    const alreadyInList = this.shoppingList.some(cat =>
        cat.items.some(item => item.item.toLowerCase() === pantryItem.item.toLowerCase())
    );
    if (alreadyInList) {
        return;
    }

    runInAction(() => {
        const categoryIndex = this.shoppingList.findIndex(c => c.category === originalCategory);
        if (categoryIndex === -1) {
            this.shoppingList.push({
                category: originalCategory,
                items: [itemToRestock],
                sortOrder: this.shoppingList.length
            });
        } else {
            this.shoppingList[categoryIndex].items.push(itemToRestock);
        }
    });
  }

  private _updatePantryOnItemToggle = (mealItem: MealItem, isConsumed: boolean) => {
    const consumedQty = parseQuantity(mealItem.fullDescription);
    if (!consumedQty || consumedQty.value === null) {
        console.warn(`Could not parse quantity for "${mealItem.fullDescription}", skipping pantry update.`);
        return;
    }

    const singularConsumedName = singularize(mealItem.ingredientName);
    const pantryIndex = this.pantry.findIndex(p => singularize(p.item.toLowerCase()) === singularConsumedName);
    
    if (pantryIndex === -1 && isConsumed) {
        console.warn(`Item "${mealItem.ingredientName}" consumed but not found in pantry.`);
        return;
    }

    runInAction(() => {
        let pantryItem = this.pantry[pantryIndex];
        
        if (isConsumed) {
            if (!pantryItem) return;
            
            if (pantryItem.quantityValue !== null && singularize(pantryItem.quantityUnit) === singularize(consumedQty.unit)) {
                const newPantryValue = pantryItem.quantityValue - consumedQty.value;

                if (newPantryValue <= 0) {
                     this.addPantryItemToShoppingList(pantryItem);
                     this.pantry.splice(pantryIndex, 1);
                } else {
                    pantryItem.quantityValue = newPantryValue;
                    const thresholdStr = pantryItem.lowStockThreshold;
                    if (thresholdStr && thresholdStr.trim() !== '') {
                        const thresholdQty = parseQuantity(thresholdStr);
                        if (thresholdQty && thresholdQty.value !== null && singularize(pantryItem.quantityUnit) === singularize(thresholdQty.unit) && pantryItem.quantityValue <= thresholdQty.value) {
                            this.addPantryItemToShoppingList(pantryItem);
                        }
                    }
                }
            } else {
                console.warn(`Could not deduct "${mealItem.fullDescription}" from pantry item "${pantryItem.item}". Units might not match: Pantry(${pantryItem.quantityUnit}) vs Consumed(${consumedQty.unit})`);
            }
        } else { // Add back to pantry
            if (pantryItem) {
                 if (pantryItem.quantityValue !== null && singularize(pantryItem.quantityUnit) === singularize(consumedQty.unit)) {
                    pantryItem.quantityValue += consumedQty.value;
                 } else {
                    console.warn(`Could not add back "${mealItem.fullDescription}" to pantry item "${pantryItem.item}". Units mismatch.`);
                 }
            } else {
                const category = categorizeIngredient(mealItem.ingredientName);
                this.pantry.push({
                    item: mealItem.ingredientName,
                    quantityValue: consumedQty.value,
                    quantityUnit: consumedQty.unit,
                    originalCategory: category
                });
            }
        }
    });

    this.saveToDB();
  }

  toggleMealItem = async (mealIndex: number, itemIndex: number) => {
    if (!this.currentDayPlan) return;
    const plan = toJS(this.currentDayPlan);
    const mealItem = plan.meals[mealIndex]?.items[itemIndex];
    if (!mealItem) return;

    const originalMealItemState = { ...mealItem };
    mealItem.used = !mealItem.used;
    
    runInAction(() => { this.currentDayPlan = plan; });
    
    this._updatePantryOnItemToggle(originalMealItemState, mealItem.used);

    await db.dailyLogs.put(plan);
  }

  toggleAllItemsInMeal = async (mealIndex: number) => {
    if (!this.currentDayPlan) return;
    const plan = toJS(this.currentDayPlan);
    const meal = plan.meals[mealIndex];
    if (!meal) return;

    // Determine the new state. If some (but not all) are checked, or none are checked, check all. Otherwise, uncheck all.
    const allChecked = meal.items.every(item => item.used);
    const newUsedState = !allChecked;

    // Use a temporary array to process pantry updates without modifying the source during iteration
    const itemsToToggle: { originalState: MealItem, newState: boolean }[] = [];
    
    meal.items.forEach(item => {
        if (item.used !== newUsedState) {
            itemsToToggle.push({ originalState: { ...item }, newState: newUsedState });
            item.used = newUsedState; // Update the item in the cloned plan
        }
    });
    
    // Update the state in MobX so the UI reacts instantly
    runInAction(() => { this.currentDayPlan = plan; });

    // Process pantry updates for all items that changed state
    itemsToToggle.forEach(({ originalState, newState }) => {
        this._updatePantryOnItemToggle(originalState, newState);
    });

    // Save the final state of the daily plan to the database
    await db.dailyLogs.put(plan);
  };

  toggleMealDone = async (mealIndex: number) => {
    if (!this.currentDayPlan) return;
    const plan = toJS(this.currentDayPlan);
    const meal = plan.meals[mealIndex];
    if (meal) {
        meal.done = !meal.done;
        if (meal.done) {
            meal.cheat = false;
            meal.cheatMealDescription = undefined;
        }
        if (!meal.done) meal.actualNutrition = null;
    }
    runInAction(() => { this.currentDayPlan = plan; });
    await db.dailyLogs.put(plan);
  }
  
  logCheatMeal = async (mealIndex: number, description: string) => {
    if (!this.currentDayPlan) return;
    const plan = toJS(this.currentDayPlan);
    const meal = plan.meals[mealIndex];
    if (meal) {
        meal.cheat = true;
        meal.done = false;
        meal.cheatMealDescription = description;
        meal.actualNutrition = null;
    }
    runInAction(() => { this.currentDayPlan = plan; });
    await db.dailyLogs.put(plan);
    this.updateAchievements();
  }
  
  undoCheatMeal = async (mealIndex: number) => {
    if (!this.currentDayPlan) return;
    const plan = toJS(this.currentDayPlan);
    const meal = plan.meals[mealIndex];
    if (meal) {
        meal.cheat = false;
        meal.cheatMealDescription = undefined;
    }
    runInAction(() => { this.currentDayPlan = plan; });
    await db.dailyLogs.put(plan);
  }

  get dailyPlan(): DailyLog | null { return this.currentDayPlan; }

  getDayNutritionSummary(dayPlan: DayPlan | null): NutritionInfo | null {
    if (!this.onlineMode || !dayPlan) return null;
    const summary: NutritionInfo = { carbs: 0, protein: 0, fat: 0, calories: 0 };
    let hasData = false;
    dayPlan.meals.forEach(meal => {
      if (meal.nutrition) {
        hasData = true;
        summary.carbs += meal.nutrition.carbs;
        summary.protein += meal.nutrition.protein;
        summary.fat += meal.nutrition.fat;
        summary.calories += meal.nutrition.calories;
      }
    });
    return hasData ? summary : null;
  }

  get dailyNutritionSummary(): NutritionInfo | null | undefined { return this.getDayNutritionSummary(this.currentDayPlan); }

  private _enrichPlanDataInBackground = async (plan: DayPlan[]) => {
    if (!this.onlineMode) return;
    try {
        const result = await getPlanDetailsAndShoppingList(plan);
        if (result) {
            runInAction(() => {
                this.masterMealPlan = result.weeklyPlan;
                this.shoppingList = result.shoppingList.map((cat, index) => ({ ...cat, sortOrder: index }));
                this.saveToDB();
            });
        }
    } catch (error) {
        if (isQuotaError(error)) {
            runInAction(() => { this.onlineMode = false });
            this.saveSessionState();
        } else {
             console.error("An error occurred during background data enrichment:", error);
        }
    }
  };

  processManualPlan = (planData: DayPlan[]) => {
      const cleanedPlan = planData.map(day => ({ ...day, meals: day.meals.map(meal => ({ ...meal, items: meal.items.filter(item => item.fullDescription.trim() !== '') })).filter(meal => meal.items.length > 0 || (meal.title && meal.title.trim() !== '')) })).filter(day => day.meals.length > 0);
      runInAction(() => {
        if (cleanedPlan.length === 0 || cleanedPlan.every(d => d.meals.length === 0)) {
            this.status = AppStatus.ERROR;
            this.error = "Plan is empty. Please add at least one meal item.";
            return;
        }
        this.planToSet = cleanedPlan;
        this.status = AppStatus.AWAITING_DATES;
      });
  }
  processJsonFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            if (!event.target?.result) throw new Error("File could not be read.");
            const data: ImportedJsonData = JSON.parse(event.target.result as string);
            const sanitizedPlan = data.weeklyPlan.map(day => ({ ...day, meals: day.meals.map(meal => ({ ...meal, done: false, cheat: false, cheatMealDescription: undefined, actualNutrition: null, items: meal.items.map(item => ({...item, used: false})) })) }));
            runInAction(() => {
                this.planToSet = sanitizedPlan;
                this.shoppingList = (data.shoppingList || []).map((cat, index) => ({ ...cat, sortOrder: index }));
                this.pantry = data.pantry || [];
                this.currentPlanName = data.planName || 'My Diet Plan';
                this.status = AppStatus.AWAITING_DATES;
            });
        } catch (e: any) {
            console.error("Failed to parse JSON file", e);
            runInAction(() => { this.status = AppStatus.ERROR; this.error = `Failed to parse JSON file: ${e.message}`; });
        }
    };
    reader.onerror = () => { runInAction(() => { this.status = AppStatus.ERROR; this.error = "An error occurred while reading the file."; }); };
    reader.readAsText(file);
  }
  processPdf = async (file: File) => {
    runInAction(() => { this.status = AppStatus.LOADING; this.pdfParseProgress = 0; });
    try {
        const pdfjs = await import('pdfjs-dist/build/pdf');
        const pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.entry');
        pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        runInAction(() => { this.pdfParseProgress = 10; });
        const pageTexts = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            pageTexts.push(textContent.items.map(item => 'str' in item ? item.str : '').join('\n'));
            runInAction(() => { this.pdfParseProgress = 10 + (i / pdf.numPages) * 20; });
        }
        runInAction(() => { this.pdfParseProgress = 31; });
        if (this.onlineMode) {
            const fullText = pageTexts.join('\n\n');
            const mealStructure = await parseMealStructure(fullText);
            if (!mealStructure) throw new Error("Online parser failed to structure PDF data.");
            runInAction(() => {
                this.pdfParseProgress = 80;
                this.planToSet = mealStructure;
                this.shoppingList = [];
                this.status = AppStatus.AWAITING_DATES;
            });
        } else {
            const { weeklyPlan, shoppingList } = parsePdfText(pageTexts);
            runInAction(() => {
                this.pdfParseProgress = 80;
                this.planToSet = weeklyPlan;
                this.shoppingList = shoppingList.map((cat, index) => ({ ...cat, sortOrder: index }));
                this.status = AppStatus.AWAITING_DATES;
            });
        }
        runInAction(() => { this.pdfParseProgress = 100; });
    } catch (error: any) {
        console.error("Error processing PDF:", error);
        runInAction(() => {
            this.status = AppStatus.ERROR;
            this.error = isQuotaError(error) ? "Gemini API quota exceeded. Try again later." : "Failed to read or parse PDF. It may be corrupted or password-protected.";
        });
    }
  }

  cancelNewPlan = () => {
      this.planToSet = null;
      this.status = this.currentPlanId ? AppStatus.SUCCESS : AppStatus.INITIAL;
  }
  
  commitNewPlan = async (startDate: string, endDate: string) => {
    if (!this.planToSet) return;
    runInAction(() => {
        if (this.masterMealPlan.length > 0) {
            const currentPlanToArchive: ArchivedPlan = { id: this.currentPlanId || Date.now().toString(), name: this.currentPlanName, date: new Date().toLocaleDateString(this.locale === 'it' ? 'it-IT' : 'en-GB'), plan: this.masterMealPlan, shoppingList: this.shoppingList };
            this.archivedPlans.push(currentPlanToArchive);
        }
        this.masterMealPlan = this.planToSet!;
        this.presetMealPlan = JSON.parse(JSON.stringify(this.planToSet));
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = AppStatus.SUCCESS;
        this.activeTab = 'list';
        this.shoppingListManaged = false;
        this.hasUnsavedChanges = false;
        this.sentNotifications.clear();
        this.lastActiveDate = getTodayDateString();
        this.pantry = [];
        this.currentPlanId = Date.now().toString();
        this.currentDate = getTodayDateString();
        this.planToSet = null;
    });

    await db.dailyLogs.clear();
    this.saveToDB();
    this.loadPlanForDate(this.currentDate);

    if (this.onlineMode) {
        this._enrichPlanDataInBackground(this.masterMealPlan);
    } else {
        const shoppingList = generateShoppingListOffline(this.masterMealPlan);
        runInAction(() => { this.shoppingList = shoppingList.map((cat, index) => ({ ...cat, sortOrder: index })); });
        this.saveToDB();
    }
  }

  async loadPlanForDate(dateStr: string) {
    // Load Progress Record for the day
    try {
        const progressRecord = await db.progressHistory.get(dateStr);
        if (progressRecord) {
            runInAction(() => { this.currentDayProgress = progressRecord; });
        } else {
            const latestRecord = await db.progressHistory.where('date').below(dateStr).last();
            // Use store's bodyMetrics as a fallback to ensure the absolute latest data is always considered.
            const newRecord: ProgressRecord = { 
                date: dateStr, adherence: 0, plannedCalories: 0, actualCalories: 0, stepsTaken: 0, waterIntakeMl: 0, 
                weightKg: latestRecord?.weightKg ?? this.bodyMetrics.weightKg, 
                bodyFatPercentage: latestRecord?.bodyFatPercentage ?? this.bodyMetrics.bodyFatPercentage, 
                leanMassKg: latestRecord?.leanMassKg ?? this.bodyMetrics.leanMassKg, 
                bodyWaterPercentage: latestRecord?.bodyWaterPercentage ?? this.bodyMetrics.bodyWaterPercentage, 
                activityHours: 1, 
                estimatedCaloriesBurned: 0 
            };
            runInAction(() => { this.currentDayProgress = newRecord; });
        }
    } catch (e) {
        console.error("Failed to load progress record", e);
        runInAction(() => { this.currentDayProgress = null; });
    }

    if (!this.masterMealPlan.length) {
        runInAction(() => { this.currentDayPlan = null; });
        return;
    }
    
    // Load Daily Log (meals)
    try {
        let dailyLog: DailyLog | undefined | null = await db.dailyLogs.get(dateStr);
        if (!dailyLog) {
            const date = new Date(dateStr);
            const dayIndex = (date.getDay() + 6) % 7;
            const dayMap = ['LUNEDI', 'MARTEDI', 'MERCOLEDI', 'GIOVEDI', 'VENERDI', 'SABATO', 'DOMENICA'];
            const dayName = dayMap[dayIndex];
            const masterDay = this.masterMealPlan.find(d => d.day.toUpperCase() === dayName);

            if (masterDay) {
                const newDailyLog: DailyLog = { ...JSON.parse(JSON.stringify(masterDay)), date: dateStr };
                newDailyLog.meals.forEach(meal => { meal.done = false; meal.cheat = false; meal.cheatMealDescription = undefined; meal.actualNutrition = null; meal.items.forEach(item => item.used = false); });
                await db.dailyLogs.put(newDailyLog);
                dailyLog = newDailyLog;
            }
        }
        runInAction(() => { this.currentDayPlan = dailyLog || null; });
    } catch (e) {
        console.error("Failed to load or create day plan", e);
        runInAction(() => { this.currentDayPlan = null; });
    }
  }

  get adherenceStreak(): number {
    let streak = 0;
    for (let i = this.progressHistory.length - 1; i >= 0; i--) {
        const record = this.progressHistory[i];
        if (record.adherence >= 90) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
  }

  get hydrationStreak(): number {
    let streak = 0;
    const goalMl = this.hydrationGoalLiters * 1000;
    for (let i = this.progressHistory.length - 1; i >= 0; i--) {
        const record = this.progressHistory[i];
        if (record.waterIntakeMl >= goalMl) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
  }
  
  get expiredItems(): PantryItem[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return this.pantry
        .filter(item => {
            if (!item.expiryDate) return false;
            const expiryDate = new Date(item.expiryDate);
            expiryDate.setHours(0, 0, 0, 0);
            return expiryDate < today;
        })
        .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());
  }

  get expiringSoonItems(): PantryItem[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    return this.pantry
      .filter(item => {
        if (!item.expiryDate) return false;
        const expiryDate = new Date(item.expiryDate);
        expiryDate.setHours(0,0,0,0);
        return expiryDate >= today && expiryDate <= sevenDaysFromNow;
      })
      .sort((a, b) => new Date(a.expiryDate!).getTime() - new Date(b.expiryDate!).getTime());
  }

  get lowStockItems(): PantryItem[] {
    return this.pantry.filter(item => {
        if (!item.lowStockThreshold || item.quantityValue === null) return false;
        
        const threshold = parseQuantity(item.lowStockThreshold);
        if (!threshold || threshold.value === null) return false;
        
        // Only compare if units are the same for simplicity
        if (singularize(item.quantityUnit) === singularize(threshold.unit)) {
            return item.quantityValue <= threshold.value;
        }
        
        return false;
    });
  }



  updateAchievements = async () => {
    const earned: string[] = [];
    if (this.progressHistory.length === 0 && this.pantry.length === 0) {
        runInAction(() => this.earnedAchievements = []);
        return;
    };

    // Time-based & Simple Milestones
    if (this.progressHistory.length >= 1) earned.push('firstDayComplete');
    if (this.progressHistory.length >= 7) earned.push('firstWeekComplete');
    if (this.progressHistory.length >= 30) earned.push('achievementMonthComplete');
    if (this.progressHistory.some(p => {
        // By adding 'T12:00:00' we create the date object at noon in the local timezone,
        // which avoids any issues with DST or timezone boundaries at midnight.
        // getDay() will reliably return the correct day of the week for the date string.
        const date = new Date(`${p.date}T12:00:00`);
        return date.getDay() === 1; // 1 = Monday
    })) {
        earned.push('firstMondayComplete');
    }

    // Weight-based
    const initialWeight = this.progressHistory[0]?.weightKg;
    const currentWeight = this.progressHistory[this.progressHistory.length - 1]?.weightKg;
    if (initialWeight && currentWeight) {
        if (initialWeight - currentWeight >= 5) earned.push('fiveKgLost');
        if (initialWeight - currentWeight >= 10) earned.push('achievement10kgLost');
    }
    
    // Streak-based
    if (this.adherenceStreak >= 7) earned.push('perfectWeekAdherence');
    if (this.hydrationStreak >= 7) earned.push('perfectWeekHydration');
    
    // Cumulative
    const totalSteps = this.progressHistory.reduce((sum, record) => sum + (record.stepsTaken || 0), 0);
    if (totalSteps >= 250000) earned.push('achievementStepMarathon');
    
    // Interaction-based
    if (this.pantry.length >= 5) earned.push('pantryOrganized');
    
    // Async checks (DB queries)
    const hasCheatMeal = await db.dailyLogs.filter(log => log.meals.some(m => m.cheat)).count();
    if (hasCheatMeal > 0) earned.push('firstCheatMeal');

    runInAction(() => {
        this.earnedAchievements = Array.from(new Set(earned));
    });
  }
}

export const mealPlanStore = new MealPlanStore();