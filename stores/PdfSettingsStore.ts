import { makeAutoObservable, runInAction } from 'mobx';

export interface PdfSettings {
    logo: string | null; // base64 string
    headerText: string;
    footerText: string;
    primaryColor: string;
    fontFamily: 'Sans-serif' | 'Serif';
    fontSizeH1: number;
    fontSizeH2: number;
    fontSizeH3: number;
    fontSizeBody: number;
    lineHeight: number;
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
        fontSizeH1: 24,
        fontSizeH2: 20,
        fontSizeH3: 16,
        fontSizeBody: 12,
        lineHeight: 1.6,
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
                // Migrate old setting
                if (parsed.baseFontSize && !parsed.fontSizeBody) {
                    parsed.fontSizeBody = parsed.baseFontSize;
                    delete parsed.baseFontSize;
                }
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

    setFontSizeH1(size: number) { this.saveSettings({ fontSizeH1: size }); }
    setFontSizeH2(size: number) { this.saveSettings({ fontSizeH2: size }); }
    setFontSizeH3(size: number) { this.saveSettings({ fontSizeH3: size }); }
    setFontSizeBody(size: number) { this.saveSettings({ fontSizeBody: size }); }
    setLineHeight(height: number) { this.saveSettings({ lineHeight: height }); }

    setShowPageNumbers(show: boolean) {
        this.saveSettings({ showPageNumbers: show });
    }
}

export const pdfSettingsStore = new PdfSettingsStore();