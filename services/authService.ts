import { authStore } from '../stores/AuthStore';
import { UserProfile } from '../types';
import { syncWithDrive } from './syncService';

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
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;

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
                        
                        if (authStore.loginRedirectAction) {
                            await authStore.loginRedirectAction();
                            authStore.clearLoginRedirectAction();
                        } else {
                            await syncWithDrive(accessToken);
                        }

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
        console.warn("Google Auth not initialized. Attempting to initialize for sign-in.");
        initGoogleAuth();
    }
    
    // now tokenClient might be set if GSI script was loaded.
    if (tokenClient) {
        tokenClient.requestAccessToken();
    } else {
        // This might happen if GSI script is not loaded yet.
        // The user might need to click again.
        console.error("Failed to initialize Google Auth. The Google Identity Services script may not be loaded yet. Please wait a moment and try again.");
    }
};

export const handleSignOut = () => {
    if (authStore.accessToken) {
        google.accounts.oauth2.revoke(authStore.accessToken, () => {
            console.log('Access token revoked.');
        });
    }
    authStore.setLoggedOut();
};