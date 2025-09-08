import { makeAutoObservable, runInAction } from 'mobx';
import { MealPlanData, DayPlan, ShoppingListCategory, ArchivedPlan, PantryItem, ShoppingListItem, Theme, Locale, Meal } from '../types';
import { parsePdfToMealPlan } from '../services/geminiService';
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
                done: meal.done ?? false, // Ensure backward compatibility
                items: meal.items.map(item => ({ ...item, used: item.used ?? false }))
            }))
        }));

        this.shoppingList = data.shoppingList || [];
        this.pantry = data.pantry || [];
        this.archivedPlans = data.archivedPlans || [];
        this.currentPlanName = data.currentPlanName || 'My Diet Plan';
        this.theme = data.theme || 'light';
        this.locale = data.locale || 'it';
        if (this.mealPlan.length > 0) {
          this.status = AppStatus.SUCCESS;
        }
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
      this.mealPlan = [];
      this.shoppingList = [];
      this.pantry = [];
      this.archivedPlans = [];
      this.currentPlanName = 'My Diet Plan';
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
              items: meal.items.map(item => ({...item, used: item.used ?? false}))
          }))
        }));

        this.mealPlan = planToRestoreWithFlags;
        this.shoppingList = planToRestore.shoppingList;
        this.currentPlanName = planToRestore.name;
        this.pantry = []; // Pantry is reset on restore

        this.archivedPlans = this.archivedPlans.filter(p => p.id !== planId);

        this.status = AppStatus.SUCCESS;
        this.activeTab = 'daily';
        
        this.saveToLocalStorage();
    });
  }

  moveShoppingItemToPantry = (itemToMove: ShoppingListItem, categoryName: string) => {
    // Add to pantry
    const pantryItem: PantryItem = {
      ...itemToMove,
      originalCategory: categoryName
    };
    this.pantry.push(pantryItem);

    // Remove from shopping list
    const category = this.shoppingList.find(c => c.category === categoryName);
    if (category) {
      category.items = category.items.filter(i => i.item !== itemToMove.item);
      // If category becomes empty, remove it
      if (category.items.length === 0) {
        this.shoppingList = this.shoppingList.filter(c => c.category !== categoryName);
      }
    }
    this.saveToLocalStorage();
  }

  movePantryItemToShoppingList = (pantryItemToMove: PantryItem) => {
    // Add back to shopping list
    const { originalCategory, ...shoppingItem } = pantryItemToMove;
    let category = this.shoppingList.find(c => c.category === originalCategory);
    if (!category) {
      category = { category: originalCategory, items: [] };
      this.shoppingList.push(category);
    }
    category.items.push(shoppingItem);

    // Remove from pantry
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
    runInAction(() => { // Wrap in runInAction for multiple state changes
        const mealItem = this.mealPlan[dayIndex]?.meals[mealIndex]?.items[itemIndex];
        if (!mealItem) return;

        const itemQuantityToToggle = parseQuantity(mealItem.fullDescription);

        // Just toggle the state and save, do not affect pantry/shopping list if quantity is not parsable
        if (!itemQuantityToToggle || itemQuantityToToggle.value <= 0) {
            mealItem.used = !mealItem.used;
            this.saveToLocalStorage();
            return;
        }

        const ingredientName = mealItem.ingredientName;
        mealItem.used = !mealItem.used; // Toggle the state first

        if (mealItem.used) {
            // ---> ITEM IS CHECKED (USED) <---
            // 1. Subtract from Pantry
            const pantryItemIndex = this.pantry.findIndex(p => p.item.toLowerCase() === ingredientName.toLowerCase());
            if (pantryItemIndex > -1) {
                const pItem = this.pantry[pantryItemIndex];
                const pantryQuantity = parseQuantity(pItem.quantity);
                if (pantryQuantity && pantryQuantity.unit === itemQuantityToToggle.unit) {
                    pantryQuantity.value -= itemQuantityToToggle.value;
                    if (pantryQuantity.value > 0.01) { // Epsilon for float
                        pItem.quantity = formatQuantity(pantryQuantity);
                    } else {
                        this.pantry.splice(pantryItemIndex, 1);
                    }
                } else {
                    // Cannot perform math on different/unparsed units. Fallback: remove from pantry.
                    this.pantry.splice(pantryItemIndex, 1);
                }
            }
            
            // 2. Add to Shopping List
            let category: ShoppingListCategory | undefined;
            let shoppingItem: ShoppingListItem | undefined;
            // Find existing item in shopping list
            for (const cat of this.shoppingList) {
                const item = cat.items.find(i => i.item.toLowerCase() === ingredientName.toLowerCase());
                if(item) {
                    shoppingItem = item;
                    category = cat;
                    break;
                }
            }

            if (shoppingItem && category) {
                const shoppingQuantity = parseQuantity(shoppingItem.quantity);
                if (shoppingQuantity && shoppingQuantity.unit === itemQuantityToToggle.unit) {
                    shoppingQuantity.value += itemQuantityToToggle.value;
                    shoppingItem.quantity = formatQuantity(shoppingQuantity);
                } else {
                    // Mismatched units, append to string
                    shoppingItem.quantity = `${shoppingItem.quantity}, ${formatQuantity(itemQuantityToToggle)}`;
                }
            } else {
                // Item not in shopping list, add it. Find its original category from a pantry item if it exists.
                const pantrySourceItem = this.pantry.find(p => p.item.toLowerCase() === ingredientName.toLowerCase());
                const originalCategory = pantrySourceItem?.originalCategory || 'Altro';
                
                let targetCategory = this.shoppingList.find(c => c.category === originalCategory);
                if (!targetCategory) {
                    targetCategory = { category: originalCategory, items: [] };
                    this.shoppingList.push(targetCategory);
                }
                targetCategory.items.push({
                    item: ingredientName,
                    quantity: formatQuantity(itemQuantityToToggle),
                });
            }

        } else {
            // ---> ITEM IS UNCHECKED (NOT USED) <---
            // 1. Subtract from Shopping List & Get Category
            let originalCategory = 'Altro'; // Default category
            
            for (let i = this.shoppingList.length - 1; i >= 0; i--) {
                const category = this.shoppingList[i];
                const itemIdx = category.items.findIndex(it => it.item.toLowerCase() === ingredientName.toLowerCase());
                
                if (itemIdx > -1) {
                    originalCategory = category.category; // Got the category!
                    const sItem = category.items[itemIdx];
                    const shoppingQuantity = parseQuantity(sItem.quantity);

                    if (shoppingQuantity && shoppingQuantity.unit === itemQuantityToToggle.unit) {
                        shoppingQuantity.value -= itemQuantityToToggle.value;
                        if (shoppingQuantity.value > 0.01) {
                            sItem.quantity = formatQuantity(shoppingQuantity);
                        } else {
                            category.items.splice(itemIdx, 1);
                            if (category.items.length === 0) {
                                this.shoppingList.splice(i, 1);
                            }
                        }
                    }
                    // If units mismatch, do nothing to the shopping list quantity.
                    break; 
                }
            }

            // 2. Add back to Pantry
            const pantryItem = this.pantry.find(p => p.item.toLowerCase() === ingredientName.toLowerCase());
            if (pantryItem) {
                const pantryQuantity = parseQuantity(pantryItem.quantity);
                if (pantryQuantity && pantryQuantity.unit === itemQuantityToToggle.unit) {
                    pantryQuantity.value += itemQuantityToToggle.value;
                    pantryItem.quantity = formatQuantity(pantryQuantity);
                } else {
                     pantryItem.quantity = `${pantryItem.quantity}, ${formatQuantity(itemQuantityToToggle)}`;
                }
            } else {
                // Item not in pantry, add it back using the category we found
                this.pantry.push({
                    item: ingredientName,
                    quantity: formatQuantity(itemQuantityToToggle),
                    originalCategory: originalCategory,
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
    const dayMap: { [key: number]: string } = {
      0: 'DOMENICA', 1: 'LUNEDI', 2: 'MARTEDI', 3: 'MERCOLEDI',
      4: 'GIOVEDI', 5: 'VENERDI', 6: 'SABATO',
    };
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
          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((s: any) => s.str).join('\n');
            
            const progress = Math.round((i / pdf.numPages) * 100);
             runInAction(() => this.pdfParseProgress = progress);

            fullText += pageText + '\n\n';
          }

          const result = await parsePdfToMealPlan(fullText);
          
          runInAction(() => {
            if(result && result.weeklyPlan && result.shoppingList) {
              const planWithFlags = result.weeklyPlan.map(day => ({
                ...day,
                meals: day.meals.map(meal => ({
                  ...meal,
                  done: false, // Initialize done status
                  items: (meal.items as any[]).map(item => ({ ...item, used: false }))
                }))
              }));

              this.mealPlan = planWithFlags;
              this.shoppingList = result.shoppingList;
              this.pantry = []; // Reset pantry
              this.status = AppStatus.SUCCESS;
              this.activeTab = 'daily';
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