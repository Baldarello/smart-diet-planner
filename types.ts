export interface Meal {
  name: string;
  title?: string;
  items: string[];
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