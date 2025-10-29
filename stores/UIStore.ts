import { makeAutoObservable } from 'mobx';
import React from 'react';

interface InfoModalState {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
}

class UIStore {
    infoModal: InfoModalState = {
        isOpen: false,
        title: '',
        message: '',
    };

    constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
    }

    showInfoModal(title: string, message: React.ReactNode) {
        this.infoModal = {
            isOpen: true,
            title,
            message,
        };
    }

    hideInfoModal() {
        this.infoModal.isOpen = false;
        // Reset content after it's hidden to prevent flash of old content
        setTimeout(() => {
            if (!this.infoModal.isOpen) {
                this.infoModal.title = '';
                this.infoModal.message = '';
            }
        }, 300); // Corresponds to animation duration
    }
}

export const uiStore = new UIStore();
