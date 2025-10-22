import { runInAction } from 'mobx';
import { db } from './db';
import { findLatestBackupFile, readBackupFile, writeBackupFile } from './driveService';
import { SyncedData } from '../types';
import Dexie from 'dexie';

export async function syncWithDrive(accessToken: string) {
    // Dynamic import to break circular dependency
    const { mealPlanStore, AppStatus } = await import('../stores/MealPlanStore');

    // Prevent re-entry if a sync is already in progress.
    if (mealPlanStore.status === AppStatus.SYNCING) {
        console.log("Sync already in progress. Skipping.");
        return;
    }

    runInAction(() => { mealPlanStore.status = AppStatus.SYNCING });
    try {
        const latestBackupFile = await findLatestBackupFile(accessToken);
        let remoteData: SyncedData | null = null;
        if (latestBackupFile) {
            remoteData = await readBackupFile(accessToken, latestBackupFile.id);
        }
        
        const localData = await db.appState.get('dietPlanData');

        const remoteTimestamp = remoteData?.appState?.lastModified || 0;
        const localTimestamp = localData?.value?.lastModified || 0;
        
        console.log(`Sync check: Remote timestamp=${remoteTimestamp}, Local timestamp=${localTimestamp}`);

        if (remoteData && (!localData || remoteTimestamp > localTimestamp)) {
            console.log("Remote data is newer or local data is missing. Overwriting local database.");
            await (db as Dexie).transaction('rw', [db.appState, db.progressHistory, db.dailyLogs], async () => {
                await db.appState.clear();
                await db.progressHistory.clear();
                await db.dailyLogs.clear();

                await db.appState.put({ key: 'dietPlanData', value: remoteData.appState });
                if (remoteData.progressHistory?.length) {
                    await db.progressHistory.bulkPut(remoteData.progressHistory);
                }
                 if (remoteData.dailyLogs?.length) {
                    await db.dailyLogs.bulkPut(remoteData.dailyLogs);
                }
            });
            console.log("Local database overwritten successfully.");
        } else if (localData && (!remoteData || localTimestamp > remoteTimestamp)) {
            // This condition covers two cases:
            // 1. No remote backup exists, so we do an initial upload. (User's request)
            // 2. Local data is newer than the remote backup.
            if (!remoteData) {
                console.log("Local data found but no remote backup exists. Creating initial backup on Google Drive.");
            } else {
                console.log("Local data is newer than remote backup. Uploading changes to Google Drive.");
            }
            
            const progressHistory = await db.progressHistory.toArray();
            const dailyLogs = await db.dailyLogs.toArray();
            const dataToSave: SyncedData = { appState: localData.value, progressHistory, dailyLogs };
            await writeBackupFile(dataToSave, accessToken);
            console.log("Local data successfully uploaded to Google Drive.");
        } else {
            console.log("Local and remote data are in sync. No action needed.");
        }
    } catch (error) {
        console.error("Error during Google Drive sync:", error);
    } finally {
        // Reload the store from the database to reflect synced changes
        await mealPlanStore.init();
    }
}
