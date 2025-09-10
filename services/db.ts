import Dexie, { type Table } from 'dexie';
import { ArchivedPlan, DayPlan, PantryItem, ShoppingListCategory, Theme, Locale } from '../types';

// Define the structure of the object we are storing.
// This is based on MealPlanStore.saveToDB
interface StoredState {
    activeMealPlan: DayPlan[];
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
    waterIntakeMl: number;
    currentPlanId: string | null;
    sentNotifications: [string, boolean][];
}

export interface AppState {
  key: string;
  value: StoredState;
}

export class MySubClassedDexie extends Dexie {
  appState!: Table<AppState, string>; // The second type parameter is the primary key type.

  constructor() {
    super('dietPlanDatabase');
    // FIX: A type assertion is used to resolve a TypeScript error where the `version`
    // method was not found on the subclass type within the constructor. This can happen
    // due to tooling or configuration issues. Casting `this` to the base `Dexie`
    // class ensures TypeScript recognizes the inherited method.
    (this as Dexie).version(1).stores({
      appState: 'key', // Primary key is 'key'
    });
  }
}

export const db = new MySubClassedDexie();
