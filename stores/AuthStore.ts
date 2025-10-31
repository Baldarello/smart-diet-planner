import { makeAutoObservable, runInAction } from 'mobx';
import { UserProfile } from '../types';
import { tokenClient } from '../services/authService';

const ACCESS_TOKEN_KEY = 'google_access_token';
const USER_PROFILE_KEY = 'google_user_profile';

export class AuthStore {
    isLoggedIn = false;
    userProfile: UserProfile | null = null;
    accessToken: string | null = null;
    status: 'INITIAL' | 'LOGGED_IN' | 'LOGGED_OUT' | 'ERROR' = 'INITIAL';
    loginRedirectAction: (() => Promise<void>) | null = null;

    constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    init = async (): Promise<string | null> => {
        try {
            const token = localStorage.getItem(ACCESS_TOKEN_KEY);
            const profileStr = localStorage.getItem(USER_PROFILE_KEY);

            if (token && profileStr) {
                // Validate token by fetching user info
                const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const profile = JSON.parse(profileStr);
                    runInAction(() => {
                        this.accessToken = token;
                        this.userProfile = profile;
                        this.isLoggedIn = true;
                        this.status = 'LOGGED_IN';
                    });
                    return token;
                } else {
                    // Token is invalid/expired. Try to silently refresh.
                    console.log("Access token expired or invalid. Attempting silent refresh.");
                    if (tokenClient) {
                        // This will trigger the callback in authService if successful
                        tokenClient.requestAccessToken({ prompt: '' });
                    } else {
                        console.warn("Token client not ready for silent refresh. User will be logged out.");
                        this.setLoggedOut();
                    }
                    return null; // Act as logged out while refresh is attempted.
                }
            } else {
                 this.setLoggedOut();
                 return null;
            }
        } catch (error) {
            console.warn("Could not restore session:", error);
            this.setLoggedOut(); // This also cleans up invalid data from localStorage
            return null;
        }
    }

    setLoggedIn = (profile: UserProfile, token: string) => {
        this.userProfile = profile;
        this.accessToken = token;
        this.isLoggedIn = true;
        this.status = 'LOGGED_IN';

        localStorage.setItem(ACCESS_TOKEN_KEY, token);
        localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    }

    setLoggedOut = () => {
        this.userProfile = null;
        this.accessToken = null;
        this.isLoggedIn = false;
        this.status = 'LOGGED_OUT';

        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(USER_PROFILE_KEY);
    }

    setLoginRedirectAction = (action: () => Promise<void>) => {
        this.loginRedirectAction = action;
    }
    
    clearLoginRedirectAction = () => {
        this.loginRedirectAction = null;
    }
}

export const authStore = new AuthStore();