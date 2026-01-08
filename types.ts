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
  procedure?: string;
  items: MealItem[];
  done: boolean;
  time?: string; // e.g., "08:30"
  nutrition?: NutritionInfo | null;
  actualNutrition?: NutritionInfo | null;
  cheat?: boolean;
  cheatMealDescription?: string;
  section?: string; // New field for grouping Generic Plan options (e.g., "lunch-carbs")
  sectionDone?: boolean; // Flag to indicate the whole section is manually completed
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
  quantityValue: number | null;
  quantityUnit: string;
}

export interface ShoppingListCategory {
  category: string;
  items: ShoppingListItem[];
  sortOrder?: number;
}

export interface PantryItem {
  item: string;
  quantityValue: number | null;
  quantityUnit: string;
  originalCategory: string;
  originalQuantityValue?: number | null;
  originalQuantityUnit?: string;
  expiryDate?: string;
  lowStockThreshold?: string;
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
  bodyFatKg?: number;
  bodyFatPercentage?: number;
  leanMassKg?: number;
  bodyWaterLiters?: number;
  bodyWaterPercentage?: number;
}

export interface ProgressRecord {
  id?: number;
  patientId?: number;
  date: string; // YYYY-MM-DD
  adherence: number; // 0-100
  plannedCalories: number;
  actualCalories: number;
  weightKg?: number;
  heightCm?: number;
  bodyFatKg?: number;
  bodyFatPercentage?: number;
  leanMassKg?: number;
  stepsTaken: number;
  waterIntakeMl: number;
  bodyWaterLiters?: number;
  bodyWaterPercentage?: number;
  activityHours?: number;
  estimatedCaloriesBurned?: number;
}


export interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture: string;
}

// Map<DayName, Map<SectionKey, OptionIndex[]>>
// Example: { "LUNEDI": { "breakfast": [0, 2], "lunch-carbs": [1] } }
export interface GenericPlanPreferences {
    [day: string]: {
        [section: string]: number[];
    }
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
    shoppingListManaged?: boolean;
    lastModified?: number;
    showMacros?: boolean;
    showCheatMealButton?: boolean;
    showBodyMetricsInApp?: boolean;
    bodyFatUnit?: 'kg' | '%';
    bodyWaterUnit?: 'liters' | '%';
    // New fields for Generic Plans
    isGenericPlan?: boolean;
    genericPlanData?: GenericPlanData;
    genericPlanPreferences?: GenericPlanPreferences;
    // Versioning for sync conflict resolution
    planVersion?: number;
}

export interface SyncedData {
  appState: StoredState;
  progressHistory: ProgressRecord[];
  dailyLogs: DailyLog[];
}

export interface Ingredient {
  id?: number;
  name: string;
  category?: string;
  calories?: number; // per 100g
  carbs?: number;    // per 100g
  protein?: number; // per 100g
  fat?: number;     // per 100g
}

export interface ModularMealData {
    carbs: Meal[];
    protein: Meal[];
    vegetables: Meal[];
    fats: Meal[];
    suggestions: Recipe[];
    time?: string;
}

export interface GenericPlanData {
    breakfast: Meal[];
    snacks: Meal[];
    lunch: ModularMealData;
    dinner: ModularMealData;
    snack1?: Meal[]; // For migration
    snack2?: Meal[]; // For migration
    morningSnackTime?: string;
    afternoonSnackTime?: string;
}

export interface PlanCreationData {
    planName: string;
    weeklyPlan: DayPlan[];
    shoppingList: ShoppingListCategory[];
    type?: 'weekly' | 'generic';
    genericPlan?: GenericPlanData;
}

export interface NutritionistPlan {
  id?: number;
  name: string;
  creationDate: string; // ISO string
  planData: PlanCreationData;
}

export interface RecipeIngredient {
  ingredientName: string;
  quantityValue: number | null;
  quantityUnit: string;
}

export interface Recipe {
  id?: number;
  name: string;
  procedure?: string;
  ingredients: RecipeIngredient[];
}

export interface Patient {
  id?: number;
  firstName: string;
  lastName: string;
  creationDate: string; // ISO string
  bodyMetrics?: BodyMetrics;
  showBodyMetricsInApp?: boolean;
  stepGoal?: number;
  hydrationGoalLiters?: number;
}

export interface AssignedPlan {
    id?: number;
    patientId: number;
    planTemplateId?: number;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    planData: PlanCreationData;
}

export interface AuthData {
  key: 'userAuth'; // Only one entry for the logged-in user
  userProfile: UserProfile;
  accessToken: string;
  loginMode: 'user' | 'nutritionist';
  lastLogin: number; // Timestamp of last successful login/refresh
  tokenExpirationTime?: number;
}

// Form-specific types for ManualPlanEntryForm to handle string inputs
export interface FormMealItem {
  ingredientName: string;
  quantityValue: string;
  quantityUnit: string;
}

export interface FormMeal extends Omit<Meal, 'items' | 'done' | 'nutrition' | 'actualNutrition' | 'cheat' | 'cheatMealDescription' | 'procedure'> {
    items: FormMealItem[];
    procedure: string;
    isCheat?: boolean;
}
  
export interface FormDayPlan extends Omit<DayPlan, 'meals'> {
    meals: FormMeal[];
}

export interface FormSuggestion {
    id?: number;
    name: string;
    procedure?: string;
    ingredients: FormMealItem[];
}

export interface FormModularMeal {
    carbs: FormMeal[];
    protein: FormMeal[];
    vegetables: FormMeal[];
    fats: FormMeal[];
    suggestions: FormSuggestion[];
    time: string;
}

export interface FormGenericPlan {
    breakfast: FormMeal[];
    breakfastTime: string;
    snacks: FormMeal[];
    morningSnackTime: string;
    afternoonSnackTime: string;
    lunch: FormModularMeal;
    dinner: FormModularMeal;
}
