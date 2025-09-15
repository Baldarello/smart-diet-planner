import Dexie, { type Table } from 'dexie';
import observable from 'dexie-observable';
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


/**
 * Placeholder function for handling database changes, intended for future
 * integration with a cloud sync service like Google Drive.
 * @param changes - An array of change objects from dexie-observable.
 */
function handleDatabaseChangeForSync(changes: DexieObservableChange[]) {
  // We only care about create/update changes to our main state object.
  // change.type: 1 (Create), 2 (Update), 3 (Delete)
  const appStateChange = changes.find(c => c.table === 'appState' && (c.type === 1 || c.type === 2));

  if (appStateChange) {
    console.log('Database state changed. Ready to sync with Google Drive.');
    // In a future implementation, this function would:
    // 1. Check if the user is authenticated with Google Drive.
    // 2. Serialize the updated state (maybe from the change object or by re-reading from DB).
    // 3. Debounce the requests to avoid too many API calls.
    // 4. Upload the new state to a specific file in the user's Google Drive AppData folder.
  }
}

// Subscribe to database changes.
// The subscription will be triggered after any successful database modification.
// FIX: A type assertion is used to resolve a TypeScript error where the 'on' property,
// added by the dexie-observable addon, is not recognized on the subclassed type. This
// is consistent with other typing workarounds in this class.
(db as any).on('changes', handleDatabaseChangeForSync);