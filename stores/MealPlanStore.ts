import { makeAutoObservable, runInAction } from 'mobx';
import { MealPlanData, DayPlan, ShoppingListCategory, ArchivedPlan, PantryItem, ShoppingListItem, Theme, Locale, Meal } from '../types';
import { regeneratePlanData } from '../services/geminiService';
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
  isRecalculating = false;

  // Hydration and Notification State
  hydrationGoalLiters = 3;
  sentNotifications = new Map<string, boolean>();
  lastActiveDate: string = new Date().toLocaleDateString();

  constructor() {
    makeAutoObservable(this);
    this.loadFromLocalStorage();
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
      this.lastActiveDate = today;
      this.saveToLocalStorage();
    }
  }

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
          this.hasUnsavedChanges = true;
          this.saveToLocalStorage();
      }
  }

  recalculateShoppingListAndPlan = async () => {
    if (!this.hasUnsavedChanges) return;

    this.isRecalculating = true;
    this.error = null;

    const mealProgress = new Map<string, { done: boolean, time?: string }>();
    const itemProgress = new Map<string, boolean>(); 

    this.mealPlan.forEach((day, dayIndex) => {
        day.meals.forEach((meal, mealIndex) => {
            mealProgress.set(`${dayIndex}-${mealIndex}`, { done: meal.done, time: meal.time });
            meal.items.forEach((item, itemIndex) => {
                itemProgress.set(`${dayIndex}-${mealIndex}-${itemIndex}`, item.used);
            });
        });
    });

    try {
        const newData = await regeneratePlanData(this.mealPlan);
        if (!newData || !newData.weeklyPlan || !newData.shoppingList) {
            throw new Error("AI failed to regenerate the plan. Please check your edits for clarity.");
        }

        const finalPlan = newData.weeklyPlan.map((day, dayIndex) => ({
            ...day,
            meals: day.meals.map((meal, mealIndex) => {
                const progress = mealProgress.get(`${dayIndex}-${mealIndex}`);
                return {
                    ...meal,
                    done: progress?.done ?? false,
                    time: meal.time || progress?.time, // Keep AI time, but fall back to old time
                    items: meal.items.map((item, itemIndex) => ({
                        ...item,
                        used: itemProgress.get(`${dayIndex}-${mealIndex}-${itemIndex}`) ?? false,
                    })),
                };
            }),
        }));

        runInAction(() => {
            this.mealPlan = finalPlan;
            this.shoppingList = newData.shoppingList;
            this.pantry = [];
            this.hasUnsavedChanges = false;
            this.saveToLocalStorage();
        });

    } catch (err: any) {
        runInAction(() => {
            this.error = err.message || "An unknown error occurred during recalculation.";
        });
    } finally {
        runInAction(() => {
            this.isRecalculating = false;
        });
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
        // MobX maps are not directly serializable, so we don't save `sentNotifications`. It resets daily.
        
        this.resetSentNotificationsIfNeeded();

        if (this.mealPlan.length > 0) {
          this.status = AppStatus.SUCCESS;
        }
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
      // Reset to defaults on failure
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
      };
      localStorage.setItem('dietPlanData', JSON.stringify(dataToSave));
    } catch (error) {
      console.error("Failed to save data to localStorage", error);
    }
  }

  archiveCurrentPlan = () => {
    if (this.mealPlan.length === 0) return;

    const newArchive: ArchivedPlan = {
      id: Date.now().toString(),
      name: this.currentPlanName,
      date: new Date().toLocaleDateString('it-IT'),
      plan: this.mealPlan,
      shoppingList: this.shoppingList,
    };

    runInAction(() => {
        this.archivedPlans.push(newArchive);
        this.mealPlan = [];
        this.shoppingList = [];
        this.pantry = [];
        this.status = AppStatus.INITIAL;
        this.activeTab = 'plan';
        this.pdfParseProgress = 0;
        this.currentPlanName = 'My Diet Plan';
        this.hasUnsavedChanges = false;
        this.sentNotifications.clear();
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
              done: false, // Reset progress on restore
              items: meal.items.map(item => ({...item, used: false})) // Reset progress on restore
          }))
        }));

        this.mealPlan = planToRestoreWithFlags;
        this.shoppingList = planToRestore.shoppingList;
        this.currentPlanName = planToRestore.name;
        this.pantry = []; // Pantry is reset on restore
        this.sentNotifications.clear();

        this.archivedPlans = this.archivedPlans.filter(p => p.id !== planId);
        
        this.hasUnsavedChanges = false;
        this.status = AppStatus.SUCCESS;
        this.activeTab = 'daily';
        
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

        const itemQuantityToToggle = parseQuantity(mealItem.fullDescription);
        if (!itemQuantityToToggle || itemQuantityToToggle.value <= 0) {
            mealItem.used = !mealItem.used;
            this.saveToLocalStorage();
            return;
        }

        const ingredientName = mealItem.ingredientName;
        mealItem.used = !mealItem.used;

        const pantryItem = this.pantry.find(p => p.item.toLowerCase() === ingredientName.toLowerCase());
        const originalCategory = pantryItem?.originalCategory || 'Altro';

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

            let targetCategory = this.shoppingList.find(c => c.category === originalCategory);
            if (!targetCategory) {
                targetCategory = { category: originalCategory, items: [] };
                this.shoppingList.push(targetCategory);
            }

            const shoppingItem = targetCategory.items.find(i => i.item.toLowerCase() === ingredientName.toLowerCase());
            if (shoppingItem) {
                const shoppingQuantity = parseQuantity(shoppingItem.quantity);
                if (shoppingQuantity && shoppingQuantity.unit === itemQuantityToToggle.unit) {
                    shoppingQuantity.value += itemQuantityToToggle.value;
                    shoppingItem.quantity = formatQuantity(shoppingQuantity);
                } else {
                    shoppingItem.quantity += `, ${formatQuantity(itemQuantityToToggle)}`;
                }
            } else {
                targetCategory.items.push({ item: ingredientName, quantity: formatQuantity(itemQuantityToToggle) });
            }
        } else {
            let categoryRef = this.shoppingList.find(c => c.items.some(i => i.item.toLowerCase() === ingredientName.toLowerCase()));
            const shoppingItem = categoryRef?.items.find(i => i.item.toLowerCase() === ingredientName.toLowerCase());

            if (shoppingItem && categoryRef) {
                const shoppingQuantity = parseQuantity(shoppingItem.quantity);
                if (shoppingQuantity && shoppingQuantity.unit === itemQuantityToToggle.unit) {
                    shoppingQuantity.value -= itemQuantityToToggle.value;
                    if (shoppingQuantity.value > 0.01) {
                        shoppingItem.quantity = formatQuantity(shoppingQuantity);
                    } else {
                        categoryRef.items = categoryRef.items.filter(i => i.item.toLowerCase() !== ingredientName.toLowerCase());
                        if (categoryRef.items.length === 0) {
                            this.shoppingList = this.shoppingList.filter(c => c.category !== categoryRef!.category);
                        }
                    }
                }

                if (pantryItem) {
                    const pantryQuantity = parseQuantity(pantryItem.quantity);
                    if (pantryQuantity && pantryQuantity.unit === itemQuantityToToggle.unit) {
                        pantryQuantity.value += itemQuantityToToggle.value;
                        pantryItem.quantity = formatQuantity(pantryQuantity);
                    }
                } else {
                    this.pantry.push({ item: ingredientName, quantity: formatQuantity(itemQuantityToToggle), originalCategory: categoryRef.category });
                }
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

    try {
      const fileReader = new FileReader();
      fileReader.onload = async (event) => {
        if (event.target?.result) {
          const typedarray = new Uint8Array(event.target.result as ArrayBuffer);
          // @ts-ignore
          const pdf = await window.pdfjsLib.getDocument(typedarray).promise;
          const pageTexts: string[] = [];
          for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              pageTexts.push(textContent.items.map((s: any) => s.str).join('\n'));
              runInAction(() => this.pdfParseProgress = Math.round((i / pdf.numPages) * 50));
          }

          const fragments = await Promise.all(
            pageTexts.map(text => regeneratePlanData([{ day: 'Unknown', meals: [{ name: 'PDF Page Content', title: 'Content to parse', items: [{ ingredientName: 'Raw text', fullDescription: text, used: false }], done: false }] }]))
          );
          
          runInAction(() => this.pdfParseProgress = 75);

          const combinedPlan: DayPlan[] = []; 
          fragments.forEach(frag => {
            if (frag?.weeklyPlan) combinedPlan.push(...frag.weeklyPlan);
          });

          const finalResult = await regeneratePlanData(combinedPlan);
          runInAction(() => this.pdfParseProgress = 100);

          runInAction(() => {
            if(finalResult && finalResult.weeklyPlan && finalResult.shoppingList) {
              const planWithFlags = finalResult.weeklyPlan.map(day => ({
                ...day,
                meals: day.meals.map(meal => ({
                  ...meal,
                  done: false,
                  items: (meal.items as any[]).map(item => ({ ...item, used: false }))
                }))
              }));

              this.mealPlan = planWithFlags;
              this.shoppingList = finalResult.shoppingList;
              this.pantry = [];
              this.status = AppStatus.SUCCESS;
              this.activeTab = 'daily';
              this.hasUnsavedChanges = false;
              this.sentNotifications.clear();
              this.lastActiveDate = new Date().toLocaleDateString();
              this.currentPlanName = `Diet Plan - ${new Date().toLocaleDateString('it-IT')}`;
              this.saveToLocalStorage();
            } else {
              throw new Error("Failed to parse meal plan. The AI couldn't structure the data correctly. Please try a different PDF.");
            }
          });
        }
      };

      fileReader.onerror = () => {
        runInAction(() => {
          this.status = AppStatus.ERROR;
          this.error = 'Failed to read the PDF file.';
          this.pdfParseProgress = 0;
        });
      };

      fileReader.readAsArrayBuffer(file);
    } catch (err: any) {
      runInAction(() => {
        this.status = AppStatus.ERROR;
        this.error = err.message || 'An unknown error occurred while processing the PDF.';
        this.pdfParseProgress = 0;
      });
    }
  }
}

export const mealPlanStore = new MealPlanStore();