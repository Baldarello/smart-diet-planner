import { makeAutoObservable, runInAction } from 'mobx';
import { MealPlanData, DayPlan, ShoppingListCategory, ArchivedPlan, PantryItem, ShoppingListItem, Theme, Locale, Meal, NutritionInfo, HydrationSnackbarInfo } from '../types';
import { parsePdfText, generateShoppingList as generateShoppingListOffline, extractIngredientInfo } from '../services/offlineParser';
import { parseMealStructure, getNutritionForMeal, generateShoppingListFromPlan, updatePlanDetails, isQuotaError } from '../services/geminiService';
import { parseQuantity, formatQuantity } from '../utils/quantityParser';

export enum AppStatus {
  INITIAL,
  LOADING,
  SUCCESS,
  ERROR,
}

export class MealPlanStore {
  status: AppStatus = AppStatus.INITIAL;
  error: string | null = null;
  mealPlan: DayPlan[] = [];
  shoppingList: ShoppingListCategory[] = [];
  pantry: PantryItem[] = [];
  archivedPlans: ArchivedPlan[] = [];
  activeTab: 'plan' | 'list' | 'daily' | 'archive' | 'pantry' = 'plan';
  pdfParseProgress = 0;
  currentPlanName = 'My Diet Plan';
  theme: Theme = 'light';
  locale: Locale = 'it';
  hasUnsavedChanges = false;
  currentPlanId: string | null = null;

  onlineMode = true;
  recalculating = false;
  recalculatingMeal: { dayIndex: number; mealIndex: number } | null = null;

  hydrationGoalLiters = 3;
  waterIntakeMl = 0;
  hydrationSnackbar: HydrationSnackbarInfo | null = null;

  sentNotifications = new Map<string, boolean>();
  lastActiveDate: string = new Date().toLocaleDateString();
  lastHydrationCheckTimestamp: number | null = null;

  constructor() {
    makeAutoObservable(this);
    this.loadFromLocalStorage();
    this.loadSessionState();
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
    this.saveToLocalStorage();
  }

  setLocale = (locale: Locale) => {
    this.locale = locale;
    this.saveToLocalStorage();
  }

  setHydrationGoal = (liters: number) => {
    if (liters > 0 && liters <= 10) {
      this.hydrationGoalLiters = liters;
      this.saveToLocalStorage();
    }
  }

  logWaterIntake = (amountMl: number) => {
    this.waterIntakeMl += amountMl;
    this.saveToLocalStorage();
  }

  setWaterIntake = (amountMl: number) => {
    if (amountMl >= 0) {
      this.waterIntakeMl = amountMl;
      this.saveToLocalStorage();
    }
  }

  showHydrationSnackbar = (time: string, amount: number) => {
    this.hydrationSnackbar = { visible: true, time, amount };
  }

  dismissHydrationSnackbar = () => {
    this.hydrationSnackbar = null;
  }

  updateMealTime = (dayIndex: number, mealIndex: number, newTime: string) => {
    const meal = this.mealPlan[dayIndex]?.meals[mealIndex];
    if (meal) {
      meal.time = newTime;
      this.saveToLocalStorage();
    }
  }

  markNotificationSent = (key: string) => {
    this.sentNotifications.set(key, true);
  }

  resetSentNotificationsIfNeeded = () => {
    const today = new Date().toLocaleDateString();
    if (this.lastActiveDate !== today) {
      this.sentNotifications.clear();
      this.waterIntakeMl = 0;
      this.lastActiveDate = today;
      this.saveToLocalStorage();
    }
  }

  checkAndProcessMissedHydration = (): { time: string, amount: number }[] => {
    const now = Date.now();
    this.resetSentNotificationsIfNeeded(); // Ensure we're on the correct day and notifications are cleared if needed.

    const lastCheck = this.lastHydrationCheckTimestamp;
    
    // Update the timestamp immediately.
    this.lastHydrationCheckTimestamp = now;
    this.saveToLocalStorage();

    if (!lastCheck) {
        // If this is the first check (e.g., first time app is run), do nothing.
        return [];
    }

    const missedNotifications: { time: string, amount: number }[] = [];
    const amountToDrink = Math.round((this.hydrationGoalLiters * 1000) / 10);
    const nowTime = new Date(now);

    // Start checking from the last known time.
    let checkTime = new Date(lastCheck);

    // Loop through each hour between the last check and now.
    while (checkTime < nowTime) {
        // Move to the top of the next hour.
        checkTime.setHours(checkTime.getHours() + 1, 0, 0, 0);

        // If we've jumped past the current time, we're done.
        if (checkTime > nowTime) {
            break;
        }

        const hour = checkTime.getHours();

        // Only process reminders within the active window (9 AM to 7 PM).
        if (hour >= 9 && hour <= 19) {
            const key = `hydration-${hour}`;
            if (!this.sentNotifications.has(key)) {
                const timeStr = `${String(hour).padStart(2, '0')}:00`;
                missedNotifications.push({ time: timeStr, amount: amountToDrink });
                this.markNotificationSent(key);
            }
        }
    }

    // If there were any missed notifications, show a snackbar for the most recent one.
    if (missedNotifications.length > 0) {
        const latestMiss = missedNotifications[missedNotifications.length - 1];
        this.showHydrationSnackbar(latestMiss.time, latestMiss.amount);
    }

    return missedNotifications;
  };

  setActiveTab = (tab: 'plan' | 'list' | 'daily' | 'archive' | 'pantry') => {
    this.activeTab = tab;
  }
  
  setCurrentPlanName = (name: string) => {
    this.currentPlanName = name;
    this.saveToLocalStorage();
  }
  
  updateArchivedPlanName = (planId: string, newName: string) => {
    const planIndex = this.archivedPlans.findIndex(p => p.id === planId);
    if (planIndex > -1) {
      this.archivedPlans[planIndex].name = newName;
      this.saveToLocalStorage();
    }
  }
  
  updateItemDescription = (dayIndex: number, mealIndex: number, itemIndex: number, newDescription: string) => {
      const item = this.mealPlan[dayIndex]?.meals[mealIndex]?.items[itemIndex];
      if (item && item.fullDescription !== newDescription) {
          item.fullDescription = newDescription;
          const { ingredientName } = extractIngredientInfo(newDescription);
          item.ingredientName = ingredientName;
          
          // Online mode offers an AI-powered recalculation, which is now optional.
          // Offline, changes are handled by `toggleMealItem` directly.
          if (this.onlineMode) {
            this.hasUnsavedChanges = true;
          }

          this.saveToLocalStorage();
      }
  }

  recalculateShoppingList = async () => {
    if (!this.hasUnsavedChanges || !this.onlineMode) return;

    runInAction(() => { this.recalculating = true; });

    try {
        // Step 1: Update plan details (nutrition, corrected ingredient names, times)
        const updatedPlan = await updatePlanDetails(this.mealPlan);
        if (!updatedPlan) throw new Error("Failed to get updated plan from Gemini.");

        // Step 2: Generate a new shopping list from the updated plan
        const newShoppingList = await generateShoppingListFromPlan(updatedPlan);
        if (!newShoppingList) throw new Error("Failed to generate shopping list from updated plan.");

        runInAction(() => {
            this.mealPlan = updatedPlan.map((day: DayPlan) => ({
                ...day,
                meals: day.meals.map((meal: Meal) => ({
                    ...meal,
                    done: false,
                    items: meal.items.map(item => ({ ...item, used: false }))
                }))
            }));
            this.shoppingList = newShoppingList;
            this.pantry = []; // Reset pantry as the list is brand new
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
        this.saveToLocalStorage();
    }
  }

  recalculateMealNutrition = async (dayIndex: number, mealIndex: number) => {
    if (!this.onlineMode) return;

    const meal = this.mealPlan[dayIndex]?.meals[mealIndex];
    if (!meal) return;

    runInAction(() => {
        this.recalculatingMeal = { dayIndex, mealIndex };
    });

    try {
        const newNutrition = await getNutritionForMeal(meal);
        runInAction(() => {
            if (this.mealPlan[dayIndex]?.meals[mealIndex]) {
                this.mealPlan[dayIndex].meals[mealIndex].nutrition = newNutrition;
            }
        });
    } catch (error) {
        console.error(`Failed to recalculate nutrition for meal: ${meal.name}`, error);
            if (isQuotaError(error)) {
            runInAction(() => { this.onlineMode = false });
            this.saveSessionState();
        }
        runInAction(() => {
            if (this.mealPlan[dayIndex]?.meals[mealIndex]) {
                this.mealPlan[dayIndex].meals[mealIndex].nutrition = null; // Set to null on failure
            }
        });
    } finally {
        runInAction(() => {
            this.recalculatingMeal = null;
        });
        this.saveToLocalStorage();
    }
  }

  loadFromLocalStorage = () => {
    try {
      const savedData = localStorage.getItem('dietPlanData');
      if (savedData) {
        const data = JSON.parse(savedData);
        
        const loadedPlan = data.mealPlan || [];
        this.mealPlan = loadedPlan.map((day: DayPlan) => ({
            ...day,
            meals: day.meals.map((meal: Meal) => ({
                ...meal,
                done: meal.done ?? false,
                items: meal.items.map(item => ({ ...item, used: item.used ?? false }))
            }))
        }));

        this.shoppingList = data.shoppingList || [];
        this.pantry = data.pantry || [];
        this.archivedPlans = data.archivedPlans || [];
        this.currentPlanName = data.currentPlanName || 'My Diet Plan';
        this.theme = data.theme || 'light';
        this.locale = data.locale || 'it';
        this.hasUnsavedChanges = data.hasUnsavedChanges || false;
        this.hydrationGoalLiters = data.hydrationGoalLiters || 3;
        this.lastActiveDate = data.lastActiveDate || new Date().toLocaleDateString();
        this.waterIntakeMl = data.waterIntakeMl || 0;
        this.currentPlanId = data.currentPlanId || null;
        this.lastHydrationCheckTimestamp = data.lastHydrationCheckTimestamp || null;

        if (this.mealPlan.length > 0 && !this.currentPlanId) {
            this.currentPlanId = 'migrated_' + Date.now().toString();
        }
        
        this.resetSentNotificationsIfNeeded();

        if (this.mealPlan.length > 0) {
          this.status = AppStatus.SUCCESS;
        }
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
      Object.assign(this, new MealPlanStore());
    }
  }

  saveToLocalStorage = () => {
    try {
      const dataToSave = {
        mealPlan: this.mealPlan,
        shoppingList: this.shoppingList,
        pantry: this.pantry,
        archivedPlans: this.archivedPlans,
        currentPlanName: this.currentPlanName,
        theme: this.theme,
        locale: this.locale,
        hasUnsavedChanges: this.hasUnsavedChanges,
        hydrationGoalLiters: this.hydrationGoalLiters,
        lastActiveDate: this.lastActiveDate,
        waterIntakeMl: this.waterIntakeMl,
        currentPlanId: this.currentPlanId,
        lastHydrationCheckTimestamp: this.lastHydrationCheckTimestamp,
      };
      localStorage.setItem('dietPlanData', JSON.stringify(dataToSave));
    } catch (error) {
      console.error("Failed to save data to localStorage", error);
    }
  }

  archiveCurrentPlan = () => {
    if (this.mealPlan.length === 0) return;

    runInAction(() => {
        this.mealPlan = [];
        this.shoppingList = [];
        this.pantry = [];
        this.status = AppStatus.INITIAL;
        this.activeTab = 'plan';
        this.pdfParseProgress = 0;
        this.currentPlanName = 'My Diet Plan';
        this.hasUnsavedChanges = false;
        this.sentNotifications.clear();
        this.waterIntakeMl = 0;
        this.currentPlanId = null;
        this.saveToLocalStorage();
    });
  }
  
  restorePlanFromArchive = (planId: string) => {
    const planToRestore = this.archivedPlans.find(p => p.id === planId);
    if (!planToRestore) return;

    runInAction(() => {
        if (this.mealPlan.length > 0) {
            const currentPlanArchive: ArchivedPlan = {
                id: Date.now().toString(),
                name: this.currentPlanName,
                date: new Date().toLocaleDateString('it-IT'),
                plan: this.mealPlan,
                shoppingList: this.shoppingList,
            };
            this.archivedPlans.push(currentPlanArchive);
        }

        const planToRestoreWithFlags = planToRestore.plan.map(day => ({
          ...day,
          meals: day.meals.map(meal => ({
              ...meal,
              done: false,
              items: meal.items.map(item => ({...item, used: false}))
          }))
        }));

        this.mealPlan = planToRestoreWithFlags;
        this.shoppingList = planToRestore.shoppingList;
        this.currentPlanName = planToRestore.name;
        this.pantry = [];
        this.sentNotifications.clear();
        this.waterIntakeMl = 0;

        this.archivedPlans = this.archivedPlans.filter(p => p.id !== planId);
        
        this.hasUnsavedChanges = false;
        this.status = AppStatus.SUCCESS;
        this.activeTab = 'daily';
        this.currentPlanId = Date.now().toString();
        
        this.saveToLocalStorage();
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
        this.pantry.push({
            ...itemToMove,
            originalCategory: categoryName
        });
    }

    const category = this.shoppingList.find(c => c.category === categoryName);
    if (category) {
        category.items = category.items.filter(i => i.item !== itemToMove.item);
        if (category.items.length === 0) {
            this.shoppingList = this.shoppingList.filter(c => c.category !== categoryName);
        }
    }
    this.saveToLocalStorage();
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
    this.saveToLocalStorage();
  }

  updatePantryItemQuantity = (itemName: string, newQuantity: string) => {
    const item = this.pantry.find(p => p.item === itemName);
    if (item) {
      item.quantity = newQuantity;
      this.saveToLocalStorage();
    }
  }

  toggleMealItem = (dayIndex: number, mealIndex: number, itemIndex: number) => {
    runInAction(() => {
        const mealItem = this.mealPlan[dayIndex]?.meals[mealIndex]?.items[itemIndex];
        if (!mealItem) return;

        mealItem.used = !mealItem.used;

        const itemQuantityToToggle = parseQuantity(mealItem.fullDescription);
        if (!itemQuantityToToggle || itemQuantityToToggle.value <= 0) {
            this.saveToLocalStorage();
            return; // It's a non-quantifiable item, just toggle its state
        }
        
        const ingredientName = mealItem.ingredientName;
        const pantryItem = this.pantry.find(p => p.item.toLowerCase() === ingredientName.toLowerCase());

        if (mealItem.used) {
            // Item is being marked as "used" or "consumed" -> DECREASE from pantry
            if (pantryItem) {
                const pantryQuantity = parseQuantity(pantryItem.quantity);
                if (pantryQuantity && pantryQuantity.unit === itemQuantityToToggle.unit) {
                    pantryQuantity.value -= itemQuantityToToggle.value;
                    if (pantryQuantity.value > 0.01) {
                        pantryItem.quantity = formatQuantity(pantryQuantity);
                    } else {
                        // Remove from pantry if quantity is zero or less
                        this.pantry = this.pantry.filter(p => p.item.toLowerCase() !== ingredientName.toLowerCase());
                    }
                }
            }
        } else {
            // Item is being marked as "not used" -> INCREASE in pantry
            if (pantryItem) {
                const pantryQuantity = parseQuantity(pantryItem.quantity);
                if (pantryQuantity && pantryQuantity.unit === itemQuantityToToggle.unit) {
                    pantryQuantity.value += itemQuantityToToggle.value;
                    pantryItem.quantity = formatQuantity(pantryQuantity);
                }
            } else {
                // If it wasn't in the pantry, add it back.
                // We need to find its original category from the shopping list if possible.
                let originalCategory = 'Altro';
                for (const cat of this.shoppingList) {
                    if (cat.items.some(i => i.item.toLowerCase() === ingredientName.toLowerCase())) {
                        originalCategory = cat.category;
                        break;
                    }
                }
                this.pantry.push({
                    item: ingredientName,
                    quantity: formatQuantity(itemQuantityToToggle),
                    originalCategory: originalCategory
                });
            }
        }
        this.saveToLocalStorage();
    });
}

  toggleMealDone = (dayIndex: number, mealIndex: number) => {
    const meal = this.mealPlan[dayIndex]?.meals[mealIndex];
    if (meal) {
        meal.done = !meal.done;
        this.saveToLocalStorage();
    }
  }

  get dailyPlan(): DayPlan | undefined {
    const dayMap: { [key: number]: string } = { 0: 'DOMENICA', 1: 'LUNEDI', 2: 'MARTEDI', 3: 'MERCOLEDI', 4: 'GIOVEDI', 5: 'VENERDI', 6: 'SABATO' };
    const todayIndex = new Date().getDay();
    const todayName = dayMap[todayIndex];
    return this.mealPlan.find(d => d.day.toUpperCase() === todayName);
  }

  getDayNutritionSummary(dayPlan: DayPlan): NutritionInfo | null | undefined {
    if (!this.onlineMode) {
      return null;
    }

    if (dayPlan.meals.some(meal => meal.nutrition === undefined)) {
      return undefined; // Data is still loading
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
    if (!this.dailyPlan) {
      return null;
    }
    return this.getDayNutritionSummary(this.dailyPlan);
  }

  private _enrichPlanDataInBackground = async () => {
    if (!this.onlineMode) return;

    try {
      const planSnapshot = this.mealPlan;
      
      const shoppingListPromise = generateShoppingListFromPlan(planSnapshot);

      const nutritionPromises = planSnapshot.flatMap((day, dayIndex) =>
        day.meals.map(async (meal, mealIndex) => {
          try {
            const nutrition = await getNutritionForMeal(meal);
            runInAction(() => {
              // Ensure the plan hasn't been changed by the user in the meantime
              if (this.mealPlan[dayIndex]?.meals[mealIndex]) {
                this.mealPlan[dayIndex].meals[mealIndex].nutrition = nutrition;
              }
            });
          } catch (e) {
            console.error(`Failed to get nutrition for meal: ${meal.name}`, e);
            
            // If it's a quota error, re-throw to trigger the main catch block and switch to offline mode.
            if (isQuotaError(e)) {
                throw e;
            }

            // For other non-critical errors, just nullify this meal's nutrition and continue.
            runInAction(() => {
              if (this.mealPlan[dayIndex]?.meals[mealIndex]) {
                this.mealPlan[dayIndex].meals[mealIndex].nutrition = null;
              }
            });
          }
        })
      );

      const [shoppingListResult] = await Promise.all([shoppingListPromise, ...nutritionPromises]);

      runInAction(() => {
        if (shoppingListResult) {
          this.shoppingList = shoppingListResult;
        }
      });

    } catch (error) {
        if (isQuotaError(error)) {
            runInAction(() => { this.onlineMode = false });
            this.saveSessionState();
        } else {
             console.error("An error occurred during background data enrichment:", error);
        }
    } finally {
        this.saveToLocalStorage();
    }
  };

  processManualPlan = (planData: DayPlan[]) => {
    runInAction(() => {
        this.status = AppStatus.LOADING;
        this.error = null;
        this.pdfParseProgress = 0;
    });

    setTimeout(() => {
        const cleanedPlan = planData.map(day => ({
            ...day,
            meals: day.meals.map(meal => ({
                ...meal,
                title: meal.title?.trim(),
                items: meal.items
                    .filter(item => item.fullDescription.trim() !== '')
                    .map(item => ({
                        ...extractIngredientInfo(item.fullDescription.trim()),
                        fullDescription: item.fullDescription.trim(),
                        used: false,
                    })),
            })).filter(meal => meal.items.length > 0 || (meal.title && meal.title.trim() !== ''))
        })).filter(day => day.meals.length > 0);

        if (cleanedPlan.length === 0) {
            runInAction(() => {
                this.status = AppStatus.ERROR;
                this.error = "The submitted plan is empty. Please add at least one meal item.";
                this.pdfParseProgress = 0;
            });
            return;
        }

        runInAction(() => {
            if (this.mealPlan.length > 0) {
                const currentPlanToArchive: ArchivedPlan = {
                    id: Date.now().toString(),
                    name: this.currentPlanName,
                    date: new Date().toLocaleDateString('it-IT'),
                    plan: this.mealPlan,
                    shoppingList: this.shoppingList,
                };
                this.archivedPlans.push(currentPlanToArchive);
            }
            this.pdfParseProgress = 50;
            this.mealPlan = cleanedPlan;
            this.status = AppStatus.SUCCESS;
            this.activeTab = 'daily';
            this.hasUnsavedChanges = false;
            this.sentNotifications.clear();
            this.lastActiveDate = new Date().toLocaleDateString();
            this.waterIntakeMl = 0;
            this.pantry = [];
            this.currentPlanId = Date.now().toString();
            this.currentPlanName = `Manual Plan - ${new Date().toLocaleDateString('it-IT')}`;
        });

        if (this.onlineMode) {
            this._enrichPlanDataInBackground();
        } else {
            const shoppingList = generateShoppingListOffline(cleanedPlan);
            runInAction(() => {
                this.shoppingList = shoppingList;
            });
            this.saveToLocalStorage();
        }
    }, 500);
  }

  processPdf = async (file: File) => {
    this.status = AppStatus.LOADING;
    this.error = null;
    this.pdfParseProgress = 0;
    
    // @ts-ignore
    if (window.pdfjsLib) {
        // @ts-ignore
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    } else {
        this.status = AppStatus.ERROR;
        this.error = "PDF library not loaded. Please refresh the page.";
        return;
    }

    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(file);
    fileReader.onerror = () => {
        runInAction(() => {
          this.status = AppStatus.ERROR;
          this.error = 'Failed to read the PDF file.';
          this.pdfParseProgress = 0;
        });
    };

    fileReader.onload = async (event) => {
        try {
            if (!event.target?.result) throw new Error("File could not be read.");
            const typedarray = new Uint8Array(event.target.result as ArrayBuffer);
            // @ts-ignore
            const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
            
            runInAction(() => this.pdfParseProgress = 10);
            
            const pageTexts: string[] = [];
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                pageTexts.push(textContent.items.map((s: any) => s.str).join('\n'));
                runInAction(() => this.pdfParseProgress = 10 + Math.round((i / pdf.numPages) * 20));
            }
            const fullText = pageTexts.join('\n\n');
            
            runInAction(() => this.pdfParseProgress = 31);

            let mealStructure: DayPlan[] | null = null;
            let shoppingList: ShoppingListCategory[] = [];

            if (this.onlineMode) {
                 try {
                     mealStructure = await parseMealStructure(fullText);
                 } catch (error) {
                     if (isQuotaError(error)) {
                        console.warn("Gemini quota exceeded during parsing. Falling back to offline parser.");
                        runInAction(() => { this.onlineMode = false; });
                        this.saveSessionState();
                        const offlineData = parsePdfText(pageTexts);
                        mealStructure = offlineData.weeklyPlan;
                        shoppingList = offlineData.shoppingList;
                     } else { throw error; }
                 }
            } else {
                const offlineData = parsePdfText(pageTexts);
                mealStructure = offlineData.weeklyPlan;
                shoppingList = offlineData.shoppingList;
            }

            if (!mealStructure || mealStructure.length === 0) {
                throw new Error("Failed to parse meal plan structure. The response was empty or invalid. Please check the PDF format.");
            }

            runInAction(() => {
                if (this.mealPlan.length > 0) {
                    const currentPlanToArchive: ArchivedPlan = {
                        id: Date.now().toString(),
                        name: this.currentPlanName,
                        date: new Date().toLocaleDateString('it-IT'),
                        plan: this.mealPlan,
                        shoppingList: this.shoppingList,
                    };
                    this.archivedPlans.push(currentPlanToArchive);
                }
                this.pdfParseProgress = 50;
                this.mealPlan = mealStructure;
                this.shoppingList = shoppingList; // Set the shopping list if generated offline
                this.status = AppStatus.SUCCESS;
                this.activeTab = 'daily';
                this.hasUnsavedChanges = false;
                this.sentNotifications.clear();
                this.lastActiveDate = new Date().toLocaleDateString();
                this.waterIntakeMl = 0;
                this.pantry = []; // Reset pantry
                this.currentPlanId = Date.now().toString();
                this.currentPlanName = `Diet Plan - ${new Date().toLocaleDateString('it-IT')}`;
            });
            
            // If we are online, the shopping list wasn't generated yet.
            // _enrichPlanDataInBackground will handle it.
            if(this.onlineMode) {
                this._enrichPlanDataInBackground();
            } else {
                this.saveToLocalStorage(); // Save offline-generated data
            }

        } catch (err: any) {
            runInAction(() => {
                this.status = AppStatus.ERROR;
                this.error = err.message || 'An unknown error occurred while processing the PDF.';
                this.pdfParseProgress = 0;
            });
        }
    };
  }
}

export const mealPlanStore = new MealPlanStore();