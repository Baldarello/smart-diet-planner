import { makeAutoObservable, runInAction } from 'mobx';
import { MealPlanData, DayPlan, ShoppingListCategory, ArchivedPlan, PantryItem, ShoppingListItem, Theme, Locale } from '../types';
import { parsePdfToMealPlan } from '../services/geminiService';

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
        this.mealPlan = data.mealPlan || [];
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

        this.mealPlan = planToRestore.plan;
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
    const mealItem = this.mealPlan[dayIndex]?.meals[mealIndex]?.items[itemIndex];
    if (!mealItem) return;

    mealItem.used = !mealItem.used;

    if (mealItem.used) {
      // If item is used, try to move it from pantry to shopping list
      const pantryItem = this.pantry.find(p => p.item.toLowerCase() === mealItem.ingredientName.toLowerCase());
      if (pantryItem) {
        this.movePantryItemToShoppingList(pantryItem);
      }
    } else {
      // If item is unused, try to move it back from shopping list to pantry
      let itemToMove: ShoppingListItem | null = null;
      let categoryName: string | null = null;

      for (const category of this.shoppingList) {
        const foundItem = category.items.find(i => i.item.toLowerCase() === mealItem.ingredientName.toLowerCase());
        if (foundItem) {
          itemToMove = foundItem;
          categoryName = category.category;
          break;
        }
      }

      if (itemToMove && categoryName) {
        this.moveShoppingItemToPantry(itemToMove, categoryName);
      }
    }
    this.saveToLocalStorage();
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
              // Add 'used: false' to every meal item
              const planWithUsedFlag = result.weeklyPlan.map(day => ({
                ...day,
                meals: day.meals.map(meal => ({
                  ...meal,
                  items: (meal.items as any[]).map(item => ({ ...item, used: false }))
                }))
              }));

              this.mealPlan = planWithUsedFlag;
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