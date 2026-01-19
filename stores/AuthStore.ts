
import { makeAutoObservable, runInAction, toJS } from 'mobx';
import { UserProfile } from '../types';
import { db } from '../services/db';
import { identifyUser, resetUser, trackEvent } from '../services/analyticsService';

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
                    
                    // Ottimizzazione: Imposta l'utente come loggato se i dati esistono,
                    // indipendentemente dalla scadenza del token.
                    // Questo permette l'accesso offline e l'uso dell'app senza login forzato.
                    this.isLoggedIn = true;
                    this.status = 'LOGGED_IN';
                });
                
                // Re-identify user on app load if logged in, BUT ONLY if it is a nutritionist.
                // Patients remain anonymous in analytics.
                if (loginMode === 'nutritionist') {
                    identifyUser(userProfile.id, { email: userProfile.email, name: userProfile.name, loginMode });
                }

                return accessToken;
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

        // Analytics Identify: Only identify nutritionists. Patients are anonymous.
        if (this.loginMode === 'nutritionist') {
            identifyUser(profile.id, { email: profile.email, name: profile.name, loginMode: this.loginMode });
        }
        
        trackEvent('user_logged_in', { mode: this.loginMode });

        try {
            await db.authData.put({
                key: 'userAuth',
                userProfile: toJS(profile),
                accessToken,
                loginMode: this.loginMode!, // loginMode should be set by now
                lastLogin: Date.now(),
                tokenExpirationTime,
            });
        } catch (e) {
            console.error("Failed to save auth data to IndexedDB", e);
        }
    }

    setLoggedOut = async () => {
        // Analytics Reset
        if (this.isLoggedIn) {
            trackEvent('user_logged_out');
            resetUser();
        }

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
