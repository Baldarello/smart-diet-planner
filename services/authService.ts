import { authStore } from '../stores/AuthStore';
import { UserProfile } from '../types';
import { syncWithDrive, syncNutritionistData } from './syncService';

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
          expires_in: number; // Add expires_in
          [key: string]: any;
        }
      }
    }
  }
}


const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';

export let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let initPromise: Promise<void> | null = null;

const waitForGoogle = (): Promise<void> => {
    return new Promise((resolve) => {
        if (typeof google !== 'undefined' && google.accounts) return resolve();
        
        const interval = setInterval(() => {
            if (typeof google !== 'undefined' && google.accounts) {
                clearInterval(interval);
                resolve();
            }
        }, 100);
        
        // Timeout di sicurezza dopo 5 secondi
        setTimeout(() => { 
            clearInterval(interval); 
            resolve(); 
        }, 5000);
    });
};

export const initGoogleAuth = async () => {
    if (tokenClient) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
        await waitForGoogle();
        
        if (typeof google === 'undefined' || !CLIENT_ID) {
            console.warn("Google scripts not loaded or CLIENT_ID missing.");
            return;
        }

        try {
            tokenClient = google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: async (tokenResponse) => {
                    if (tokenResponse && tokenResponse.access_token) {
                        const accessToken = tokenResponse.access_token;
                        const expiresIn = tokenResponse.expires_in;
                        try {
                            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                headers: { 'Authorization': `Bearer ${accessToken}` }
                            });
                            if (!response.ok) {
                                throw new Error(`Failed to fetch user info: ${response.statusText}`);
                            }
                            const profile = await response.json();

                            const userProfile: UserProfile = {
                                id: profile.sub,
                                name: profile.name,
                                email: profile.email,
                                picture: profile.picture,
                            };

                            await authStore.setLoggedIn(userProfile, accessToken, expiresIn);
                            
                            // Sync based on login mode
                            if (authStore.loginMode === 'nutritionist') {
                                await syncNutritionistData(accessToken);
                            } else {
                                 if (authStore.loginRedirectAction) {
                                    await authStore.loginRedirectAction();
                                    authStore.clearLoginRedirectAction();
                                } else {
                                    await syncWithDrive(accessToken);
                                }
                            }

                        } catch (error) {
                            console.error("Error fetching user profile or syncing:", error);
                            // In questo caso, se il login esplicito fallisce, facciamo logout.
                            authStore.setLoggedOut();
                        }
                    } else {
                         console.error("Authentication failed:", tokenResponse);
                    }
                },
                error_callback: (error) => {
                    console.error("Google Auth Error:", error);
                }
            });
        } catch (error) {
            console.error("Failed to initialize Google Token Client:", error);
        }
    })();
    
    return initPromise;
};

export const handleSignIn = async () => {
    if (!authStore.loginMode) {
        authStore.setLoginMode('user');
    }
    
    if (!tokenClient) {
        await initGoogleAuth();
    }
    
    if (tokenClient) {
        tokenClient.requestAccessToken();
    } else {
        console.error("Google Auth failed to initialize. Please check your connection.");
    }
};

export const handleSignOut = () => {
    if (authStore.accessToken && typeof google !== 'undefined' && google.accounts) {
        try {
            google.accounts.oauth2.revoke(authStore.accessToken, () => {
                console.log('Access token revoked.');
            });
        } catch (e) {
            console.warn("Error revoking token:", e);
        }
    }
    authStore.setLoggedOut();
};