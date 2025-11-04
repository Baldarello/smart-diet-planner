import Dexie from 'dexie';
import { db } from './db';
import { authStore } from '../stores/AuthStore';
import { writeBackupFile } from './driveService';
import { SyncedData } from '../types';

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

const nutritionistTables = ['ingredients', 'nutritionistPlans', 'recipes', 'patients', 'assignedPlans'];

async function handleDatabaseChangeForSync(changes: DexieObservableChange[]) {
    if (!authStore.isLoggedIn || !authStore.accessToken || authStore.loginMode === 'nutritionist') {
        // console.log("User is not a patient or not logged in, skipping patient data sync.");
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

export function setupDbListeners() {
    (db as Dexie).on('changes', (changes: DexieObservableChange[]) => {
        const isNutritionistChange = changes.some(c => nutritionistTables.includes(c.table));
        if (isNutritionistChange) {
            db.syncState.put({ key: 'nutritionist', lastModified: Date.now() }).catch(e => console.error("Failed to update sync state", e));
        }
    });

    (db as Dexie).on('changes', handleDatabaseChangeForSync);
}
