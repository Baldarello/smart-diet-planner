import { makeAutoObservable } from 'mobx';
import React from 'react';

interface InfoModalState {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
}

interface ConfirmationModalState {
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
}

class UIStore {
    infoModal: InfoModalState = {
        isOpen: false,
        title: '',
        message: '',
    };

    confirmationModal: ConfirmationModalState = {
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => {},
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

    showConfirmationModal(title: string, message: React.ReactNode, onConfirm: () => void) {
        this.confirmationModal = {
            isOpen: true,
            title,
            message,
            onConfirm: () => {
                onConfirm();
                this.hideConfirmationModal();
            },
        };
    }

    hideConfirmationModal() {
        this.confirmationModal.isOpen = false;
        // Reset after animation
        setTimeout(() => {
            if (!this.confirmationModal.isOpen) {
                this.confirmationModal = {
                    isOpen: false,
                    title: '',
                    message: '',
                    onConfirm: () => {},
                };
            }
        }, 300);
    }
}

export const uiStore = new UIStore();