import { makeAutoObservable, runInAction, toJS } from 'mobx';
import { UserProfile } from '../types';
import { tokenClient } from '../services/authService';
import { db } from '../services/db';

const REFRESH_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes before token expires

export class AuthStore {
    isLoggedIn = false;
    userProfile: UserProfile | null = null;
    accessToken: string | null = null;
    status: 'INITIAL' | 'LOGGED_IN' | 'LOGGED_OUT' | 'ERROR' = 'INITIAL';
    loginRedirectAction: (() => Promise<void>) | null = null;
    loginMode: 'user' | 'nutritionist' | null = null;
    tokenExpirationTime: number | null = null; // Stored timestamp when the token is expected to expire
    isHydrated = false; // New property to indicate if initial load is complete

    constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    init = async (): Promise<string | null> => {
        try {
            const authData = await db.authData.get('userAuth');

            if (authData) {
                const { accessToken, userProfile, loginMode, tokenExpirationTime } = authData;
                
                runInAction(() => {
                    this.accessToken = accessToken;
                    this.userProfile = userProfile;
                    this.loginMode = loginMode;
                    this.tokenExpirationTime = tokenExpirationTime;
                });

                if (tokenExpirationTime && Date.now() >= tokenExpirationTime - REFRESH_THRESHOLD_MS) {
                    console.log("Access token expiring soon or expired. Attempting silent refresh.");
                    if (tokenClient) {
                        tokenClient.requestAccessToken({ prompt: '' }); // Attempt silent refresh
                        // While silent refresh is in progress, keep the UI in a logged-out/loading state
                        runInAction(() => {
                            this.status = 'INITIAL'; // Indicate awaiting refresh
                            this.isLoggedIn = false;
                        });
                        return null; 
                    } else {
                        console.warn("Token client not ready for silent refresh. User will be logged out.");
                        this.setLoggedOut();
                        return null;
                    }
                }

                // Token seems valid enough, verify with userinfo endpoint
                const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { 'Authorization': `Bearer ${accessToken}` }
                });

                if (response.ok) {
                    runInAction(() => {
                        this.isLoggedIn = true;
                        this.status = 'LOGGED_IN';
                    });
                    return accessToken;
                } else {
                    console.log("Access token invalid. Logging out.");
                    this.setLoggedOut();
                    return null;
                }
            } else {
                 this.setLoggedOut();
                 return null;
            }
        } catch (error) {
            console.warn("Could not restore session from IndexedDB:", error);
            this.setLoggedOut();
            return null;
        } finally {
            runInAction(() => {
                this.isHydrated = true; // Set to true regardless of success or failure
            });
        }
    }

    setLoggedIn = async (profile: UserProfile, accessToken: string, expiresIn: number) => {
        const tokenExpirationTime = Date.now() + expiresIn * 1000; // expiresIn is in seconds

        runInAction(() => {
            this.userProfile = profile;
            this.accessToken = accessToken;
            this.isLoggedIn = true;
            this.status = 'LOGGED_IN';
            this.tokenExpirationTime = tokenExpirationTime;
        });

        try {
            await db.authData.put({
                key: 'userAuth',
                userProfile: toJS(profile),
                accessToken,
                loginMode: this.loginMode!, // loginMode should be set by now
                lastLogin: Date.now(),
                // Fix: Added 'tokenExpirationTime' to the object being saved.
                tokenExpirationTime,
            });
        } catch (e) {
            console.error("Failed to save auth data to IndexedDB", e);
        }
    }

    setLoggedOut = async () => {
        runInAction(() => {
            this.userProfile = null;
            this.accessToken = null;
            this.isLoggedIn = false;
            this.status = 'LOGGED_OUT';
            this.loginMode = null;
            this.tokenExpirationTime = null;
        });

        try {
            await db.authData.delete('userAuth');
        } catch (e) {
            console.error("Failed to delete auth data from IndexedDB", e);
        }
    }
    
    setLoginMode = (mode: 'user' | 'nutritionist') => {
        runInAction(() => {
            this.loginMode = mode;
        });
    }

    setLoginRedirectAction = (action: () => Promise<void>) => {
        this.loginRedirectAction = action;
    }
    
    clearLoginRedirectAction = () => {
        this.loginRedirectAction = null;
    }
}

export const authStore = new AuthStore();