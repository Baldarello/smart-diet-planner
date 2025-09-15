import { makeAutoObservable, runInAction } from 'mobx';
import { UserProfile } from '../types';

const ACCESS_TOKEN_KEY = 'google_access_token';
const USER_PROFILE_KEY = 'google_user_profile';

export class AuthStore {
    isLoggedIn = false;
    userProfile: UserProfile | null = null;
    accessToken: string | null = null;
    status: 'INITIAL' | 'LOGGED_IN' | 'LOGGED_OUT' | 'ERROR' = 'INITIAL';

    constructor() {
        makeAutoObservable(this);
    }

    init = () => {
        try {
            const token = localStorage.getItem(ACCESS_TOKEN_KEY);
            const profile = localStorage.getItem(USER_PROFILE_KEY);

            if (token && profile) {
                runInAction(() => {
                    this.accessToken = token;
                    this.userProfile = JSON.parse(profile);
                    this.isLoggedIn = true;
                    this.status = 'LOGGED_IN';
                });
            } else {
                 this.setLoggedOut();
            }
        } catch (error) {
            console.error("Failed to initialize auth state from localStorage", error);
            this.setLoggedOut();
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
}

export const authStore = new AuthStore();