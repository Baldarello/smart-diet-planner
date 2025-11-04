import { makeAutoObservable, runInAction } from 'mobx';

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

class SyncStore {
    status: SyncStatus = 'idle';
    lastSync: Date | null = null;
    error: string | null = null;

    constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    setStatus(status: SyncStatus, error: string | null = null) {
        this.status = status;
        this.error = error;
        if (status === 'synced') {
            this.lastSync = new Date();
        }
        if (status !== 'error') {
            this.error = null;
        }
    }
}

export const syncStore = new SyncStore();