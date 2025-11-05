import { runInAction } from 'mobx';
import { db } from './db';
import { findLatestBackupFile, readBackupFile, writeBackupFile, getOrCreateFolderId, uploadOrUpdateFileByName, listFiles, readFile, readFileByName, deleteFile, deleteFolder } from './driveService';
import { SyncedData } from '../types';
import { pdfSettingsStore } from '../stores/PdfSettingsStore';
import { ingredientStore } from '../stores/IngredientStore';
import { nutritionistStore } from '../stores/NutritionistStore';
import { recipeStore } from '../stores/RecipeStore';
import { patientStore } from '../stores/PatientStore';
import { syncStore } from '../stores/SyncStore';
import Dexie from 'dexie';

const SYNC_STATE_FILENAME = 'sync_state.json';
const INGREDIENTS_FILENAME = 'ingredients.json';
const PLAN_TEMPLATES_FILENAME = 'plan_templates.json';
const RECIPES_FILENAME = 'recipes.json';
const PATIENTS_FILENAME = 'patients.json';
const PDF_SETTINGS_FILENAME = 'pdf_settings.json';

async function downloadNutritionistData(accessToken: string, nutritionistFolderId: string) {
    console.log("Downloading all nutritionist data from Drive...");

    const [
        ingredients,
        nutritionistPlans,
        recipes,
        patients,
        pdfSettings,
        syncState,
        remoteFolders
    ] = await Promise.all([
        readFileByName(accessToken, nutritionistFolderId, INGREDIENTS_FILENAME),
        readFileByName(accessToken, nutritionistFolderId, PLAN_TEMPLATES_FILENAME),
        readFileByName(accessToken, nutritionistFolderId, RECIPES_FILENAME),
        readFileByName(accessToken, nutritionistFolderId, PATIENTS_FILENAME),
        readFileByName(accessToken, nutritionistFolderId, PDF_SETTINGS_FILENAME),
        readFileByName(accessToken, nutritionistFolderId, SYNC_STATE_FILENAME),
        listFiles(accessToken, nutritionistFolderId, 'application/vnd.google-apps.folder')
    ]);

    const allAssignedPlans = [];
    for (const folder of remoteFolders) {
        if (folder.name.startsWith('patient_')) {
            const planFiles = await listFiles(accessToken, folder.id);
            for (const file of planFiles) {
                const content = await readFile(accessToken, file.id);
                if (content) allAssignedPlans.push(content);
            }
        }
    }

    // Fix: Cast 'db' to 'Dexie' and use array syntax for tables to resolve the 'transaction' method type error.
    await (db as Dexie).transaction('rw', [db.ingredients, db.nutritionistPlans, db.recipes, db.patients, db.assignedPlans, db.syncState], async () => {
        await Promise.all([
            db.ingredients.clear(),
            db.nutritionistPlans.clear(),
            db.recipes.clear(),
            db.patients.clear(),
            db.assignedPlans.clear(),
        ]);

        if (ingredients?.length) await db.ingredients.bulkPut(ingredients);
        if (nutritionistPlans?.length) await db.nutritionistPlans.bulkPut(nutritionistPlans);
        if (recipes?.length) await db.recipes.bulkPut(recipes);
        if (patients?.length) await db.patients.bulkPut(patients);
        if (allAssignedPlans.length > 0) await db.assignedPlans.bulkPut(allAssignedPlans);
    });

    if (pdfSettings) {
        pdfSettingsStore.loadSettingsFromObject(pdfSettings);
    }
    
    if (syncState?.lastModified) {
        await db.syncState.put({ key: 'nutritionist', lastModified: syncState.lastModified });
    }
    console.log("Local nutritionist database overwritten successfully.");
}

export async function uploadNutritionistData(accessToken: string) {
    if (syncStore.status === 'syncing') return;

    syncStore.setStatus('syncing');
    try {
        const lifePulseFolderId = await getOrCreateFolderId(accessToken, 'LifePulse');
        const nutritionistFolderId = await getOrCreateFolderId(accessToken, 'Nutritionist', lifePulseFolderId);

        const [ingredients, plans, recipes, patients, assignedPlans] = await Promise.all([
            db.ingredients.toArray(),
            db.nutritionistPlans.toArray(),
            db.recipes.toArray(),
            db.patients.toArray(),
            db.assignedPlans.toArray(),
        ]);
        const pdfSettings = pdfSettingsStore.settings;

        await Promise.all([
            uploadOrUpdateFileByName(accessToken, nutritionistFolderId, INGREDIENTS_FILENAME, ingredients),
            uploadOrUpdateFileByName(accessToken, nutritionistFolderId, PLAN_TEMPLATES_FILENAME, plans),
            uploadOrUpdateFileByName(accessToken, nutritionistFolderId, RECIPES_FILENAME, recipes),
            uploadOrUpdateFileByName(accessToken, nutritionistFolderId, PATIENTS_FILENAME, patients),
            uploadOrUpdateFileByName(accessToken, nutritionistFolderId, PDF_SETTINGS_FILENAME, pdfSettings),
        ]);

        const remoteFolders = await listFiles(accessToken, nutritionistFolderId, 'application/vnd.google-apps.folder');
        const remotePatientFolderMap = new Map(remoteFolders.map(f => [f.name, f.id]));
        const localPatientFolderNames = new Set();

        for (const patient of patients) {
            const folderName = `patient_${patient.id}_${patient.firstName}_${patient.lastName}`.replace(/[^a-zA-Z0-9_]/g, '_');
            localPatientFolderNames.add(folderName);
            const patientFolderId = await getOrCreateFolderId(accessToken, folderName, nutritionistFolderId);
            
            const localPlansForPatient = assignedPlans.filter(ap => ap.patientId === patient.id);
            const remotePlanFiles = await listFiles(accessToken, patientFolderId);
            const remotePlanFileMap = new Map(remotePlanFiles.map(f => [f.name, f.id]));
            const localPlanFileNames = new Set();

            for (const plan of localPlansForPatient) {
                const fileName = `assigned_plan_${plan.id}.json`;
                localPlanFileNames.add(fileName);
                await uploadOrUpdateFileByName(accessToken, patientFolderId, fileName, plan);
            }

            for (const [remoteFileName, remoteFileId] of remotePlanFileMap.entries()) {
                if (!localPlanFileNames.has(remoteFileName)) {
                    await deleteFile(accessToken, remoteFileId);
                }
            }
        }

        for (const [remoteFolderName, remoteFolderId] of remotePatientFolderMap.entries()) {
            if (!localPatientFolderNames.has(remoteFolderName)) {
                await deleteFolder(accessToken, remoteFolderId);
            }
        }
        
        const lastModified = Date.now();
        await uploadOrUpdateFileByName(accessToken, nutritionistFolderId, SYNC_STATE_FILENAME, { lastModified });
        await db.syncState.put({ key: 'nutritionist', lastModified });
        
        console.log("Local nutritionist data successfully uploaded to Google Drive.");
        syncStore.setStatus('synced');
    } catch (error) {
        console.error("Error during nutritionist data upload:", error);
        syncStore.setStatus('error', error instanceof Error ? error.message : String(error));
    }
}

export async function syncNutritionistData(accessToken: string) {
    console.log("Starting nutritionist data sync...");
    syncStore.setStatus('syncing');

    try {
        const lifePulseFolderId = await getOrCreateFolderId(accessToken, 'LifePulse');
        const nutritionistFolderId = await getOrCreateFolderId(accessToken, 'Nutritionist', lifePulseFolderId);
        
        let remoteSyncState = null;
        try {
            remoteSyncState = await readFileByName(accessToken, nutritionistFolderId, SYNC_STATE_FILENAME);
        } catch (error) {
            console.warn("Could not fetch remote sync state due to an error. Proceeding as if no remote state exists.", error);
            // remoteSyncState will remain null, which correctly signals that remote data is absent or inaccessible.
        }

        const remoteTimestamp = remoteSyncState?.lastModified || 0;
        
        const localSyncState = await db.syncState.get('nutritionist');
        const localTimestamp = localSyncState?.lastModified || 0;

        console.log(`Sync check: Remote timestamp=${remoteTimestamp}, Local timestamp=${localTimestamp}`);

        if (remoteTimestamp > localTimestamp) {
            console.log("Remote nutritionist data is newer. Overwriting local database.");
            await downloadNutritionistData(accessToken, nutritionistFolderId);
        } else if (localTimestamp > remoteTimestamp || !remoteSyncState) {
            // Check if there is anything to upload before proceeding.
            // This prevents uploading an empty DB on first login if there's no remote data.
            const localDataExists = await db.ingredients.count() > 0 ||
                                  await db.nutritionistPlans.count() > 0 ||
                                  await db.recipes.count() > 0 ||
                                  await db.patients.count() > 0 ||
                                  await db.assignedPlans.count() > 0;

            if (localTimestamp > remoteTimestamp || (!remoteSyncState && localDataExists)) {
                console.log("Local nutritionist data is newer or no remote backup exists. Uploading to Google Drive.");
                 syncStore.setStatus('synced');
                await uploadNutritionistData(accessToken);
            } else {
                 console.log("Local and remote data are in sync, or both are empty.");
            }
        } else {
            console.log("Local and remote nutritionist data are in sync.");
        }
        syncStore.setStatus('synced');
    } catch (error) {
        console.error("Error during nutritionist Google Drive sync:", error);
        syncStore.setStatus('error', error instanceof Error ? error.message : String(error));
    } finally {
        await Promise.all([
            ingredientStore.loadIngredients(),
            nutritionistStore.loadPlans(),
            recipeStore.loadRecipes(),
            patientStore.loadPatients(),
            patientStore.loadAssignedPlans(),
        ]);
        pdfSettingsStore.loadSettings();
        console.log("Nutritionist stores reloaded after sync.");
    }
}


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
        const lifePulseFolderId = await getOrCreateFolderId(accessToken, 'LifePulse');
        const patientFolderId = await getOrCreateFolderId(accessToken, 'Patient', lifePulseFolderId);
        const latestBackupFile = await findLatestBackupFile(accessToken, patientFolderId);

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
            await writeBackupFile(dataToSave, accessToken, patientFolderId);
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