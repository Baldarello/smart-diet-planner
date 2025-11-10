import Dexie, { type Table } from 'dexie';
import observable from 'dexie-observable';
import { StoredState, ProgressRecord, SyncedData, DailyLog, Ingredient, NutritionistPlan, Recipe, Patient, AssignedPlan, AuthData } from '../types';

// Define the structure of the object we are storing.
// This is based on MealPlanStore.saveToDB
export type { StoredState } from '../types';


export interface AppState {
  key: string;
  value: StoredState;
}

export interface SyncState {
    key: 'nutritionist';
    lastModified: number;
}

export class MySubClassedDexie extends Dexie {
  appState!: Table<AppState, string>;
  progressHistory!: Table<ProgressRecord, number>; // Primary key is 'id'
  dailyLogs!: Table<DailyLog, string>; // To store daily instances of the meal plan
  ingredients!: Table<Ingredient, number>;
  nutritionistPlans!: Table<NutritionistPlan, number>;
  recipes!: Table<Recipe, number>;
  patients!: Table<Patient, number>;
  assignedPlans!: Table<AssignedPlan, number>;
  syncState!: Table<SyncState, string>;
  authData!: Table<AuthData, string>; // New table for auth data

  constructor() {
    super('dietPlanDatabase', { addons: [observable] });
    // Fix: Cast 'this' to Dexie to resolve type error where 'version' is not found.
    (this as Dexie).version(4).stores({
      appState: 'key',
      progressHistory: 'date',
      dailyLogs: 'date',
      ingredients: '++id, &name'
    });
    // Fix: Cast 'this' to Dexie to resolve type error where 'version' is not found.
    (this as Dexie).version(5).stores({
      ingredients: '++id, &name, category'
    }).upgrade(tx => {
      // This upgrade function is empty because Dexie will automatically
      // add the new `category` index to the existing `ingredients` table.
      // No data migration is needed for existing ingredients.
      return tx.table('ingredients').count(); // Perform a simple operation to satisfy upgrade tx
    });

    (this as Dexie).version(6).stores({
      nutritionistPlans: '++id, name, creationDate'
    });

    (this as Dexie).version(7).stores({
      ingredients: '++id, &name, category, calories'
    });

    (this as Dexie).version(8).stores({
      recipes: '++id, &name'
    });

    (this as Dexie).version(9).stores({
      patients: '++id, lastName, firstName'
    });
    
    (this as Dexie).version(10).stores({
        assignedPlans: '++id, patientId, startDate, endDate'
    });

    (this as Dexie).version(11).stores({
      progressHistory: '++id, date, patientId, [patientId+date]'
    });

    (this as Dexie).version(12).stores({
        syncState: 'key',
    });

    // New version for authData table
    (this as Dexie).version(13).stores({
        authData: 'key', // Primary key for a single auth entry (e.g., 'userAuth')
    });
  }
}

export const db = new MySubClassedDexie();