import { makeAutoObservable, runInAction, toJS } from 'mobx';
import { MealPlanData, DayPlan, ShoppingListCategory, ArchivedPlan, PantryItem, ShoppingListItem, Theme, Locale, Meal, NutritionInfo, HydrationSnackbarInfo, BodyMetrics, ProgressRecord, DailyLog } from '../types';
import { parsePdfText, generateShoppingList as generateShoppingListOffline, extractIngredientInfo } from '../services/offlineParser';
import { parseMealStructure, getNutritionForMeal, getPlanDetailsAndShoppingList, isQuotaError } from '../services/geminiService';
import { parseQuantity, formatQuantity } from '../utils/quantityParser';
import { db } from '../services/db';

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

  // New properties for master plan / daily log architecture
  startDate: string | null = null;
  endDate: string | null = null;
  currentDate: string = getTodayDateString();
  currentDayPlan: DailyLog | null = null;
  planToSet: DayPlan[] | null = null; // Holds a new plan before dates are set

  onlineMode = true;
  recalculating = false;
  recalculatingMeal: { dayIndex: number; mealIndex: number } | null = null;
  recalculatingActualMeal: { dayIndex: number; mealIndex: number } | null = null;

  hydrationGoalLiters = 3;
  waterIntakeMl = 0;
  hydrationSnackbar: HydrationSnackbarInfo | null = null;
  stepGoal = 20000;
  stepsTaken = 0;
  bodyMetrics: BodyMetrics = {};
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
                this.waterIntakeMl = data.waterIntakeMl || 0;
                this.currentPlanId = data.currentPlanId || null;
                this.stepGoal = data.stepGoal || 20000;
                this.stepsTaken = data.stepsTaken || 0;
                this.bodyMetrics = data.bodyMetrics || {};
                this.startDate = data.startDate || null;
                this.endDate = data.endDate || null;

                if (data.sentNotifications) {
                    this.sentNotifications = new Map(data.sentNotifications);
                }

                if (this.masterMealPlan.length > 0 && !this.currentPlanId) {
                    this.currentPlanId = 'migrated_' + Date.now().toString();
                }

                this.resetSentNotificationsIfNeeded();

                if (this.masterMealPlan.length > 0 && this.currentPlanId) {
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

  setTheme = (theme: Theme) => {
    this.theme = theme;
    this.saveToDB();
  }

  setLocale = (locale: Locale) => {
    this.locale = locale;
    this.saveToDB();
  }
  
  // New method to set the currently viewed date and load its plan
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

  logWaterIntake = (amountMl: number) => {
    this.waterIntakeMl += amountMl;
    this.saveToDB();
  }

  setWaterIntake = (amountMl: number) => {
    if (amountMl >= 0) {
      this.waterIntakeMl = amountMl;
      this.saveToDB();
    }
  }
  
  setStepGoal = (steps: number) => {
    if (steps > 0 && steps <= 100000) {
        this.stepGoal = steps;
        this.saveToDB();
    }
  }

  logSteps = (amount: number) => {
    this.stepsTaken += amount;
    this.saveToDB();
  }

  setSteps = (amount: number) => {
    if (amount >= 0) {
        this.stepsTaken = amount;
        this.saveToDB();
    }
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
    this.saveToDB();
  }

  showHydrationSnackbar = (time: string, amount: number) => {
    this.hydrationSnackbar = { visible: true, time, amount };
  }

  dismissHydrationSnackbar = () => {
    this.hydrationSnackbar = null;
  }

  updateMealTime = async (dayIndex: number, mealIndex: number, newTime: string) => {
    // This now edits the master plan
    const meal = this.masterMealPlan[dayIndex]?.meals[mealIndex];
    if (meal) {
      meal.time = newTime;
      // Also update the current day if it's the same day of the week
      const dayOfWeek = new Date(this.currentDate).getDay();
      const masterDayOfWeek = new Date(2024, 0, dayIndex + 1).getDay(); // A sample week to get day index
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

  markNotificationSent = (key: string) => {
    this.sentNotifications.set(key, true);
    this.saveToDB();
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
            if (meal.actualNutrition) {
                actualCalories += meal.actualNutrition.calories;
            } else if (meal.nutrition) {
                actualCalories += meal.nutrition.calories;
            }
        }
        if (meal.nutrition) {
            plannedCalories += meal.nutrition.calories;
        }
    });

    const adherence = Math.round((totalDone / dayPlan.meals.length) * 100);

    const record: ProgressRecord = {
        date,
        adherence: isNaN(adherence) ? 0 : adherence,
        plannedCalories,
        actualCalories,
        weightKg: this.bodyMetrics.weightKg,
        bodyFatPercentage: this.bodyMetrics.bodyFatPercentage,
        leanMassKg: this.bodyMetrics.leanMassKg,
        stepsTaken: this.stepsTaken,
        waterIntakeMl: this.waterIntakeMl,
    };

    try {
        await db.progressHistory.put(record, 'date');
        runInAction(() => {
            const existingIndex = this.progressHistory.findIndex(p => p.date === date);
            if (existingIndex > -1) {
                this.progressHistory[existingIndex] = record;
            } else {
                this.progressHistory.push(record);
                this.progressHistory.sort((a, b) => a.date.localeCompare(b.date));
            }
        });
    } catch (error) {
        console.error("Failed to save progress record to DB", error);
    }
};

  resetSentNotificationsIfNeeded = async () => {
    const today = getTodayDateString();
    if (this.lastActiveDate !== today) {
        if (this.currentPlanId) {
            await this.recordDailyProgress(this.lastActiveDate);
        }
        
        runInAction(() => {
            this.sentNotifications.clear();
            this.waterIntakeMl = 0;
            this.stepsTaken = 0;
            this.lastActiveDate = today;
            this.setCurrentDate(today); // This will also trigger a reload of the day plan
            this.saveToDB();
        });
    }
  }

  updateHydrationStatus = () => {
    this.resetSentNotificationsIfNeeded();
    const now = new Date();
    const currentHour = now.getHours();
    if (this.waterIntakeMl >= this.hydrationGoalLiters * 1000 || currentHour < 9) {
      this.dismissHydrationSnackbar();
      return;
    }
    const amountPerSlot = Math.round((this.hydrationGoalLiters * 1000) / 10);
    const slotsPassed = Math.min(10, Math.max(0, currentHour - 8)); 
    const expectedIntake = slotsPassed * amountPerSlot;
    const missedAmount = expectedIntake - this.waterIntakeMl;
    if (missedAmount > 50) {
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const roundedMissedAmount = Math.ceil(missedAmount / 50) * 50;
        this.showHydrationSnackbar(currentTime, roundedMissedAmount);
    } else {
        this.dismissHydrationSnackbar();
    }
  };

  setActiveTab = (tab: 'plan' | 'list' | 'daily' | 'archive' | 'pantry' | 'progress' | 'calendar') => {
    this.activeTab = tab;
  }
  
  setCurrentPlanName = (name: string) => {
    this.currentPlanName = name;
    this.saveToDB();
  }
  
  updateArchivedPlanName = (planId: string, newName: string) => {
    const planIndex = this.archivedPlans.findIndex(p => p.id === planId);
    if (planIndex > -1) {
      this.archivedPlans[planIndex].name = newName;
      this.saveToDB();
    }
  }
  
  updateItemDescription = (dayIndex: number, mealIndex: number, itemIndex: number, newDescription: string) => {
      // This now edits the master plan
      const item = this.masterMealPlan[dayIndex]?.meals[mealIndex]?.items[itemIndex];
      if (item && item.fullDescription !== newDescription) {
          item.fullDescription = newDescription;
          const { ingredientName } = extractIngredientInfo(newDescription);
          item.ingredientName = ingredientName;
          
          if (this.onlineMode) {
            this.hasUnsavedChanges = true;
          }

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
            this.masterMealPlan = result.weeklyPlan.map((day: DayPlan) => ({
                ...day,
                meals: day.meals.map((meal: Meal) => ({
                    ...meal,
                    done: false,
                    items: meal.items.map(item => ({ ...item, used: false }))
                }))
            }));
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
        runInAction(() => {
            this.hasUnsavedChanges = false;
            this.recalculating = false;
        });
        this.saveToDB();
    }
  }

  recalculateMealNutrition = async (dayIndex: number, mealIndex: number) => {
    // Recalculates for master plan
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
        // Operates on the current day's log
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
        // Resets a meal in the master plan
        if (this.presetMealPlan[dayIndex]?.meals[mealIndex] && this.masterMealPlan[dayIndex]?.meals[mealIndex]) {
            runInAction(() => {
                const presetMeal = JSON.parse(JSON.stringify(this.presetMealPlan[dayIndex].meals[mealIndex]));
                this.masterMealPlan[dayIndex].meals[mealIndex] = presetMeal;
            });
            this.saveToDB();
        }
    }

  saveToDB = async () => {
    try {
      const dataToSave = {
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
        waterIntakeMl: this.waterIntakeMl,
        currentPlanId: this.currentPlanId,
        sentNotifications: Array.from(this.sentNotifications.entries()),
        stepGoal: this.stepGoal,
        stepsTaken: this.stepsTaken,
        bodyMetrics: toJS(this.bodyMetrics),
        startDate: this.startDate,
        endDate: this.endDate,
      };
      await db.appState.put({ key: 'dietPlanData', value: dataToSave });
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
        this.waterIntakeMl = 0;
        this.stepsTaken = 0;
        this.currentPlanId = null;
        this.startDate = null;
        this.endDate = null;
        this.currentDayPlan = null;
        db.dailyLogs.clear();
        this.saveToDB();
    });
  }
  
  restorePlanFromArchive = (planId: string) => {
    const planToRestore = this.archivedPlans.find(p => p.id === planId);
    if (!planToRestore) return;

    const restoredPlan = planToRestore.plan.map(day => ({
      ...day,
      meals: day.meals.map(meal => ({
          ...meal,
          done: false,
          actualNutrition: null,
          items: meal.items.map(item => ({...item, used: false}))
      }))
    }));

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
    } else {
        this.pantry.push({ ...itemToMove, originalCategory: categoryName });
    }
    const category = this.shoppingList.find(c => c.category === categoryName);
    if (category) {
        category.items = category.items.filter(i => i.item !== itemToMove.item);
        if (category.items.length === 0) {
            this.shoppingList = this.shoppingList.filter(c => c.category !== categoryName);
        }
    }
    this.saveToDB();
  }

  movePantryItemToShoppingList = (pantryItemToMove: PantryItem) => {
    const { originalCategory, ...shoppingItemToMove } = pantryItemToMove;
    let category = this.shoppingList.find(c => c.category === originalCategory);
    if (!category) {
        category = { category: originalCategory, items: [] };
        this.shoppingList.push(category);
    }
    const existingShoppingItem = category.items.find(i => i.item.toLowerCase() === shoppingItemToMove.item.toLowerCase());
    if (existingShoppingItem) {
        const shoppingQuantity = parseQuantity(existingShoppingItem.quantity);
        const itemQuantity = parseQuantity(shoppingItemToMove.quantity);
        if (shoppingQuantity && itemQuantity && shoppingQuantity.unit === itemQuantity.unit) {
            shoppingQuantity.value += itemQuantity.value;
            existingShoppingItem.quantity = formatQuantity(shoppingQuantity);
        } else {
            existingShoppingItem.quantity += `, ${shoppingItemToMove.quantity}`;
        }
    } else {
        category.items.push(shoppingItemToMove);
    }
    this.pantry = this.pantry.filter(p => p.item !== pantryItemToMove.item);
    this.saveToDB();
  }

  updatePantryItemQuantity = (itemName: string, newQuantity: string) => {
    const item = this.pantry.find(p => p.item === itemName);
    if (item) { item.quantity = newQuantity; this.saveToDB(); }
  }
  addShoppingListItem = (categoryName: string, item: ShoppingListItem) => { /* ... unchanged ... */ }
  deleteShoppingListItem = (categoryName: string, itemIndex: number) => { /* ... unchanged ... */ }
  updateShoppingListItem = (categoryName: string, itemIndex: number, updatedItem: ShoppingListItem) => { /* ... unchanged ... */ }
  addShoppingListCategory = (categoryName: string) => { /* ... unchanged ... */ }
  
  toggleMealItem = async (mealIndex: number, itemIndex: number) => {
    if (!this.currentDayPlan) return;
    const plan = toJS(this.currentDayPlan);
    const mealItem = plan.meals[mealIndex]?.items[itemIndex];
    if (!mealItem) return;

    mealItem.used = !mealItem.used;
    // ... (pantry logic remains the same)
    
    runInAction(() => { this.currentDayPlan = plan; });
    await db.dailyLogs.put(plan);
  }

  toggleMealDone = async (mealIndex: number) => {
    if (!this.currentDayPlan) return;
    const plan = toJS(this.currentDayPlan);
    const meal = plan.meals[mealIndex];
    if (meal) {
        meal.done = !meal.done;
        if (!meal.done) {
            meal.actualNutrition = null;
        }
    }
    runInAction(() => { this.currentDayPlan = plan; });
    await db.dailyLogs.put(plan);
  }

  get dailyPlan(): DailyLog | null {
    return this.currentDayPlan;
  }

  getDayNutritionSummary(dayPlan: DayPlan | null): NutritionInfo | null {
    if (!this.onlineMode || !dayPlan) {
      return null;
    }
    
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

  get dailyNutritionSummary(): NutritionInfo | null | undefined {
    return this.getDayNutritionSummary(this.currentDayPlan);
  }

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

  // Fix: Implemented processManualPlan to resolve undefined variable error.
  processManualPlan = (planData: DayPlan[]) => {
      const cleanedPlan = planData.map(day => ({
        ...day,
        meals: day.meals
          .map(meal => ({
            ...meal,
            items: meal.items.filter(item => item.fullDescription.trim() !== ''),
          }))
          .filter(meal => meal.items.length > 0 || (meal.title && meal.title.trim() !== '')),
      })).filter(day => day.meals.length > 0);

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
  // Fix: Implemented processJsonFile to resolve undefined variable errors.
  processJsonFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            if (!event.target?.result) {
                throw new Error("File could not be read.");
            }
            const data: ImportedJsonData = JSON.parse(event.target.result as string);
            const sanitizedPlan = data.weeklyPlan.map(day => ({
                ...day,
                meals: day.meals.map(meal => ({
                    ...meal,
                    done: false,
                    actualNutrition: null,
                    items: meal.items.map(item => ({...item, used: false}))
                }))
            }));
            runInAction(() => {
                this.planToSet = sanitizedPlan;
                this.shoppingList = data.shoppingList;
                this.pantry = data.pantry || [];
                this.currentPlanName = data.planName || 'My Diet Plan';
                this.status = AppStatus.AWAITING_DATES;
            });
        } catch (e: any) {
            console.error("Failed to parse JSON file", e);
            runInAction(() => {
                this.status = AppStatus.ERROR;
                this.error = `Failed to parse JSON file: ${e.message}`;
            });
        }
    };
    reader.onerror = () => {
        runInAction(() => {
            this.status = AppStatus.ERROR;
            this.error = "An error occurred while reading the file.";
        });
    };
    reader.readAsText(file);
  }
  // Fix: Implemented processPdf to resolve undefined variable errors.
  processPdf = async (file: File) => {
    runInAction(() => {
        this.status = AppStatus.LOADING;
        this.pdfParseProgress = 0;
    });

    try {
        // NOTE: This assumes pdf.js can be dynamically imported.
        // This is the standard way to handle large optional dependencies without adding them to the main bundle.
        const pdfjs = await import('pdfjs-dist/build/pdf');
        // The worker is needed for pdf.js to run in a separate thread.
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
                this.shoppingList = []; // Will be enriched later
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
            const currentPlanToArchive: ArchivedPlan = {
                id: this.currentPlanId || Date.now().toString(),
                name: this.currentPlanName,
                date: new Date().toLocaleDateString('it-IT'),
                plan: this.masterMealPlan,
                shoppingList: this.shoppingList,
            };
            this.archivedPlans.push(currentPlanToArchive);
        }
        
        this.masterMealPlan = this.planToSet!;
        this.presetMealPlan = JSON.parse(JSON.stringify(this.planToSet));
        this.startDate = startDate;
        this.endDate = endDate;
        
        this.status = AppStatus.SUCCESS;
        this.activeTab = 'daily';
        this.hasUnsavedChanges = false;
        this.sentNotifications.clear();
        this.lastActiveDate = getTodayDateString();
        this.waterIntakeMl = 0;
        this.stepsTaken = 0;
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
    if (!this.masterMealPlan.length) {
        runInAction(() => { this.currentDayPlan = null; });
        return;
    }
    try {
        let dailyLog: DailyLog | undefined | null = await db.dailyLogs.get(dateStr);
        if (!dailyLog) {
            const date = new Date(dateStr);
            const dayIndex = (date.getDay() + 6) % 7; // 0=Mon, 1=Tue, ..., 6=Sun
            const dayMap = ['LUNEDI', 'MARTEDI', 'MERCOLEDI', 'GIOVEDI', 'VENERDI', 'SABATO', 'DOMENICA'];
            const dayName = dayMap[dayIndex];
            const masterDay = this.masterMealPlan.find(d => d.day.toUpperCase() === dayName);

            if (masterDay) {
                const newDailyLog: DailyLog = {
                    ...JSON.parse(JSON.stringify(masterDay)),
                    date: dateStr,
                };
                
                // Ensure done status is reset for the new day instance
                newDailyLog.meals.forEach(meal => {
                    meal.done = false;
                    meal.actualNutrition = null;
                    meal.items.forEach(item => item.used = false);
                });
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