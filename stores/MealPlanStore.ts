import { makeAutoObservable, runInAction, toJS } from 'mobx';
import { MealPlanData, DayPlan, ShoppingListCategory, ArchivedPlan, PantryItem, ShoppingListItem, Theme, Locale, Meal, NutritionInfo, HydrationSnackbarInfo } from '../types';
import { parsePdfText, generateShoppingList as generateShoppingListOffline, extractIngredientInfo } from '../services/offlineParser';
import { parseMealStructure, getNutritionForMeal, getPlanDetailsAndShoppingList, isQuotaError } from '../services/geminiService';
import { parseQuantity, formatQuantity } from '../utils/quantityParser';
import { db } from '../services/db';

export enum AppStatus {
  INITIAL,
  HYDRATING,
  LOADING,
  SUCCESS,
  ERROR,
}

export class MealPlanStore {
  status: AppStatus = AppStatus.HYDRATING;
  error: string | null = null;
  activeMealPlan: DayPlan[] = [];
  presetMealPlan: DayPlan[] = [];
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

  constructor() {
    makeAutoObservable(this);
    this.init();
    this.loadSessionState();
  }

  init = async () => {
    try {
        const savedState = await db.appState.get('dietPlanData');
        
        runInAction(() => {
            if (savedState) {
                const data = savedState.value;
                const loadedPlan = data.activeMealPlan || data.mealPlan || [];
                
                // Defensively map the loaded plan to prevent errors from malformed data
                this.activeMealPlan = loadedPlan.map((day: DayPlan) => ({
                    ...day,
                    meals: (day.meals || []).map((meal: Meal) => ({
                        ...meal,
                        done: meal.done ?? false,
                        items: (meal.items || []).map(item => ({ ...item, used: item.used ?? false }))
                    }))
                }));

                if (data.presetMealPlan) {
                    this.presetMealPlan = data.presetMealPlan;
                } else if (this.activeMealPlan.length > 0) {
                    this.presetMealPlan = JSON.parse(JSON.stringify(this.activeMealPlan));
                } else {
                    this.presetMealPlan = [];
                }

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

                if (data.sentNotifications) {
                    this.sentNotifications = new Map(data.sentNotifications);
                }

                // Migration: Ensure an ID exists if a plan exists
                if (this.activeMealPlan.length > 0 && !this.currentPlanId) {
                    this.currentPlanId = 'migrated_' + Date.now().toString();
                }

                this.resetSentNotificationsIfNeeded();

                // Final status check: A plan is only successful if both the plan array and ID exist.
                if (this.activeMealPlan.length > 0 && this.currentPlanId) {
                    this.status = AppStatus.SUCCESS;
                } else {
                    this.status = AppStatus.INITIAL;
                }
            } else {
                // No saved state found
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

  setHydrationGoal = (liters: number) => {
    if (liters > 0 && liters <= 10) {
      this.hydrationGoalLiters = liters;
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

  showHydrationSnackbar = (time: string, amount: number) => {
    this.hydrationSnackbar = { visible: true, time, amount };
  }

  dismissHydrationSnackbar = () => {
    this.hydrationSnackbar = null;
  }

  updateMealTime = (dayIndex: number, mealIndex: number, newTime: string) => {
    const meal = this.activeMealPlan[dayIndex]?.meals[mealIndex];
    if (meal) {
      meal.time = newTime;
      this.saveToDB();
    }
  }

  markNotificationSent = (key: string) => {
    this.sentNotifications.set(key, true);
    this.saveToDB();
  }

  resetSentNotificationsIfNeeded = () => {
    const today = new Date().toLocaleDateString();
    if (this.lastActiveDate !== today) {
      this.sentNotifications.clear();
      this.waterIntakeMl = 0;
      this.lastActiveDate = today;
      this.saveToDB();
    }
  }

  updateHydrationStatus = () => {
    this.resetSentNotificationsIfNeeded();

    const now = new Date();
    const currentHour = now.getHours();

    // The hydration window is from 9:00 to 18:00 (10 hours/slots)
    if (currentHour < 9) {
      // Before the window starts, ensure there's no snackbar
      this.dismissHydrationSnackbar();
      return;
    }

    // Amount to drink per one-hour slot
    const amountPerSlot = Math.round((this.hydrationGoalLiters * 1000) / 10);
    
    // Calculate how many slots should have passed by now.
    // At 9:xx, 1 slot passed. At 18:xx, 10 slots have passed.
    const slotsPassed = Math.min(10, Math.max(0, currentHour - 8)); 
    
    const expectedIntake = slotsPassed * amountPerSlot;
    const missedAmount = expectedIntake - this.waterIntakeMl;

    if (missedAmount > 50) { // Use a 50ml threshold to avoid tiny reminders
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        // Round up to the nearest 50ml for a cleaner number
        const roundedMissedAmount = Math.ceil(missedAmount / 50) * 50;
        
        // Show or update the snackbar
        this.showHydrationSnackbar(currentTime, roundedMissedAmount);
    } else {
        // If caught up, dismiss the snackbar
        this.dismissHydrationSnackbar();
    }
  };

  setActiveTab = (tab: 'plan' | 'list' | 'daily' | 'archive' | 'pantry') => {
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
      const item = this.activeMealPlan[dayIndex]?.meals[mealIndex]?.items[itemIndex];
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
        const result = await getPlanDetailsAndShoppingList(this.activeMealPlan);
        if (!result) throw new Error("Failed to get updated plan and list from Gemini.");

        runInAction(() => {
            this.activeMealPlan = result.weeklyPlan.map((day: DayPlan) => ({
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
    if (!this.onlineMode) return;

    const meal = this.activeMealPlan[dayIndex]?.meals[mealIndex];
    if (!meal) return;

    runInAction(() => {
        this.recalculatingMeal = { dayIndex, mealIndex };
    });

    try {
        const newNutrition = await getNutritionForMeal(meal);
        runInAction(() => {
            if (this.activeMealPlan[dayIndex]?.meals[mealIndex]) {
                this.activeMealPlan[dayIndex].meals[mealIndex].nutrition = newNutrition;
            }
        });
    } catch (error) {
        console.error(`Failed to recalculate nutrition for meal: ${meal.name}`, error);
            if (isQuotaError(error)) {
            runInAction(() => { this.onlineMode = false });
            this.saveSessionState();
        }
        runInAction(() => {
            if (this.activeMealPlan[dayIndex]?.meals[mealIndex]) {
                this.activeMealPlan[dayIndex].meals[mealIndex].nutrition = null;
            }
        });
    } finally {
        runInAction(() => {
            this.recalculatingMeal = null;
        });
        this.saveToDB();
    }
  }

    resetMealToPreset = (dayIndex: number, mealIndex: number) => {
        if (this.presetMealPlan[dayIndex]?.meals[mealIndex] && this.activeMealPlan[dayIndex]?.meals[mealIndex]) {
            runInAction(() => {
                this.activeMealPlan[dayIndex].meals[mealIndex] = JSON.parse(JSON.stringify(this.presetMealPlan[dayIndex].meals[mealIndex]));
            });
            this.saveToDB();
        }
    }

  saveToDB = async () => {
    try {
      const dataToSave = {
        activeMealPlan: toJS(this.activeMealPlan),
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
      };
      await db.appState.put({ key: 'dietPlanData', value: dataToSave });
    } catch (error) {
      console.error("Failed to save data to IndexedDB", error);
    }
  }

  archiveCurrentPlan = () => {
    if (this.activeMealPlan.length === 0) return;

    runInAction(() => {
        this.activeMealPlan = [];
        this.presetMealPlan = [];
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
        this.saveToDB();
    });
  }
  
  restorePlanFromArchive = (planId: string) => {
    const planToRestore = this.archivedPlans.find(p => p.id === planId);
    if (!planToRestore) return;

    runInAction(() => {
        if (this.activeMealPlan.length > 0) {
            const currentPlanArchive: ArchivedPlan = {
                id: Date.now().toString(),
                name: this.currentPlanName,
                date: new Date().toLocaleDateString('it-IT'),
                plan: this.activeMealPlan,
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

        this.activeMealPlan = planToRestoreWithFlags;
        this.presetMealPlan = JSON.parse(JSON.stringify(planToRestoreWithFlags));
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
        
        this.saveToDB();
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
    if (item) {
      item.quantity = newQuantity;
      this.saveToDB();
    }
  }

  toggleMealItem = (dayIndex: number, mealIndex: number, itemIndex: number) => {
    runInAction(() => {
        const mealItem = this.activeMealPlan[dayIndex]?.meals[mealIndex]?.items[itemIndex];
        if (!mealItem) return;

        mealItem.used = !mealItem.used;

        const itemQuantityToToggle = parseQuantity(mealItem.fullDescription);
        if (!itemQuantityToToggle || itemQuantityToToggle.value <= 0) {
            this.saveToDB();
            return;
        }
        
        const ingredientName = mealItem.ingredientName;
        const pantryItem = this.pantry.find(p => p.item.toLowerCase() === ingredientName.toLowerCase());

        if (mealItem.used) {
            if (pantryItem) {
                const pantryQuantity = parseQuantity(pantryItem.quantity);
                if (pantryQuantity && pantryQuantity.unit === itemQuantityToToggle.unit) {
                    pantryQuantity.value -= itemQuantityToToggle.value;
                    if (pantryQuantity.value > 0.01) {
                        pantryItem.quantity = formatQuantity(pantryQuantity);
                    } else {
                        this.pantry = this.pantry.filter(p => p.item.toLowerCase() !== ingredientName.toLowerCase());
                    }
                }
            }
        } else {
            if (pantryItem) {
                const pantryQuantity = parseQuantity(pantryItem.quantity);
                if (pantryQuantity && pantryQuantity.unit === itemQuantityToToggle.unit) {
                    pantryQuantity.value += itemQuantityToToggle.value;
                    pantryItem.quantity = formatQuantity(pantryQuantity);
                }
            } else {
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
        this.saveToDB();
    });
}

  toggleMealDone = (dayIndex: number, mealIndex: number) => {
    const meal = this.activeMealPlan[dayIndex]?.meals[mealIndex];
    if (meal) {
        meal.done = !meal.done;
        this.saveToDB();
    }
  }

  get dailyPlan(): DayPlan | undefined {
    const dayMap: { [key: number]: string } = { 0: 'DOMENICA', 1: 'LUNEDI', 2: 'MARTEDI', 3: 'MERCOLEDI', 4: 'GIOVEDI', 5: 'VENERDI', 6: 'SABATO' };
    const todayIndex = new Date().getDay();
    const todayName = dayMap[todayIndex];
    return this.activeMealPlan.find(d => d.day.toUpperCase() === todayName);
  }

  getDayNutritionSummary(dayPlan: DayPlan): NutritionInfo | null | undefined {
    if (!this.onlineMode) {
      return null;
    }

    if (dayPlan.meals.some(meal => meal.nutrition === undefined)) {
      return undefined;
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
        const planSnapshot = JSON.parse(JSON.stringify(this.presetMealPlan));
        const result = await getPlanDetailsAndShoppingList(planSnapshot);

        if (result) {
            runInAction(() => {
                // Create maps of the current state to preserve user interactions (done/used flags)
                const oldPlanMap = new Map(this.activeMealPlan.map(day => [day.day, day]));

                this.activeMealPlan = result.weeklyPlan.map(newDay => {
                    const oldDay = oldPlanMap.get(newDay.day);
                    const oldMealsMap = new Map(oldDay?.meals.map(meal => [meal.name, meal]));
                    
                    return {
                        ...newDay,
                        meals: newDay.meals.map(newMeal => {
                            const oldMeal = oldMealsMap.get(newMeal.name);
                            const oldItemsMap = new Map(oldMeal?.items.map(item => [item.fullDescription, item]));

                            return {
                                ...newMeal,
                                done: oldMeal?.done ?? false,
                                items: newMeal.items.map(newItem => ({
                                    ...newItem,
                                    used: oldItemsMap.get(newItem.fullDescription)?.used ?? false,
                                })),
                            };
                        }),
                    };
                });
                this.shoppingList = result.shoppingList;
            });
        }
    } catch (error) {
        if (isQuotaError(error)) {
            runInAction(() => { this.onlineMode = false });
            this.saveSessionState();
        } else {
             console.error("An error occurred during background data enrichment:", error);
        }
    } finally {
        this.saveToDB();
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
            if (this.activeMealPlan.length > 0) {
                const currentPlanToArchive: ArchivedPlan = {
                    id: Date.now().toString(),
                    name: this.currentPlanName,
                    date: new Date().toLocaleDateString('it-IT'),
                    plan: this.activeMealPlan,
                    shoppingList: this.shoppingList,
                };
                this.archivedPlans.push(currentPlanToArchive);
            }
            this.pdfParseProgress = 50;
            this.activeMealPlan = cleanedPlan;
            this.presetMealPlan = JSON.parse(JSON.stringify(cleanedPlan));
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
            this.saveToDB();
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
                if (this.activeMealPlan.length > 0) {
                    const currentPlanToArchive: ArchivedPlan = {
                        id: Date.now().toString(),
                        name: this.currentPlanName,
                        date: new Date().toLocaleDateString('it-IT'),
                        plan: this.activeMealPlan,
                        shoppingList: this.shoppingList,
                    };
                    this.archivedPlans.push(currentPlanToArchive);
                }
                this.pdfParseProgress = 50;
                this.activeMealPlan = mealStructure;
                this.presetMealPlan = JSON.parse(JSON.stringify(mealStructure));
                this.shoppingList = shoppingList;
                this.status = AppStatus.SUCCESS;
                this.activeTab = 'daily';
                this.hasUnsavedChanges = false;
                this.sentNotifications.clear();
                this.lastActiveDate = new Date().toLocaleDateString();
                this.waterIntakeMl = 0;
                this.pantry = [];
                this.currentPlanId = Date.now().toString();
                this.currentPlanName = `Diet Plan - ${new Date().toLocaleDateString('it-IT')}`;
            });
            
            if(this.onlineMode) {
                this._enrichPlanDataInBackground();
            } else {
                this.saveToDB();
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