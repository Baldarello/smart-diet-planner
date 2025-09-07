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

export interface MealPlanData {
  weeklyPlan: DayPlan[];
  shoppingList: ShoppingListItem[];
}

export interface ArchivedPlan {
  id: string;
  date: string;
  plan: DayPlan[];
}
