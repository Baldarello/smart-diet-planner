import { makeAutoObservable, observable } from 'mobx';
import React from 'react';

class UIStore {
    infoModalIsOpen = false;
    infoModalTitle = '';
    infoModalMessage: React.ReactNode = null;

    confirmationModalIsOpen = false;
    confirmationModalTitle = '';
    confirmationModalMessage: React.ReactNode = null;
    confirmationModalOnConfirm: () => void = () => {};

    achievementsModalIsOpen = false;

    constructor() {
        makeAutoObservable(this, {
            infoModalMessage: observable.ref,
            confirmationModalMessage: observable.ref,
        }, { autoBind: true });
    }

    showInfoModal(title: string, message: React.ReactNode) {
        this.infoModalIsOpen = true;
        this.infoModalTitle = title;
        this.infoModalMessage = message;
    }

    hideInfoModal() {
        this.infoModalIsOpen = false;
        setTimeout(() => {
            if (!this.infoModalIsOpen) {
                this.infoModalTitle = '';
                this.infoModalMessage = null;
            }
        }, 300);
    }

    showConfirmationModal(title: string, message: React.ReactNode, onConfirm: () => void) {
        this.confirmationModalIsOpen = true;
        this.confirmationModalTitle = title;
        this.confirmationModalMessage = message;
        this.confirmationModalOnConfirm = () => {
            onConfirm();
            this.hideConfirmationModal();
        };
    }

    hideConfirmationModal() {
        this.confirmationModalIsOpen = false;
        setTimeout(() => {
            if (!this.confirmationModalIsOpen) {
                this.confirmationModalTitle = '';
                this.confirmationModalMessage = null;
                this.confirmationModalOnConfirm = () => {};
            }
        }, 300);
    }

    showAchievementsModal() {
        this.achievementsModalIsOpen = true;
    }

    hideAchievementsModal() {
        this.achievementsModalIsOpen = false;
    }
}

export const uiStore = new UIStore();