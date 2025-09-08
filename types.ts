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
}

export interface DayPlan {
  day: string;
  meals: Meal[];
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