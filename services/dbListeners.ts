import Dexie from 'dexie';
import { db } from './db';
import { authStore } from '../stores/AuthStore';
import { writeBackupFile, getOrCreateFolderId } from './driveService';
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

const nutritionistTables = ['ingredients', 'nutritionistPlans', 'recipes', 'patients', 'assignedPlans', 'pdfSettings', 'syncState'];

async function handleDatabaseChange(changes: DexieObservableChange[]) {
    // Only trigger sync if user is logged in
    if (!authStore.isLoggedIn || !authStore.accessToken) {
        return;
    }

    // Patient sync logic
    if (authStore.loginMode === 'user') {
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
                        const lifePulseFolderId = await getOrCreateFolderId(authStore.accessToken, 'LifePulse');
                        const patientFolderId = await getOrCreateFolderId(authStore.accessToken, 'Patient', lifePulseFolderId);
                        
                        const dataToSave: SyncedData = { appState: appState.value, progressHistory, dailyLogs };
                        await writeBackupFile(dataToSave, authStore.accessToken, patientFolderId);
                        console.log('Successfully synced state to Google Drive.');
                    }
                } catch (error) {
                    console.error('Failed to sync state to Google Drive:', error);
                }
            }, 5000);
        }
    }
    
    // Nutritionist sync logic
    else if (authStore.loginMode === 'nutritionist') {
        const isNutritionistChange = changes.some(c => nutritionistTables.includes(c.table));
        if (isNutritionistChange) {
             // First, update the local timestamp immediately
            db.syncState.put({ key: 'nutritionist', lastModified: Date.now() }).catch(e => console.error("Failed to update sync state", e));

            // Then, trigger the upload without debounce.
            // An IIFE is used to handle the async operation without blocking.
            (async () => {
                if (authStore.accessToken) {
                    console.log('Nutritionist DB changed. Triggering sync upload to Google Drive.');
                    const { uploadNutritionistData } = await import('../services/syncService');
                    // The status check in uploadNutritionistData prevents concurrent syncs.
                    uploadNutritionistData(authStore.accessToken);
                }
            })();
        }
    }
}

export function setupDbListeners() {
    (db as Dexie).on('changes', handleDatabaseChange);
}