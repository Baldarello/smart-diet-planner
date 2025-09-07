import { makeAutoObservable, runInAction } from 'mobx';
import { MealPlanData, DayPlan, ShoppingListItem, ArchivedPlan } from '../types';
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
  shoppingList: ShoppingListItem[] = [];
  archivedPlans: ArchivedPlan[] = [];
  activeTab: 'plan' | 'list' | 'daily' | 'archive' = 'plan';
  pdfParseProgress = 0;

  constructor() {
    makeAutoObservable(this);
    this.loadFromLocalStorage();
  }

  setActiveTab(tab: 'plan' | 'list' | 'daily' | 'archive') {
    this.activeTab = tab;
  }

  loadFromLocalStorage() {
    try {
      const savedData = localStorage.getItem('dietPlanData');
      if (savedData) {
        const data = JSON.parse(savedData);
        this.mealPlan = data.mealPlan || [];
        this.shoppingList = data.shoppingList || [];
        this.archivedPlans = data.archivedPlans || [];
        if (this.mealPlan.length > 0) {
          this.status = AppStatus.SUCCESS;
        }
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
      this.mealPlan = [];
      this.shoppingList = [];
      this.archivedPlans = [];
    }
  }

  saveToLocalStorage() {
    try {
      const dataToSave = {
        mealPlan: this.mealPlan,
        shoppingList: this.shoppingList,
        archivedPlans: this.archivedPlans,
      };
      localStorage.setItem('dietPlanData', JSON.stringify(dataToSave));
    } catch (error) {
      console.error("Failed to save data to localStorage", error);
    }
  }

  archiveCurrentPlan() {
    if (this.mealPlan.length === 0) return;

    const newArchive: ArchivedPlan = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString('it-IT'),
      plan: this.mealPlan,
    };

    runInAction(() => {
        this.archivedPlans.push(newArchive);
        this.mealPlan = [];
        this.shoppingList = [];
        this.status = AppStatus.INITIAL;
        this.activeTab = 'plan';
        this.pdfParseProgress = 0;
        this.saveToLocalStorage();
    });
  }

  get dailyPlan(): DayPlan | undefined {
    const dayMap: { [key: number]: string } = {
      0: 'DOMENICA',
      1: 'LUNEDI',
      2: 'MARTEDI',
      3: 'MERCOLEDI',
      4: 'GIOVEDI',
      5: 'VENERDI',
      6: 'SABATO',
    };
    const todayIndex = new Date().getDay();
    const todayName = dayMap[todayIndex];
    return this.mealPlan.find(d => d.day.toUpperCase() === todayName);
  }

  async processPdf(file: File) {
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
             runInAction(() => {
                this.pdfParseProgress = progress;
            });

            fullText += pageText + '\n\n';
          }

          const result = await parsePdfToMealPlan(fullText);
          
          runInAction(() => {
            if(result && result.weeklyPlan && result.shoppingList) {
              this.mealPlan = result.weeklyPlan;
              this.shoppingList = result.shoppingList;
              this.status = AppStatus.SUCCESS;
              this.activeTab = 'daily';
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