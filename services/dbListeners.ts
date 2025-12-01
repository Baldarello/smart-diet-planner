
import Dexie from 'dexie';
import { db } from './db';
import { authStore } from '../stores/AuthStore';
import { writeBackupFile, getOrCreateFolderId } from './driveService';
import { SyncedData } from '../types';
// Dynamic import for stores to avoid circular dependencies
// syncStore will be imported dynamically inside the function

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

// Removed 'syncState' from this list to prevent infinite recursion loops where
// the sync action updates syncState, which triggers the listener again.
const nutritionistTables = ['ingredients', 'nutritionistPlans', 'recipes', 'patients', 'assignedPlans', 'pdfSettings'];

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
        // Strictly filter only relevant tables. syncState must NOT trigger this.
        const relevantChanges = changes.filter(c => nutritionistTables.includes(c.table));
        
        if (relevantChanges.length > 0) {
            // Apply debounce to nutritionist sync as well to group rapid changes (like adding ingredients)
            // and preventing network congestion. Increased to 5000ms (5s) to allow chunked updates to finish.
            debounceSync(async () => {
                // Check if sync is already in progress
                const { syncStore } = await import('../stores/SyncStore');
                if (syncStore.status === 'syncing') {
                    console.log('Sync already in progress, skipping auto-sync trigger.');
                    return;
                }

                console.log('Nutritionist DB changed. Triggering sync upload to Google Drive.');
                
                // First, update the local timestamp immediately
                // We do this inside the debounce to ensure it happens just before upload
                db.syncState.put({ key: 'nutritionist', lastModified: Date.now() }).catch(e => console.error("Failed to update sync state", e));

                if (authStore.accessToken) {
                    const { uploadNutritionistData } = await import('../services/syncService');
                    // The status check in uploadNutritionistData prevents concurrent syncs.
                    uploadNutritionistData(authStore.accessToken);
                }
            }, 5000); // 5 second delay for nutritionist actions
        }
    }
}

export function setupDbListeners() {
    (db as any).on('changes', handleDatabaseChange);
}
