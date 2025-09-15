import Dexie, { type Table } from 'dexie';
import observable from 'dexie-observable';
import { ArchivedPlan, DayPlan, PantryItem, ShoppingListCategory, Theme, Locale } from '../types';
import { authStore } from '../stores/AuthStore';
import { saveStateToDrive } from './driveService';

// Define the structure of the object we are storing.
// This is based on MealPlanStore.saveToDB
export interface StoredState {
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
    // Fix: For Dexie v4, addons should be passed explicitly to the constructor
    // to ensure they are properly initialized. The old side-effect import
    // is deprecated and can be unreliable in some module setups, leading to
    // runtime errors like 'cannot read property of undefined'.
    super('dietPlanDatabase', { addons: [observable] });
    this.version(1).stores({
      appState: 'key', // Primary key is 'key'
    });
  }
}

export const db = new MySubClassedDexie();

// Fix: Correctly type the change objects from dexie-observable. The original types
// (CreateRequest, etc.) were incorrect for this context and caused import errors
// because they are not top-level exports from Dexie and don't match the
// observable change object structure.
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

/**
 * Handles database changes for syncing with Google Drive.
 * @param changes - An array of change objects from dexie-observable.
 */
async function handleDatabaseChangeForSync(changes: DexieObservableChange[]) {
    if (!authStore.isLoggedIn || !authStore.accessToken) {
        console.log("User not logged in, skipping sync.");
        return;
    }
    
    const appStateChange = changes.find(c => c.table === 'appState' && c.key === 'dietPlanData' && (c.type === 1 || c.type === 2));

    if (appStateChange) {
        debounceSync(async () => {
            console.log('Database state changed. Debouncing sync with Google Drive.');
            try {
                const latestState = await db.appState.get('dietPlanData');
                if (latestState && authStore.accessToken) {
                    await saveStateToDrive(latestState.value, authStore.accessToken);
                    console.log('Successfully synced state to Google Drive.');
                }
            } catch (error) {
                console.error('Failed to sync state to Google Drive:', error);
            }
        }, 5000); // Wait 5 seconds after the last change before syncing
    }
}


// Subscribe to database changes.
// The subscription will be triggered after any successful database modification.
// FIX: A type assertion is used to resolve a TypeScript error where the 'on' property,
// added by the dexie-observable addon, is not recognized on the subclassed type. This
// is consistent with other typing workarounds in this class.
(db as any).on('changes', handleDatabaseChangeForSync);