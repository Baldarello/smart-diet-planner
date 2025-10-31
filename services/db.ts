import Dexie, { type Table } from 'dexie';
import observable from 'dexie-observable';
import { StoredState, ProgressRecord, SyncedData, DailyLog, Ingredient, NutritionistPlan, Recipe, Patient, AssignedPlan } from '../types';
import { authStore } from '../stores/AuthStore';
import { writeBackupFile } from './driveService';

// Define the structure of the object we are storing.
// This is based on MealPlanStore.saveToDB
export type { StoredState } from '../types';


export interface AppState {
  key: string;
  value: StoredState;
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
  }
}

export const db = new MySubClassedDexie();

interface DexieObservableChange {
  table: string;
  type: 1 | 2 | 3; // 1-create, 2-update, 3-delete
  key: any;
  obj?: any;
  oldObj?: any;
}

let syncTimeout: number | undefined;

const debounceSync = (callback: () => void, delay: number) => {
    clearTimeout(syncTimeout);
    syncTimeout = window.setTimeout(callback, delay);
};

async function handleDatabaseChangeForSync(changes: DexieObservableChange[]) {
    if (!authStore.isLoggedIn || !authStore.accessToken) {
        console.log("User not logged in, skipping sync.");
        return;
    }
    
    const isAppStateChange = changes.some(c => c.table === 'appState' && c.key === 'dietPlanData');
    const isProgressChange = changes.some(c => c.table === 'progressHistory');
    const isDailyLogChange = changes.some(c => c.table === 'dailyLogs');


    if (isAppStateChange || isProgressChange || isDailyLogChange) {
        debounceSync(async () => {
            console.log('Database state changed. Debouncing sync with Google Drive.');
            try {
                const appState = await db.appState.get('dietPlanData');
                const progressHistory = await db.progressHistory.toArray();
                const dailyLogs = await db.dailyLogs.toArray();

                if (appState && authStore.accessToken) {
                    const dataToSave: SyncedData = { appState: appState.value, progressHistory, dailyLogs };
                    await writeBackupFile(dataToSave, authStore.accessToken);
                    console.log('Successfully synced state to Google Drive.');
                }
            } catch (error) {
                console.error('Failed to sync state to Google Drive:', error);
            }
        }, 5000);
    }
}

(db as any).on('changes', handleDatabaseChangeForSync);