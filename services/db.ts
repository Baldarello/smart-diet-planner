import Dexie, { type Table } from 'dexie';
import observable from 'dexie-observable';
import { StoredState, ProgressRecord, SyncedData, DailyLog } from '../types';
import { authStore } from '../stores/AuthStore';
import { saveStateToDrive } from './driveService';

// Define the structure of the object we are storing.
// This is based on MealPlanStore.saveToDB
export type { StoredState } from '../types';


export interface AppState {
  key: string;
  value: StoredState;
}

export class MySubClassedDexie extends Dexie {
  appState!: Table<AppState, string>;
  progressHistory!: Table<ProgressRecord, string>; // Primary key is the 'date' string
  dailyLogs!: Table<DailyLog, string>; // Primary key is date string 'YYYY-MM-DD'

  constructor() {
    super('dietPlanDatabase', { addons: [observable] });
    (this as any).version(3).stores({
      appState: 'key',
      progressHistory: 'date', // Primary key is 'date'
      dailyLogs: 'date', // To store daily instances of the meal plan
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
                    await saveStateToDrive(dataToSave, authStore.accessToken);
                    console.log('Successfully synced state to Google Drive.');
                }
            } catch (error) {
                console.error('Failed to sync state to Google Drive:', error);
            }
        }, 5000);
    }
}

(db as any).on('changes', handleDatabaseChangeForSync);