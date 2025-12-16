
import {makeAutoObservable, runInAction, toJS, computed} from 'mobx';
import Dexie from 'dexie';
import {
    ArchivedPlan,
    BodyMetrics,
    DailyLog,
    DayPlan,
    HydrationSnackbarInfo,
    Locale,
    Meal,
    MealItem,
    NutritionInfo,
    PantryItem,
    ProgressRecord,
    ShoppingListCategory,
    ShoppingListItem,
    StoredState,
    Theme,
    GenericPlanData,
    GenericPlanPreferences,
    PlanCreationData
} from '../types';
import {categorizeIngredient, extractIngredientInfo, singularize, DAY_KEYWORDS} from '../services/offlineParser';
import {getPlanDetailsAndShoppingList, isQuotaError} from '../services/geminiService';
import {parseQuantity} from '../utils/quantityParser';
import {db} from '../services/db';
import {calculateCaloriesBurned} from '../utils/calories';
import {authStore} from './AuthStore';
import {readSharedFile} from '../services/driveService';
import { trackEvent } from '../services/analyticsService';

export enum AppStatus {
    INITIAL,
    HYDRATING,
    LOADING,
    IMPORTING,
    SYNCING,
    SUCCESS,
    ERROR,
    AWAITING_DATES,
}

interface ImportedJsonData extends PlanCreationData {
    pantry?: PantryItem[];
    startDate?: string;
    endDate?: string;
    showBodyMetricsInApp?: boolean;
    stepGoal?: number;
    hydrationGoalLiters?: number;
}

const getTodayDateString = () => new Date().toLocaleDateString('en-CA');

const MOCK_MEAL_PLAN_DATA = {
    planName: 'Demo Plan',
    weeklyPlan: [
        {
            day: 'LUNEDI',
            meals: [
                {
                    name: 'COLAZIONE',
                    title: 'Yogurt & Cereali',
                    items: [{
                        ingredientName: 'Yogurt Greco',
                        fullDescription: '150g di Yogurt Greco',
                        used: false
                    }, {
                        ingredientName: 'Miele',
                        fullDescription: '1 cucchiaino di miele',
                        used: false
                    }, {ingredientName: 'Noci', fullDescription: '3 noci', used: false}],
                    done: false,
                    time: '08:00',
                    nutrition: {carbs: 25, protein: 15, fat: 10, calories: 250}
                },
            ]
        }
    ],
    shoppingList: [],
    pantry: []
};

export type NavigableTab =
    'plan'
    | 'list'
    | 'daily'
    | 'archive'
    | 'pantry'
    | 'progress'
    | 'calendar'
    | 'settings'
    | 'dashboard'
    | 'upload';

export class MealPlanStore {
    status: AppStatus = AppStatus.HYDRATING;
    error: string | null = null;
    masterMealPlan: DayPlan[] = [];
    presetMealPlan: DayPlan[] = []; // Used to reset the master plan
    shoppingList: ShoppingListCategory[] = [];
    pantry: PantryItem[] = [];
    archivedPlans: ArchivedPlan[] = [];
    activeTab: NavigableTab = 'dashboard';
    currentPlanName = 'My Diet Plan';
    theme: Theme = 'light';
    locale: Locale = 'it';
    currentPlanId: string | null = null;

    // Generic Plan Support
    isGenericPlan = false;
    genericPlanData: GenericPlanData | null = null;
    genericPlanPreferences: GenericPlanPreferences = {};

    // Plan dates and daily log
    startDate: string | null = null;
    endDate: string | null = null;
    currentDate: string = getTodayDateString();
    currentDayPlan: DailyLog | null = null;
    planToSet: DayPlan[] | null = null; // Holds a new plan before dates are set
    shoppingListManaged = false;

    // Day-specific progress tracking
    currentDayProgress: ProgressRecord | null = null;

    recalculatingProgress = false;
    showMacros = false;
    showCheatMealButton = false;
    showBodyMetricsInApp = true;

    // Global goals and settings
    hydrationGoalLiters = 3;
    stepGoal = 6000;
    bodyMetrics: BodyMetrics = {};
    bodyFatUnit: 'kg' | '%' = 'kg';
    bodyWaterUnit: 'liters' | '%' = 'liters';
    hydrationSnackbar: HydrationSnackbarInfo | null = null;
    progressHistory: ProgressRecord[] = [];
    earnedAchievements: string[] = [];

    sentNotifications = new Map<string, boolean>();
    lastActiveDate: string = getTodayDateString();
    lastModified: number = 0;
    
    // Sync Versioning
    planVersion: number = 0;
    
    onlineMode = true;
    recalculatingActualMeal: { mealIndex: number } | null = null;


    constructor() {
        makeAutoObservable(this, {
            dailyPlan: computed,
            dailyNutritionSummary: computed,
            adherenceStreak: computed,
            hydrationStreak: computed,
            expiringSoonItems: computed,
            lowStockItems: computed,
            expiredItems: computed
        }, {autoBind: true});
    }

    get dailyPlan() {
        return this.currentDayPlan;
    }

    setActiveTab(tab: NavigableTab) {
        this.activeTab = tab;
        trackEvent('tab_changed', { tab });
    }

    navigateTo(tab: NavigableTab, replace: boolean = false) {
        this.setActiveTab(tab);
        if (replace) {
            window.history.replaceState({ tab }, '', `/${tab}`);
        } else {
            window.history.pushState({ tab }, '', `/${tab}`);
        }
        window.dispatchEvent(new PopStateEvent('popstate'));
    }

    setCurrentPlanName(name: string) {
        this.currentPlanName = name;
        this.saveToDB();
    }

    setCurrentDate(date: string) {
        this.currentDate = date;
        this.loadPlanForDate(date);
    }

    setTheme(theme: Theme) {
        this.theme = theme;
        this.saveToDB();
    }

    setLocale(locale: Locale) {
        this.locale = locale;
        this.saveToDB();
    }

    setShowMacros(show: boolean) {
        this.showMacros = show;
        this.saveToDB();
    }

    setShowCheatMealButton(show: boolean) {
        this.showCheatMealButton = show;
        this.saveToDB();
    }

    recalculateActualMealNutrition = async (mealIndex: number) => {
        if (!this.currentDayPlan || !this.onlineMode) return;
        
        runInAction(() => {
            this.recalculatingActualMeal = { mealIndex };
        });

        // Simplified recalculation for demo, actual logic would involve AI call or lookup
        setTimeout(() => {
            runInAction(() => {
                if (this.currentDayPlan && this.currentDayPlan.meals[mealIndex]) {
                    const original = this.currentDayPlan.meals[mealIndex].nutrition;
                    if (original) {
                        this.currentDayPlan.meals[mealIndex].actualNutrition = {
                            calories: original.calories * 0.9,
                            carbs: original.carbs * 0.9,
                            protein: original.protein * 0.9,
                            fat: original.fat * 0.9,
                        };
                    }
                }
                this.recalculatingActualMeal = null;
                this.saveToDB();
            });
        }, 1500);
    }

    init = async () => {
        runInAction(() => {
            if (!process.env.API_KEY) {
                this.onlineMode = false;
            }
        });

        const queryParams = new URLSearchParams(window.location.search);
        const planIdFromUrl = queryParams.get('plan_id');

        if (planIdFromUrl) {
            await this.importPlanFromUrl(planIdFromUrl);
            return;
        }

        try {
            const [savedState, progressHistory] = await Promise.all([
                db.appState.get('dietPlanData'),
                db.progressHistory.orderBy('date').toArray()
            ]);

            runInAction(() => {
                this.progressHistory = progressHistory;

                if (savedState) {
                    const data = savedState.value;
                    
                    this.masterMealPlan = data.masterMealPlan || [];
                    this.presetMealPlan = data.presetMealPlan || [];
                    
                    this.isGenericPlan = data.isGenericPlan || false;
                    this.genericPlanData = data.genericPlanData || null;
                    this.genericPlanPreferences = data.genericPlanPreferences || {};

                    this.shoppingList = (data.shoppingList || []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
                    this.pantry = data.pantry || [];
                    this.archivedPlans = data.archivedPlans || [];
                    this.currentPlanName = data.currentPlanName || 'My Diet Plan';
                    this.theme = data.theme || 'light';
                    this.locale = data.locale || 'it';
                    this.hydrationGoalLiters = data.hydrationGoalLiters || 3;
                    this.lastActiveDate = data.lastActiveDate || getTodayDateString();
                    this.currentPlanId = data.currentPlanId || null;
                    this.stepGoal = data.stepGoal || 6000;
                    this.bodyMetrics = data.bodyMetrics || {};
                    this.startDate = data.startDate || null;
                    this.endDate = data.endDate || null;
                    this.shoppingListManaged = data.shoppingListManaged ?? true;
                    this.lastModified = data.lastModified || Date.now();
                    this.showMacros = data.showMacros ?? false;
                    this.showCheatMealButton = data.showCheatMealButton ?? false;
                    this.showBodyMetricsInApp = data.showBodyMetricsInApp ?? true;
                    this.bodyFatUnit = data.bodyFatUnit || 'kg';
                    this.bodyWaterUnit = data.bodyWaterUnit || 'liters';
                    this.planVersion = data.planVersion || 0;

                    if (data.sentNotifications) {
                        this.sentNotifications = new Map(data.sentNotifications);
                    }

                    if (this.masterMealPlan.length > 0 && !this.currentPlanId) {
                        this.currentPlanId = 'migrated_' + Date.now().toString();
                    }

                    this.resetSentNotificationsIfNeeded();
                    this.updateAchievements();

                    if ((this.masterMealPlan.length > 0 || this.isGenericPlan) && this.currentPlanId) {
                        this.status = AppStatus.SUCCESS;
                        this.loadPlanForDate(this.currentDate);
                    } else {
                        this.status = AppStatus.INITIAL;
                    }
                } else {
                    this.status = AppStatus.INITIAL;
                }
            });
        } catch (error) {
            console.error("Initialization from DB failed.", error);
            runInAction(() => {
                this.status = AppStatus.ERROR;
                this.error = "Failed to load data from the database.";
            });
        }
    }

    resetSentNotificationsIfNeeded() {
        if (this.currentDate !== this.lastActiveDate) {
            this.sentNotifications.clear();
            this.lastActiveDate = this.currentDate;
            this.saveToDB();
        }
    }

    markNotificationSent(key: string) {
        this.sentNotifications.set(key, true);
        this.saveToDB();
    }

    public startSimulation = async () => {
        runInAction(() => {
             this.isGenericPlan = false;
             this.genericPlanData = null;
             this.status = AppStatus.LOADING;
        });
        
        const mockData = MOCK_MEAL_PLAN_DATA;
        
        runInAction(() => {
            this.processImportedData({
                ...mockData,
                startDate: getTodayDateString(),
                endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA'),
                type: 'weekly'
            });
            this.currentPlanId = 'simulated_plan_123';
        });
        trackEvent('simulation_started');
    }

    public exitSimulation = async () => {
        await db.appState.clear();
        await db.dailyLogs.clear();
        await db.progressHistory.clear();
        trackEvent('simulation_ended');
        window.location.reload();
    }

    setGenericPlanPreference = (day: string, sectionKey: string, selectedIndices: number[]) => {
        if (!this.genericPlanPreferences[day]) {
            this.genericPlanPreferences[day] = {};
        }
        this.genericPlanPreferences[day][sectionKey] = selectedIndices;
        this.saveToDB();
    }

    setStepGoal(steps: number) {
        this.stepGoal = steps;
        this.saveToDB();
    }

    setHydrationGoal(liters: number) {
        this.hydrationGoalLiters = liters;
        this.saveToDB();
    }

    setBodyMetric(metric: keyof BodyMetrics, value: number | undefined) {
        this.bodyMetrics[metric] = value;
        this.saveToDB();
        
        if (this.currentDayProgress) {
            const updates: any = {};
            if (metric === 'weightKg') updates.weightKg = value;
            if (metric === 'heightCm') updates.heightCm = value;
            if (metric === 'bodyFatKg') updates.bodyFatKg = value;
            if (metric === 'bodyFatPercentage') updates.bodyFatPercentage = value;
            if (metric === 'leanMassKg') updates.leanMassKg = value;
            if (metric === 'bodyWaterLiters') updates.bodyWaterLiters = value;
            if (metric === 'bodyWaterPercentage') updates.bodyWaterPercentage = value;
            
            if (Object.keys(updates).length > 0) {
                this.updateCurrentDayProgressObject(updates);
            }
        }
        trackEvent('body_metrics_updated', { metric, value });
    }

    saveToDB = async () => {
        try {
            this.lastModified = Date.now();
            const dataToSave: Omit<StoredState, 'waterIntakeMl' | 'stepsTaken' | 'hasUnsavedChanges'> = {
                masterMealPlan: toJS(this.masterMealPlan),
                presetMealPlan: toJS(this.presetMealPlan),
                shoppingList: toJS(this.shoppingList),
                pantry: toJS(this.pantry),
                archivedPlans: toJS(this.archivedPlans),
                currentPlanName: this.currentPlanName,
                theme: this.theme,
                locale: this.locale,
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
                showMacros: this.showMacros,
                showCheatMealButton: this.showCheatMealButton,
                showBodyMetricsInApp: this.showBodyMetricsInApp,
                bodyFatUnit: this.bodyFatUnit,
                bodyWaterUnit: this.bodyWaterUnit,
                isGenericPlan: this.isGenericPlan,
                genericPlanData: toJS(this.genericPlanData || undefined),
                genericPlanPreferences: toJS(this.genericPlanPreferences),
                planVersion: this.planVersion,
            };
            await db.appState.put({key: 'dietPlanData', value: dataToSave as StoredState});
        } catch (error) {
            console.error("Failed to save data to IndexedDB", error);
        }
    }

    processImportedData = async (data: ImportedJsonData) => {
        try {
            const isGeneric = data.type === 'generic';
            
            runInAction(() => {
                this.shoppingList = (data.shoppingList || []).map((cat, index) => ({...cat, sortOrder: index}));
                this.pantry = data.pantry || [];
                this.currentPlanName = data.planName || 'My Diet Plan';
                this.showBodyMetricsInApp = data.showBodyMetricsInApp ?? false;
                if (data.stepGoal) this.stepGoal = data.stepGoal;
                if (data.hydrationGoalLiters) this.hydrationGoalLiters = data.hydrationGoalLiters;
                
                this.isGenericPlan = isGeneric;
                
                if (isGeneric && data.genericPlan) {
                    this.genericPlanData = data.genericPlan;
                    this.planToSet = []; 
                    this.genericPlanPreferences = {};
                } else {
                    const sanitizedPlan = data.weeklyPlan.map(day => ({
                        ...day,
                        meals: day.meals.map(meal => ({
                            ...meal,
                            done: false,
                            actualNutrition: null,
                            items: (meal.items || []).map(item => ({...item, used: false}))
                        }))
                    }));
                    this.planToSet = sanitizedPlan;
                    this.genericPlanData = null;
                }
            });

            trackEvent('plan_imported', { 
                type: isGeneric ? 'generic' : 'weekly',
                has_start_date: !!data.startDate 
            });

            if (data.startDate && data.endDate) {
                await this.commitNewPlan(data.startDate, data.endDate);
                this.navigateTo('list', true);
            } else {
                runInAction(() => {
                    this.status = AppStatus.AWAITING_DATES;
                });
            }
        } catch (e: any) {
            console.error("Failed to process imported JSON data", e);
            runInAction(() => {
                this.status = AppStatus.ERROR;
                this.error = `Failed to process JSON data: ${e.message}`;
            });
        }
    }

    importPlanFromUrl = async (url: string) => {
        runInAction(() => {
            this.status = AppStatus.IMPORTING;
        });
        try {
            const data = await readSharedFile(url);
            await this.processImportedData(data);
            trackEvent('plan_imported_from_url');
        } catch (e: any) {
            console.error("Failed to import plan from URL", e);
            runInAction(() => {
                this.status = AppStatus.ERROR;
                this.error = `Failed to import plan: ${e.message}`;
            });
        }
    }

    processJsonFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const data = JSON.parse(text);
                await this.processImportedData(data);
                trackEvent('plan_imported_from_file');
            } catch (error: any) {
                console.error("Failed to parse JSON file", error);
                runInAction(() => {
                    this.status = AppStatus.ERROR;
                    this.error = "Invalid JSON file.";
                });
            }
        };
        reader.readAsText(file);
    };

    cancelNewPlan = () => {
        this.status = AppStatus.SUCCESS;
        this.planToSet = null;
        if (!this.currentPlanId) {
            this.navigateTo('upload');
        }
    }

    commitNewPlan = async (startDate: string, endDate: string) => {
        runInAction(() => {
            // Priority logic: Handle date overlap.
            // If the new plan starts before the current plan ends, adjust the current plan's end date.
            const newStart = new Date(startDate);
            const currentEnd = this.endDate ? new Date(this.endDate) : null;
            const currentStart = this.startDate ? new Date(this.startDate) : null;

            if (this.currentPlanId && currentEnd && currentStart) {
                // Check if new start is within current range (but not before start)
                if (newStart <= currentEnd && newStart > currentStart) {
                    const adjustedEndDate = new Date(newStart);
                    adjustedEndDate.setDate(adjustedEndDate.getDate() - 1);
                    this.endDate = adjustedEndDate.toISOString().split('T')[0];
                }
            }

            if (this.masterMealPlan.length > 0 || (this.isGenericPlan && this.genericPlanData)) {
                const currentPlanToArchive: ArchivedPlan = {
                    id: this.currentPlanId || Date.now().toString(),
                    name: this.currentPlanName,
                    date: new Date().toLocaleDateString(this.locale === 'it' ? 'it-IT' : 'en-GB'),
                    plan: this.masterMealPlan, 
                    shoppingList: this.shoppingList
                };
                this.archivedPlans.push(currentPlanToArchive);
            }
            
            if (!this.isGenericPlan && this.planToSet) {
                this.masterMealPlan = this.planToSet!;
                this.presetMealPlan = JSON.parse(JSON.stringify(this.planToSet));
            } else {
                this.masterMealPlan = [];
                this.presetMealPlan = [];
            }

            this.startDate = startDate;
            this.endDate = endDate;
            this.status = AppStatus.SUCCESS;
            this.shoppingListManaged = false;
            this.sentNotifications.clear();
            this.lastActiveDate = getTodayDateString();
            this.pantry = [];
            this.currentPlanId = Date.now().toString();
            this.currentDate = getTodayDateString();
            this.planToSet = null;
            
            // Increment plan version on every commit to prioritize local changes during sync
            this.planVersion = (this.planVersion || 0) + 1;
        });

        await db.dailyLogs.clear();
        this.saveToDB();
        this.loadPlanForDate(this.currentDate);
        trackEvent('plan_dates_set', { start: startDate, end: endDate });
    }

    private generateDailyLogFromGeneric(dateStr: string, dayName: string): DailyLog {
        if (!this.genericPlanData) throw new Error("No generic plan data available");

        const preferences = this.genericPlanPreferences[dayName.toUpperCase()] || {};
        const generatedMeals: Meal[] = [];

        const processSection = (sectionTitle: string, sectionKey: string, options: Meal[]) => {
            const selectedIndices = preferences[sectionKey];
            options.forEach((option, index) => {
                // If selectedIndices is undefined, show all. If it exists, only show included.
                if (selectedIndices && !selectedIndices.includes(index)) return;

                generatedMeals.push({
                    ...toJS(option),
                    done: false,
                    cheat: false,
                    section: sectionTitle,
                    items: option.items.map(i => ({ ...toJS(i), used: false }))
                });
            });
        };

        // Migration for snacks from old plan structure
        const allSnacks = [...(this.genericPlanData.snacks || []), ...(this.genericPlanData.snack1 || []), ...(this.genericPlanData.snack2 || [])];

        processSection("COLAZIONE", "breakfast", this.genericPlanData.breakfast);
        if (allSnacks.length > 0) {
            processSection("SPUNTINI", "snacks", allSnacks);
        }
        processSection("PRANZO - CARBOIDRATI", "lunch_carbs", this.genericPlanData.lunch.carbs);
        processSection("PRANZO - PROTEINE", "lunch_protein", this.genericPlanData.lunch.protein);
        processSection("PRANZO - VERDURE", "lunch_vegetables", this.genericPlanData.lunch.vegetables);
        processSection("PRANZO - GRASSI", "lunch_fats", this.genericPlanData.lunch.fats);
        processSection("CENA - CARBOIDRATI", "dinner_carbs", this.genericPlanData.dinner.carbs);
        processSection("CENA - PROTEINE", "dinner_protein", this.genericPlanData.dinner.protein);
        processSection("CENA - VERDURE", "dinner_vegetables", this.genericPlanData.dinner.vegetables);
        processSection("CENA - GRASSI", "dinner_fats", this.genericPlanData.dinner.fats);

        return {
            date: dateStr,
            day: dayName,
            meals: generatedMeals
        };
    }

    async loadPlanForDate(dateStr: string) {
        try {
            const progressRecord = await db.progressHistory.where('date').equals(dateStr).first();
            if (progressRecord) {
                runInAction(() => { this.currentDayProgress = progressRecord; });
            } else {
                const latestRecord = await db.progressHistory.where('date').below(dateStr).last();
                const newRecord: ProgressRecord = {
                    date: dateStr, adherence: 0, plannedCalories: 0, actualCalories: 0, stepsTaken: 0, waterIntakeMl: 0,
                    weightKg: latestRecord?.weightKg ?? this.bodyMetrics.weightKg,
                    bodyFatKg: latestRecord?.bodyFatKg ?? this.bodyMetrics.bodyFatKg,
                    bodyFatPercentage: latestRecord?.bodyFatPercentage ?? this.bodyMetrics.bodyFatPercentage,
                    leanMassKg: latestRecord?.leanMassKg ?? this.bodyMetrics.leanMassKg,
                    bodyWaterLiters: latestRecord?.bodyWaterLiters ?? this.bodyMetrics.bodyWaterLiters,
                    bodyWaterPercentage: latestRecord?.bodyWaterPercentage ?? this.bodyMetrics.bodyWaterPercentage,
                    activityHours: 1,
                    estimatedCaloriesBurned: 0
                };
                runInAction(() => { this.currentDayProgress = newRecord; });
            }
        } catch (e) {
            console.error("Failed to load progress record", e);
        }

        if (!this.masterMealPlan.length && !this.isGenericPlan) {
            runInAction(() => { this.currentDayPlan = null; });
            return;
        }

        try {
            let dailyLog: DailyLog | undefined | null = await db.dailyLogs.where('date').equals(dateStr).first();
            
            if (!dailyLog) {
                const date = new Date(dateStr);
                const dayIndex = (date.getDay() + 6) % 7;
                const dayName = DAY_KEYWORDS[dayIndex];

                if (this.isGenericPlan && this.genericPlanData) {
                    dailyLog = this.generateDailyLogFromGeneric(dateStr, dayName);
                    await db.dailyLogs.put(dailyLog);
                } else {
                    const masterDay = this.masterMealPlan.find(d => d.day.toUpperCase() === dayName);
                    if (masterDay) {
                        dailyLog = {...JSON.parse(JSON.stringify(masterDay)), date: dateStr};
                        dailyLog!.meals.forEach(meal => {
                            meal.done = false;
                            meal.cheat = false;
                            meal.cheatMealDescription = undefined;
                            meal.actualNutrition = null;
                            meal.items.forEach(item => item.used = false);
                        });
                        await db.dailyLogs.put(dailyLog!);
                    }
                }
            }
            runInAction(() => {
                this.currentDayPlan = dailyLog || null;
            });
        } catch (e) {
            console.error("Failed to load or create day plan", e);
            runInAction(() => { this.currentDayPlan = null; });
        }
    }

    resetMealToPreset = (dayIndex: number, mealIndex: number) => {
        if (this.isGenericPlan) {
             if (this.currentDayPlan && this.currentDayPlan.meals[mealIndex]) {
                runInAction(() => {
                    const meal = this.currentDayPlan!.meals[mealIndex];
                    meal.done = false;
                    meal.cheat = false;
                    meal.cheatMealDescription = undefined;
                    meal.actualNutrition = null;
                    meal.items.forEach(item => item.used = false);
                    db.dailyLogs.put(toJS(this.currentDayPlan!));
                });
             }
             return;
        }

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
                    newDailyMeal.items.forEach((item: MealItem) => {
                        item.used = false;
                    });
                    updatedDailyLog.meals[mealIndex] = newDailyMeal;
                    this.currentDayPlan = updatedDailyLog;
                    db.dailyLogs.put(updatedDailyLog);
                }
            });
            this.saveToDB();
        }
    }

    toggleMealDone = (mealIndex: number) => {
        if (this.currentDayPlan) {
            const meal = this.currentDayPlan.meals[mealIndex];
            meal.done = !meal.done;
            
            if (meal.done && !meal.cheat && !meal.actualNutrition && this.onlineMode) {
                this.recalculateActualMealNutrition(mealIndex);
            }
            
            this.updateDailyLog(this.currentDayPlan);
            this.updateAchievements();
            trackEvent('meal_toggled', { status: meal.done ? 'done' : 'todo', mealName: meal.name });
        }
    }

    toggleAllItemsInMeal = (mealIndex: number) => {
        if (this.currentDayPlan) {
            const meal = this.currentDayPlan.meals[mealIndex];
            const allUsed = meal.items.every(i => i.used);
            meal.items.forEach(i => i.used = !allUsed);
            this.updateDailyLog(this.currentDayPlan);
        }
    }

    updateItemDescription = (dayIndex: number, mealIndex: number, itemIndex: number, description: string) => {
        if (dayIndex >= 0 && this.masterMealPlan[dayIndex]) {
             runInAction(() => {
                this.masterMealPlan[dayIndex].meals[mealIndex].items[itemIndex].fullDescription = description;
                this.saveToDB();
             });
        }
        
        if (this.currentDayPlan) {
             const currentDayIndex = this.masterMealPlan.findIndex(d => d.day === this.currentDayPlan?.day);
             if (dayIndex === currentDayIndex) {
                 runInAction(() => {
                     if (this.currentDayPlan!.meals[mealIndex].items[itemIndex]) {
                        this.currentDayPlan!.meals[mealIndex].items[itemIndex].fullDescription = description;
                        this.updateDailyLog(this.currentDayPlan!);
                     }
                 });
             }
        }
    }

    toggleMealItem = (mealIndex: number, itemIndex: number) => {
        if (this.currentDayPlan) {
            const item = this.currentDayPlan.meals[mealIndex].items[itemIndex];
            item.used = !item.used;
            this.updateDailyLog(this.currentDayPlan);
        }
    }

    updateDailyLog(log: DailyLog) {
        db.dailyLogs.put(toJS(log));
        this.updateStatsForDate(log.date);
    }

    async updateStatsForDate(date: string) {
        if (!this.currentDayProgress || this.currentDayProgress.date !== date) return; 

        const log = this.currentDayPlan;
        if (!log) return;

        const totalMeals = log.meals.length;
        const doneMeals = log.meals.filter(m => m.done).length;
        const adherence = totalMeals > 0 ? (doneMeals / totalMeals) * 100 : 0;

        let plannedCals = 0;
        let actualCals = 0;

        log.meals.forEach(m => {
            if (m.nutrition) plannedCals += m.nutrition.calories;
            if (m.actualNutrition) actualCals += m.actualNutrition.calories;
            else if (m.done && m.nutrition && !m.cheat) actualCals += m.nutrition.calories; 
        });

        runInAction(() => {
            this.currentDayProgress!.adherence = adherence;
            this.currentDayProgress!.plannedCalories = plannedCals;
            this.currentDayProgress!.actualCalories = actualCals;
        });

        await db.progressHistory.put(toJS(this.currentDayProgress!));
    }

    logCheatMeal = (mealIndex: number, description: string) => {
        if (this.currentDayPlan) {
            const meal = this.currentDayPlan.meals[mealIndex];
            meal.cheat = true;
            meal.cheatMealDescription = description;
            meal.done = true;
            this.updateDailyLog(this.currentDayPlan);
            this.updateAchievements();
            trackEvent('cheat_meal_logged', { description });
        }
    }

    undoCheatMeal = (mealIndex: number) => {
        if (this.currentDayPlan) {
            const meal = this.currentDayPlan.meals[mealIndex];
            meal.cheat = false;
            meal.cheatMealDescription = undefined;
            meal.done = false;
            this.updateDailyLog(this.currentDayPlan);
        }
    }

    updateMealTime = (dayIndex: number, mealIndex: number, time: string) => {
        runInAction(() => {
            if (this.masterMealPlan[dayIndex]) {
                this.masterMealPlan[dayIndex].meals[mealIndex].time = time;
                this.saveToDB();
            }
            if (this.currentDayPlan) {
                 const currentDayIndex = this.masterMealPlan.findIndex(d => d.day === this.currentDayPlan?.day);
                 if (dayIndex === currentDayIndex) {
                     this.currentDayPlan.meals[mealIndex].time = time;
                     this.updateDailyLog(this.currentDayPlan);
                 }
            }
        });
    }

    // Hydration
    setWaterIntake(ml: number) {
        if (this.currentDayProgress) {
            this.updateCurrentDayProgress('waterIntakeMl', ml);
            this.updateAchievements();
        }
    }

    logWaterIntake(amount: number) {
        if (this.currentDayProgress) {
            const current = this.currentDayProgress.waterIntakeMl || 0;
            this.setWaterIntake(current + amount);
            trackEvent('water_logged', { amount_ml: amount, total: current + amount });
        }
    }

    updateHydrationStatus() {
        if (!this.hydrationSnackbar) {
            const now = new Date();
            const currentHour = now.getHours();
            if (currentHour >= 8 && currentHour <= 22) {
                const targetPerHour = (this.hydrationGoalLiters * 1000) / 14; 
                const expectedIntake = targetPerHour * (currentHour - 7);
                const currentIntake = this.currentDayProgress?.waterIntakeMl || 0;
                
                if (currentIntake < expectedIntake - 250) { 
                     this.hydrationSnackbar = { visible: true, time: now.toLocaleTimeString(), amount: 250 };
                }
            }
        }
    }

    dismissHydrationSnackbar() {
        this.hydrationSnackbar = null;
    }

    // Steps & Activity
    setSteps(steps: number) {
        if (this.currentDayProgress) {
            this.updateCurrentDayProgress('stepsTaken', steps);
            this.updateCalorieBurn();
            this.updateAchievements();
        }
    }

    logSteps(amount: number) {
        if (this.currentDayProgress) {
            const current = this.currentDayProgress.stepsTaken || 0;
            this.setSteps(current + amount);
            trackEvent('steps_logged', { amount, total: current + amount });
        }
    }

    setActivityHours(hours: number) {
        if (this.currentDayProgress) {
            this.updateCurrentDayProgress('activityHours', hours);
            this.updateCalorieBurn();
        }
    }

    updateCalorieBurn() {
        if (this.currentDayProgress && this.bodyMetrics.weightKg) {
            const burn = calculateCaloriesBurned(
                this.currentDayProgress.stepsTaken || 0,
                this.currentDayProgress.activityHours || 1,
                this.bodyMetrics.weightKg
            );
            if (burn !== null) {
                this.updateCurrentDayProgress('estimatedCaloriesBurned', burn);
            }
        }
    }

    updateCurrentDayProgressObject(updates: Partial<ProgressRecord>) {
        if (this.currentDayProgress) {
            runInAction(() => {
                Object.assign(this.currentDayProgress!, updates);
            });
            db.progressHistory.put(toJS(this.currentDayProgress));
        }
    }

    updateCurrentDayProgress(metric: keyof ProgressRecord, value: any) {
        this.updateCurrentDayProgressObject({ [metric]: value });
    }

    recalculateAllProgress = async () => {
        this.recalculatingProgress = true;
        try {
            // Simplified, could implement full recalculation from daily logs
            await new Promise(resolve => setTimeout(resolve, 2000));
        } finally {
            runInAction(() => { this.recalculatingProgress = false; });
        }
    }

    // Shopping List
    addShoppingListCategory(categoryName: string) {
        if (!this.shoppingList.find(c => c.category === categoryName)) {
            this.shoppingList.push({ category: categoryName, items: [] });
            this.saveToDB();
        }
    }

    addShoppingListItem(category: string, item: ShoppingListItem) {
        const cat = this.shoppingList.find(c => c.category === category);
        if (cat) {
            cat.items.push(item);
            this.saveToDB();
            trackEvent('shopping_item_added', { item: item.item, category });
        }
    }

    updateShoppingListItem(category: string, itemIndex: number, newItem: ShoppingListItem) {
        const cat = this.shoppingList.find(c => c.category === category);
        if (cat) {
            cat.items[itemIndex] = newItem;
            this.saveToDB();
        }
    }

    deleteShoppingListItem(category: string, itemIndex: number) {
        const cat = this.shoppingList.find(c => c.category === category);
        if (cat) {
            cat.items.splice(itemIndex, 1);
            this.saveToDB();
        }
    }

    moveShoppingItemToPantry(item: ShoppingListItem, category: string) {
        const cat = this.shoppingList.find(c => c.category === category);
        if (cat) {
            const index = cat.items.findIndex(i => i.item === item.item);
            if (index > -1) {
                cat.items.splice(index, 1);
            }
        }
        this.addPantryItem(item.item, item.quantityValue, item.quantityUnit, category);
        this.saveToDB();
    }

    updateShoppingListCategoryOrder(category: string, direction: 'up' | 'down') {
        const index = this.shoppingList.findIndex(c => c.category === category);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex >= 0 && newIndex < this.shoppingList.length) {
            const temp = this.shoppingList[index];
            this.shoppingList[index] = this.shoppingList[newIndex];
            this.shoppingList[newIndex] = temp;
            this.shoppingList.forEach((c, i) => c.sortOrder = i);
            this.saveToDB();
        }
    }

    // Pantry
    addPantryItem(item: string, quantityValue: number | null, quantityUnit: string, category: string) {
        const existing = this.pantry.find(p => p.item === item);
        if (existing) {
            existing.quantityValue = quantityValue;
            existing.quantityUnit = quantityUnit;
        } else {
            this.pantry.push({
                item,
                quantityValue,
                quantityUnit,
                originalCategory: category,
                originalQuantityValue: quantityValue,
                originalQuantityUnit: quantityUnit
            });
        }
        this.saveToDB();
        trackEvent('pantry_item_added', { item, category });
    }

    updatePantryItem(item: string, updates: Partial<PantryItem>) {
        const index = this.pantry.findIndex(p => p.item === item);
        if (index > -1) {
            const updated = { ...this.pantry[index], ...updates };
            this.pantry[index] = updated;
            this.saveToDB();
        }
    }

    movePantryItemToShoppingList(pantryItem: PantryItem) {
        this.pantry = this.pantry.filter(p => p.item !== pantryItem.item);
        let category = pantryItem.originalCategory;
        if (!this.shoppingList.find(c => c.category === category)) {
            if (!category) category = 'Altro';
            this.addShoppingListCategory(category);
        }
        this.addShoppingListItem(category, {
            item: pantryItem.item,
            quantityValue: pantryItem.originalQuantityValue ?? pantryItem.quantityValue,
            quantityUnit: pantryItem.originalQuantityUnit ?? pantryItem.quantityUnit
        });
        this.saveToDB();
    }

    // Archive
    updateArchivedPlanName(id: string, name: string) {
        const plan = this.archivedPlans.find(p => p.id === id);
        if (plan) {
            plan.name = name;
            this.saveToDB();
        }
    }

    restorePlanFromArchive(id: string) {
        const plan = this.archivedPlans.find(p => p.id === id);
        if (plan) {
            this.processImportedData({
                planName: plan.name,
                weeklyPlan: plan.plan,
                shoppingList: plan.shoppingList,
                type: 'weekly'
            });
            this.status = AppStatus.AWAITING_DATES;
        }
    }

    getDayNutritionSummary(day: DayPlan): NutritionInfo {
        let calories = 0, carbs = 0, protein = 0, fat = 0;
        day.meals.forEach(meal => {
            if (meal.nutrition && !meal.cheat) {
                calories += meal.nutrition.calories;
                carbs += meal.nutrition.carbs;
                protein += meal.nutrition.protein;
                fat += meal.nutrition.fat;
            }
        });
        return { calories, carbs, protein, fat };
    }

    get dailyNutritionSummary() {
        return this.currentDayPlan ? this.getDayNutritionSummary(this.currentDayPlan) : null;
    }

    get adherenceStreak() {
        // Simplified streak logic
        return 0; 
    }

    get hydrationStreak() {
        return 0;
    }

    get expiringSoonItems() {
        return this.pantry.filter(p => {
            if (!p.expiryDate) return false;
            const diff = new Date(p.expiryDate).getTime() - new Date().getTime();
            const days = diff / (1000 * 3600 * 24);
            return days >= 0 && days <= 7;
        });
    }

    get lowStockItems() {
        return this.pantry.filter(p => {
            if (!p.lowStockThreshold || p.quantityValue === null) return false;
            const threshold = parseQuantity(p.lowStockThreshold)?.value;
            return threshold !== null && p.quantityValue <= threshold;
        });
    }

    get expiredItems() {
        return this.pantry.filter(p => {
            if (!p.expiryDate) return false;
            return new Date(p.expiryDate) < new Date();
        });
    }

    updateAchievements() {
        const newAchievements: string[] = [];
        
        if (this.progressHistory.length > 0) newAchievements.push('firstDayComplete');
        if (this.progressHistory.length >= 7) newAchievements.push('firstWeekComplete');
        if (this.progressHistory.length >= 30) newAchievements.push('achievementMonthComplete');
        
        if (this.progressHistory.some(p => new Date(p.date).getDay() === 1)) {
            newAchievements.push('firstMondayComplete');
        }
        
        if (this.pantry.length >= 5) newAchievements.push('pantryOrganized');

        newAchievements.forEach(a => {
            if (!this.earnedAchievements.includes(a)) {
                this.earnedAchievements.push(a);
            }
        });
    }
}

export const mealPlanStore = new MealPlanStore();
