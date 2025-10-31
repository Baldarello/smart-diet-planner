import { makeAutoObservable, runInAction } from 'mobx';

export interface PdfSettings {
    logo: string | null; // base64 string
    headerText: string;
    footerText: string;
    primaryColor: string;
    fontFamily: 'Sans-serif' | 'Serif';
    baseFontSize: number;
    showPageNumbers: boolean;
}

const PDF_SETTINGS_KEY = 'nutritionist_pdf_settings';

class PdfSettingsStore {
    settings: PdfSettings = {
        logo: null,
        headerText: 'Piano Nutrizionale',
        footerText: 'Dott. Nutrizionista Rossi - Via Roma 1, 12345 Città - P.IVA 1234567890',
        primaryColor: '#8b5cf6',
        fontFamily: 'Sans-serif',
        baseFontSize: 14,
        showPageNumbers: true,
    };
    isHydrated = false;

    constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
        this.loadSettings();
    }

    loadSettings() {
        const savedSettings = localStorage.getItem(PDF_SETTINGS_KEY);
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                runInAction(() => {
                    this.settings = { ...this.settings, ...parsed };
                });
            } catch (e) {
                console.error("Failed to parse PDF settings from localStorage", e);
            }
        }
        runInAction(() => {
            this.isHydrated = true;
        });
    }

    saveSettings(newSettings: Partial<PdfSettings>) {
        runInAction(() => {
            this.settings = { ...this.settings, ...newSettings };
        });
        localStorage.setItem(PDF_SETTINGS_KEY, JSON.stringify(this.settings));
    }

    setLogo(file: File) {
        const reader = new FileReader();
        reader.onloadend = () => {
            this.saveSettings({ logo: reader.result as string });
        };
        reader.readAsDataURL(file);
    }

    removeLogo() {
        this.saveSettings({ logo: null });
    }

    setHeaderText(text: string) {
        this.saveSettings({ headerText: text });
    }
    
    setFooterText(text: string) {
        this.saveSettings({ footerText: text });
    }

    setPrimaryColor(color: string) {
        this.saveSettings({ primaryColor: color });
    }

    setFontFamily(font: 'Sans-serif' | 'Serif') {
        this.saveSettings({ fontFamily: font });
    }

    setBaseFontSize(size: number) {
        this.saveSettings({ baseFontSize: size });
    }

    setShowPageNumbers(show: boolean) {
        this.saveSettings({ showPageNumbers: show });
    }
}

export const pdfSettingsStore = new PdfSettingsStore();