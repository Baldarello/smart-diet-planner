import { jwtDecode } from 'jwt-decode';
import { authStore } from '../stores/AuthStore';
import { UserProfile } from '../types';

// Fix: Add type declarations for the Google Identity Services (GSI) library
// to resolve "Cannot find namespace 'google'" errors. This provides TypeScript
// with the necessary type information for the globally available `google` object.
declare namespace google {
    namespace accounts {
        namespace oauth2 {
            interface TokenClient {
                requestAccessToken: (overrideConfig?: {
                    hint?: string;
                    callback?: (tokenResponse: TokenResponse) => void;
                }) => void;
            }
            function initTokenClient(config: {
                client_id: string;
                scope: string;
                callback: (tokenResponse: TokenResponse) => void;
            }): TokenClient;
            function revoke(token: string, done: () => void): void;
            interface TokenResponse {
                access_token: string;
                error?: string;
                error_description?: string;
            }
        }
        namespace id {
            function initialize(config: {
                client_id: string;
                callback: (response: CredentialResponse) => void;
            }): void;
            interface CredentialResponse {
                credential: string;
            }
            function prompt(): void;
        }
    }
}

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const API_KEY = process.env.GOOGLE_API_KEY;
const SCOPES = 'https://www.googleapis.com/auth/drive.appdata';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;

export const initGoogleAuth = () => {
    if (typeof google === 'undefined' || !CLIENT_ID) {
        console.error("Google GSI script not loaded or Client ID not configured.");
        return;
    }

    // Initialize the token client for getting access tokens for API calls
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (tokenResponse) => {
            if (tokenResponse && tokenResponse.access_token) {
                 // The ID token is what contains user profile info.
                 // We need to request it separately or get it from the initial sign-in.
                 // For now, let's assume we get it from a sign-in button.
            }
        },
    });
};

const getAccessToken = () => {
    if (!tokenClient) {
        console.error("Token client not initialized.");
        return;
    }
    // Request an access token
    tokenClient.requestAccessToken({
        hint: authStore.userProfile?.email,
    });
};


export const handleSignIn = () => {
    if (!CLIENT_ID) return;

    // Use the "Sign In with Google" client for getting an ID token (for user profile)
    google.accounts.id.initialize({
        client_id: CLIENT_ID,
        callback: (response: google.accounts.id.CredentialResponse) => {
            try {
                // Decode the JWT to get user profile information
                const decoded: { sub: string; name: string; email: string; picture: string } = jwtDecode(response.credential);
                
                const userProfile: UserProfile = {
                    id: decoded.sub,
                    name: decoded.name,
                    email: decoded.email,
                    picture: decoded.picture,
                };

                // Now that we have the user's identity, get an access token for Drive API
                if (tokenClient) {
                    tokenClient.requestAccessToken({
                        hint: userProfile.email,
                        callback: (tokenResponse) => {
                            if (tokenResponse.error) {
                                console.error("Access token error:", tokenResponse.error, tokenResponse.error_description);
                                authStore.setLoggedOut();
                                return;
                            }
                            if (tokenResponse.access_token) {
                                authStore.setLoggedIn(userProfile, tokenResponse.access_token);
                            }
                        }
                    });
                }
            } catch (error) {
                console.error("Error decoding credential or getting access token:", error);
                authStore.setLoggedOut();
            }
        }
    });
    
    // Prompt the user to select an account
    google.accounts.id.prompt();
};

export const handleSignOut = () => {
    if (authStore.accessToken) {
        google.accounts.oauth2.revoke(authStore.accessToken, () => {
            console.log('Access token revoked.');
        });
    }
    authStore.setLoggedOut();
};
