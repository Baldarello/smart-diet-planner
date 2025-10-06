import { makeAutoObservable, runInAction, toJS } from 'mobx';
// Fix: Import the 'StoredState' type to resolve 'Cannot find name' errors.
import { MealPlanData, DayPlan, ShoppingListCategory, ArchivedPlan, PantryItem, ShoppingListItem, Theme, Locale, Meal, NutritionInfo, HydrationSnackbarInfo, BodyMetrics, ProgressRecord, DailyLog, StoredState, MealItem } from '../types';
import { parsePdfText, generateShoppingList as generateShoppingListOffline, extractIngredientInfo, singularize, categorizeIngredient } from '../services/offlineParser';
import { parseMealStructure, getNutritionForMeal, getPlanDetailsAndShoppingList, isQuotaError } from '../services/geminiService';
import { parseQuantity, formatQuantity } from '../utils/quantityParser';
import { db } from '../services/db';
import { calculateCaloriesBurned } from '../utils/calories';

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

export class MealPlanStore {
  status: AppStatus = AppStatus.HYDRATING;
  error: string | null = null;
  masterMealPlan: DayPlan[] = [];
  presetMealPlan: DayPlan[] = []; // Used to reset the master plan
  shoppingList: ShoppingListCategory[] = [];
  pantry: PantryItem[] = [];
  archivedPlans: ArchivedPlan[] = [];
  activeTab: 'plan' | 'list' | 'daily' | 'archive' | 'pantry' | 'progress' | 'calendar' = 'daily';
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
  stepGoal = 20000;
  bodyMetrics: BodyMetrics = {}; // Holds the LATEST known body metrics for carry-over
  hydrationSnackbar: HydrationSnackbarInfo | null = null;
  progressHistory: ProgressRecord[] = [];

  sentNotifications = new Map<string, boolean>();
  lastActiveDate: string = getTodayDateString();

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
                this.masterMealPlan = data.masterMealPlan || [];
                this.presetMealPlan = data.presetMealPlan || [];
                this.shoppingList = data.shoppingList || [];
                this.pantry = data.pantry || [];
                this.archivedPlans = data.archivedPlans || [];
                this.currentPlanName = data.currentPlanName || 'My Diet Plan';
                this.theme = data.theme || 'light';
                this.locale = data.locale || 'it';
                this.hasUnsavedChanges = data.hasUnsavedChanges || false;
                this.hydrationGoalLiters = data.hydrationGoalLiters || 3;
                this.lastActiveDate = data.lastActiveDate || getTodayDateString();
                this.currentPlanId = data.currentPlanId || null;
                this.stepGoal = data.stepGoal || 20000;
                this.bodyMetrics = data.bodyMetrics || {};
                this.startDate = data.startDate || null;
                this.endDate = data.endDate || null;
                this.shoppingListManaged = data.shoppingListManaged ?? true; // Default to true for existing users

                if (data.sentNotifications) {
                    this.sentNotifications = new Map(data.sentNotifications);
                }

                if (this.masterMealPlan.length > 0 && !this.currentPlanId) {
                    this.currentPlanId = 'migrated_' + Date.now().toString();
                }

                this.resetSentNotificationsIfNeeded();

                if (this.masterMealPlan.length > 0 && this.currentPlanId) {
                    this.status = AppStatus.SUCCESS;
                    if (!this.shoppingListManaged) {
                        this.activeTab = 'list';
                    }
                    this.loadPlanForDate(this.currentDate);
                } else {
                    this.status = AppStatus.INITIAL;
                }
            } else {
                this.status = AppStatus.INITIAL;
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


  setActiveTab = (tab: 'plan' | 'list' | 'daily' | 'archive' | 'pantry' | 'progress' | 'calendar') => { this.activeTab = tab; }
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
            this.shoppingList = result.shoppingList;
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
        this.activeTab = 'daily';
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
  
  restorePlanFromArchive = (planId: string) => {
    const planToRestore = this.archivedPlans.find(p => p.id === planId);
    if (!planToRestore) return;
    const restoredPlan = planToRestore.plan.map(day => ({ ...day, meals: day.meals.map(meal => ({ ...meal, done: false, cheat: false, cheatMealDescription: undefined, actualNutrition: null, items: meal.items.map(item => ({...item, used: false})) })) }));
    runInAction(() => {
        this.planToSet = restoredPlan;
        this.status = AppStatus.AWAITING_DATES;
        this.currentPlanName = planToRestore.name;
        this.shoppingList = planToRestore.shoppingList;
        this.pantry = [];
        this.archivedPlans = this.archivedPlans.filter(p => p.id !== planId);
    });
  }

  moveShoppingItemToPantry = (itemToMove: ShoppingListItem, categoryName: string) => {
    const existingPantryItem = this.pantry.find(p => p.item.toLowerCase() === itemToMove.item.toLowerCase());
    if (existingPantryItem) {
        const pantryQuantity = parseQuantity(existingPantryItem.quantity);
        const itemQuantity = parseQuantity(itemToMove.quantity);
        if (pantryQuantity && itemQuantity && pantryQuantity.unit === itemQuantity.unit) {
            pantryQuantity.value += itemQuantity.value;
            existingPantryItem.quantity = formatQuantity(pantryQuantity);
        } else {
            existingPantryItem.quantity += `, ${itemToMove.quantity}`;
        }
        // When merging, the "original" quantity for restocking should be the size of the new package just bought.
        existingPantryItem.originalQuantity = itemToMove.quantity;
    } else {
        this.pantry.push({ ...itemToMove, originalCategory: categoryName, originalQuantity: itemToMove.quantity });
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
  }

  movePantryItemToShoppingList = (pantryItemToMove: PantryItem) => {
    runInAction(() => {
        const { originalCategory, ...shoppingItemToMove } = pantryItemToMove;
        
        const categoryIndex = this.shoppingList.findIndex(c => c.category === originalCategory);
        
        if (categoryIndex === -1) {
            // Category does not exist, create it and add the item.
            // This re-assignment is key for MobX reactivity.
            this.shoppingList = [
                ...this.shoppingList,
                { category: originalCategory, items: [shoppingItemToMove] }
            ];
        } else {
            // Category exists, find if item exists to merge or add.
            const category = this.shoppingList[categoryIndex];
            const existingShoppingItem = category.items.find(i => i.item.toLowerCase() === shoppingItemToMove.item.toLowerCase());

            if (existingShoppingItem) {
                // Item exists, merge quantity.
                const shoppingQuantity = parseQuantity(existingShoppingItem.quantity);
                const itemQuantity = parseQuantity(shoppingItemToMove.quantity);
                if (shoppingQuantity && itemQuantity && shoppingQuantity.unit === itemQuantity.unit) {
                    shoppingQuantity.value += itemQuantity.value;
                    existingShoppingItem.quantity = formatQuantity(shoppingQuantity);
                } else {
                    existingShoppingItem.quantity += `, ${shoppingItemToMove.quantity}`;
                }
            } else {
                // Item does not exist, add it. This mutation is fine because the category object is observable.
                category.items.push(shoppingItemToMove);
            }
        }

        // Remove item from pantry by creating a new array.
        this.pantry = this.pantry.filter(p => p.item.toLowerCase() !== pantryItemToMove.item.toLowerCase());
    });
    this.saveToDB();
  }

  updatePantryItemQuantity = (itemName: string, newQuantity: string) => { const item = this.pantry.find(p => p.item === itemName); if (item) { item.quantity = newQuantity; this.saveToDB(); } }
  
  addPantryItem = (itemName: string, quantity: string, category: string) => {
    const trimmedItemName = itemName.trim();
    if (!trimmedItemName || !quantity.trim() || !category.trim()) return;
    
    const existingPantryItem = this.pantry.find(p => p.item.toLowerCase() === trimmedItemName.toLowerCase());
    
    if (existingPantryItem) {
        const pantryQuantity = parseQuantity(existingPantryItem.quantity);
        const itemQuantity = parseQuantity(quantity);
        
        if (pantryQuantity && itemQuantity && pantryQuantity.unit === itemQuantity.unit) {
            pantryQuantity.value += itemQuantity.value;
            existingPantryItem.quantity = formatQuantity(pantryQuantity);
        } else {
            existingPantryItem.quantity += `, ${quantity}`;
        }
    } else {
        this.pantry.push({ item: trimmedItemName, quantity: quantity, originalCategory: category });
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
        this.shoppingList.push({ category: trimmedName, items: [] });
        this.saveToDB();
    }
  }
  
  private _updatePantryOnItemToggle = (mealItem: MealItem, isConsumed: boolean) => {
    const consumedQty = parseQuantity(mealItem.fullDescription);
    if (!consumedQty) {
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
        if (isConsumed) { // Deduct from pantry
            const pantryItem = this.pantry[pantryIndex];
            const pantryQuantities = pantryItem.quantity.split(',').map(s => s.trim());
            let deducted = false;

            const updatedQuantities = pantryQuantities.map(pantryQtyStr => {
                if (deducted) return pantryQtyStr;

                const pantryQty = parseQuantity(pantryQtyStr);
                const unitsMatch = pantryQty && (singularize(pantryQty.unit) === singularize(consumedQty.unit));

                if (unitsMatch) {
                    const newPantryValue = pantryQty.value - consumedQty.value;
                    const roundedNewPantryValue = Math.round(newPantryValue * 100) / 100;
                    
                    deducted = true;
                    if (roundedNewPantryValue > 0) {
                        return formatQuantity({ value: roundedNewPantryValue, unit: pantryQty.unit });
                    }
                    return null; // This quantity part is depleted
                }
                return pantryQtyStr;
            }).filter((q): q is string => q !== null);

            if (!deducted) {
                console.warn(`Could not deduct "${mealItem.fullDescription}" from pantry item "${pantryItem.item}" with quantity "${pantryItem.quantity}". Units might not match.`);
                return;
            }

            if (updatedQuantities.length === 0) {
                // Item is fully depleted, move to shopping list
                const itemToRestock: ShoppingListItem = {
                    item: pantryItem.item,
                    quantity: pantryItem.originalQuantity || pantryItem.quantity,
                };
                const { originalCategory } = pantryItem;
                const category = this.shoppingList.find(c => c.category === originalCategory);
                if (category) {
                    category.items.push(itemToRestock);
                } else {
                    this.shoppingList.push({ category: originalCategory, items: [itemToRestock] });
                }
                this.pantry.splice(pantryIndex, 1);
            } else {
                pantryItem.quantity = updatedQuantities.join(', ');
            }

        } else { // Add back to pantry
            let pantryItem = this.pantry[pantryIndex];

            if (pantryItem) {
                const pantryQuantities = pantryItem.quantity.split(',').map(s => s.trim());
                let added = false;

                const restoredQuantities = pantryQuantities.map(pantryQtyStr => {
                    if (added) return pantryQtyStr;
                    const pantryQty = parseQuantity(pantryQtyStr);
                    const unitsMatch = pantryQty && (singularize(pantryQty.unit) === singularize(consumedQty.unit));
                    if (unitsMatch) {
                        const newValue = pantryQty.value + consumedQty.value;
                        added = true;
                        return formatQuantity({ value: newValue, unit: pantryQty.unit });
                    }
                    return pantryQtyStr;
                });

                if (added) {
                    pantryItem.quantity = restoredQuantities.join(', ');
                } else {
                    pantryItem.quantity = [...pantryQuantities, formatQuantity(consumedQty)].join(', ');
                }
            } else {
                // Item wasn't in pantry, add it back.
                const category = categorizeIngredient(mealItem.ingredientName);
                this.pantry.push({
                    item: mealItem.ingredientName,
                    quantity: formatQuantity(consumedQty),
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
                this.shoppingList = result.shoppingList;
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
                this.shoppingList = data.shoppingList;
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
                this.shoppingList = shoppingList;
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
        runInAction(() => { this.shoppingList = shoppingList; });
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
}

export const mealPlanStore = new MealPlanStore();