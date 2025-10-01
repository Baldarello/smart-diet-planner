// Fix: Add NutritionInfo interface
export interface NutritionInfo {
  carbs: number;
  protein: number;
  fat: number;
  calories: number;
}

export interface MealItem {
  ingredientName: string;
  fullDescription: string;
  used: boolean;
}

export interface Meal {
  name: string;
  title?: string;
  items: MealItem[];
  done: boolean;
  time?: string; // e.g., "08:30"
  nutrition?: NutritionInfo | null;
  actualNutrition?: NutritionInfo | null;
}

export interface DayPlan {
  day: string;
  meals: Meal[];
}

export interface DailyLog extends DayPlan {
    date: string; // YYYY-MM-DD
}

export interface ShoppingListItem {
  item: string;
  quantity: string;
}

export interface ShoppingListCategory {
  category: string;
  items: ShoppingListItem[];
}

export interface PantryItem {
  item: string;
  quantity: string;
  originalCategory: string;
}

export interface MealPlanData {
  weeklyPlan: DayPlan[];
  shoppingList: ShoppingListCategory[];
}

export interface ArchivedPlan {
  id: string;
  name: string;
  date: string;
  plan: DayPlan[];
  shoppingList: ShoppingListCategory[];
}

export type Theme = 'light' | 'dark';
export type Locale = 'it' | 'en';

export interface HydrationSnackbarInfo {
  visible: boolean;
  time: string;
  amount: number;
}

export interface BodyMetrics {
  weightKg?: number;
  heightCm?: number;
  bodyFatPercentage?: number;
  leanMassKg?: number;
  bodyWaterPercentage?: number;
}

export interface ProgressRecord {
  id?: number;
  date: string; // YYYY-MM-DD
  adherence: number; // 0-100
  plannedCalories: number;
  actualCalories: number;
  weightKg?: number;
  bodyFatPercentage?: number;
  leanMassKg?: number;
  stepsTaken: number;
  waterIntakeMl: number;
  bodyWaterPercentage?: number;
}


export interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture: string;
}

// From db.ts StoredState definition
export interface StoredState {
    masterMealPlan: DayPlan[];
    presetMealPlan: DayPlan[];
    shoppingList: ShoppingListCategory[];
    pantry: PantryItem[];
    archivedPlans: ArchivedPlan[];
    currentPlanName: string;
    theme: Theme;
    locale: Locale;
    hasUnsavedChanges: boolean;
    hydrationGoalLiters: number;
    lastActiveDate: string;
    currentPlanId: string | null;
    sentNotifications: [string, boolean][];
    stepGoal?: number;
    bodyMetrics?: BodyMetrics;
    startDate: string | null;
    endDate: string | null;
}

export interface SyncedData {
  appState: StoredState;
  progressHistory: ProgressRecord[];
}