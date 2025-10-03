import { authStore } from '../stores/AuthStore';
import { UserProfile, SyncedData } from '../types';
import { runInAction } from 'mobx';
import { loadStateFromDrive, saveStateToDrive } from './driveService';
import { db } from './db';

// Define google types globally as they come from a script tag
declare global {
  namespace google {
    namespace accounts {
      namespace oauth2 {
        function initTokenClient(config: TokenClientConfig): TokenClient;
        function revoke(token: string, callback: () => void): void;
        interface TokenClient {
          requestAccessToken(overrideConfig?: { prompt?: string }): void;
        }
        interface TokenClientConfig {
          client_id: string;
          scope: string;
          callback: (response: TokenResponse) => void;
          error_callback?: (error: { type: string }) => void;
        }
        interface TokenResponse {
          access_token: string;
          error?: string;
          error_description?: string;
          [key: string]: any;
        }
      }
    }
  }
}


const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;

async function syncWithDriveOnLogin(accessToken: string) {
    // Fix: Use dynamic import to break a circular dependency cycle with MealPlanStore.
    // This was causing a fatal module initialization error.
    const { mealPlanStore, AppStatus } = await import('../stores/MealPlanStore');

    runInAction(() => mealPlanStore.status = AppStatus.SYNCING);
    try {
        const remoteData = await loadStateFromDrive(accessToken);

        if (remoteData && remoteData.appState) {
            console.log("Remote data found, overwriting local database.");
            // Fix: The transaction method was not being found on the custom Dexie class.
            // Switching to the array signature for passing tables to the transaction
            // can resolve TypeScript type inference issues in some Dexie setups.
            await db.transaction('rw', [db.appState, db.progressHistory], async () => {
                await db.progressHistory.clear();
                await db.appState.put({ key: 'dietPlanData', value: remoteData.appState });
                if (remoteData.progressHistory?.length) {
                    await db.progressHistory.bulkPut(remoteData.progressHistory);
                }
            });
             console.log("Local database overwritten successfully.");
        } else {
            console.log("No remote data found. Checking for local data to upload.");
            const appState = await db.appState.get('dietPlanData');
            if (appState) {
                const progressHistory = await db.progressHistory.toArray();
                const dataToSave: SyncedData = { appState: appState.value, progressHistory };
                await saveStateToDrive(dataToSave, accessToken);
                console.log("Local data uploaded to Google Drive.");
            } else {
                 console.log("No local data to upload.");
            }
        }
    } catch (error) {
        console.error("Error during Google Drive sync:", error);
        // Let the store init with whatever is local
    } finally {
        await mealPlanStore.init();
    }
}

export const initGoogleAuth = () => {
    if (typeof google === 'undefined' || !CLIENT_ID) {
        console.error("Google GSI script not loaded or Client ID not configured.");
        return;
    }

    // Initialize the token client
    try {
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: async (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    const accessToken = tokenResponse.access_token;
                    try {
                        const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                            headers: { 'Authorization': `Bearer ${accessToken}` }
                        });
                        if (!response.ok) {
                            const errorBody = await response.json();
                            throw new Error(`Failed to fetch user info: ${errorBody.error_description || response.statusText}`);
                        }
                        const profile = await response.json();

                        const userProfile: UserProfile = {
                            id: profile.sub,
                            name: profile.name,
                            email: profile.email,
                            picture: profile.picture,
                        };

                        authStore.setLoggedIn(userProfile, accessToken);
                        await syncWithDriveOnLogin(accessToken);

                    } catch (error) {
                        console.error("Error fetching user profile or syncing:", error);
                        authStore.setLoggedOut();
                    }
                } else {
                     console.error("Authentication failed:", tokenResponse);
                     authStore.setLoggedOut();
                }
            },
            error_callback: (error) => {
                console.error("Google Auth Error:", error);
                authStore.setLoggedOut();
            }
        });
    } catch (error) {
        console.error("Failed to initialize Google Token Client:", error);
    }
};

export const handleSignIn = () => {
    if (!tokenClient) {
        console.error("Google Auth not initialized.");
        return;
    }
    // Prompt the user to select an account and grant access
    tokenClient.requestAccessToken();
};

export const handleSignOut = () => {
    if (authStore.accessToken) {
        google.accounts.oauth2.revoke(authStore.accessToken, () => {
            console.log('Access token revoked.');
        });
    }
    authStore.setLoggedOut();
};