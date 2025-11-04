import { runInAction } from 'mobx';
import { db } from './db';
import { findLatestBackupFile, readBackupFile, writeBackupFile, findLatestNutritionistBackupFile, readNutritionistBackupFile, writeNutritionistBackupFile } from './driveService';
import { SyncedData, Ingredient, NutritionistPlan, Recipe, Patient, AssignedPlan } from '../types';
import { PdfSettings, pdfSettingsStore } from '../stores/PdfSettingsStore';
import { ingredientStore } from '../stores/IngredientStore';
import { nutritionistStore } from '../stores/NutritionistStore';
import { recipeStore } from '../stores/RecipeStore';
import { patientStore } from '../stores/PatientStore';

import Dexie from 'dexie';

export interface NutritionistSyncedData {
    ingredients: Ingredient[];
    nutritionistPlans: NutritionistPlan[];
    recipes: Recipe[];
    patients: Patient[];
    assignedPlans: AssignedPlan[];
    pdfSettings: PdfSettings;
    lastModified: number;
}

export async function syncNutritionistData(accessToken: string) {
    console.log("Starting nutritionist data sync...");

    try {
        const latestBackupFile = await findLatestNutritionistBackupFile(accessToken);
        let remoteData: NutritionistSyncedData | null = null;
        if (latestBackupFile) {
            remoteData = await readNutritionistBackupFile(accessToken, latestBackupFile.id);
        }

        const localSyncState = await db.syncState.get('nutritionist');
        const localTimestamp = localSyncState?.lastModified || 0;
        const remoteTimestamp = remoteData?.lastModified || 0;

        console.log(`Sync check: Remote timestamp=${remoteTimestamp}, Local timestamp=${localTimestamp}`);

        if (remoteData && (!localSyncState || remoteTimestamp > localTimestamp)) {
            console.log("Remote nutritionist data is newer. Overwriting local database.");
            const { ingredients, nutritionistPlans, recipes, patients, assignedPlans, pdfSettings, lastModified } = remoteData;
            
            // Fix: Cast `db` to `Dexie` and provide an explicit list of tables to fix the transaction type error.
            await (db as Dexie).transaction('rw', [db.ingredients, db.nutritionistPlans, db.recipes, db.patients, db.assignedPlans, db.syncState], async () => {
                const tablesToClear = [db.ingredients, db.nutritionistPlans, db.recipes, db.patients, db.assignedPlans];
                for (const table of tablesToClear) {
                    await table.clear();
                }

                if (ingredients?.length) await db.ingredients.bulkPut(ingredients);
                if (nutritionistPlans?.length) await db.nutritionistPlans.bulkPut(nutritionistPlans);
                if (recipes?.length) await db.recipes.bulkPut(recipes);
                if (patients?.length) await db.patients.bulkPut(patients);
                if (assignedPlans?.length) await db.assignedPlans.bulkPut(assignedPlans);
            });
            
            pdfSettingsStore.loadSettingsFromObject(pdfSettings);
            await db.syncState.put({ key: 'nutritionist', lastModified });
            console.log("Local nutritionist database overwritten successfully.");
            
        } else if (!remoteData || localTimestamp > remoteTimestamp) {
            console.log("Local nutritionist data is newer or no remote backup exists. Uploading to Google Drive.");
            
            const ingredients = await db.ingredients.toArray();
            const nutritionistPlans = await db.nutritionistPlans.toArray();
            const recipes = await db.recipes.toArray();
            const patients = await db.patients.toArray();
            const assignedPlans = await db.assignedPlans.toArray();
            const pdfSettings = pdfSettingsStore.settings;
            
            const dataToSave: NutritionistSyncedData = {
                ingredients,
                nutritionistPlans,
                recipes,
                patients,
                assignedPlans,
                pdfSettings,
                lastModified: localTimestamp,
            };

            await writeNutritionistBackupFile(dataToSave, accessToken);
            console.log("Local nutritionist data successfully uploaded to Google Drive.");
        } else {
            console.log("Local and remote nutritionist data are in sync.");
        }

    } catch (error) {
        console.error("Error during nutritionist Google Drive sync:", error);
    } finally {
        // Reload stores to reflect any synced changes
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