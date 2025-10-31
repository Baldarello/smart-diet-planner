import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { pdfSettingsStore } from '../../stores/PdfSettingsStore';
import { t } from '../../i18n';
import { UploadIcon, TrashIcon } from '../Icons';

const PdfSettingsPage: React.FC = observer(() => {
    const { settings, setHeaderText, setFooterText, setLogo, removeLogo, isHydrated } = pdfSettingsStore;
    const [header, setHeader] = useState('');
    const [footer, setFooter] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (isHydrated) {
            setHeader(settings.headerText);
            setFooter(settings.footerText);
        }
    }, [isHydrated, settings.headerText, settings.footerText]);

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
            setLogo(file);
        }
    };

    const handleSave = () => {
        setHeaderText(header);
        setFooterText(footer);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    if (!isHydrated) {
        return <div>Loading settings...</div>;
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-6">Impostazioni PDF</h3>
            <div className="space-y-6">
                {/* Logo section */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Logo</label>
                    <div className="mt-2 flex items-center gap-4">
                        {settings.logo ? (
                            <div className="relative">
                                <img src={settings.logo} alt="Logo" className="h-20 w-auto object-contain rounded-md bg-slate-100 dark:bg-gray-700 p-1 border dark:border-gray-600"/>
                                <button onClick={removeLogo} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                                    <TrashIcon />
                                </button>
                            </div>
                        ) : (
                            <div className="h-20 w-20 bg-slate-100 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-400">
                                <UploadIcon />
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-200 font-semibold px-4 py-2 rounded-full hover:bg-slate-200 dark:hover:bg-gray-600"
                        >
                            {settings.logo ? 'Cambia Logo' : 'Carica Logo'}
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept="image/png, image/jpeg"
                            onChange={handleLogoUpload}
                        />
                    </div>
                </div>

                {/* Header Text */}
                <div>
                    <label htmlFor="header-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Testo Intestazione</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Questo testo apparirà sotto il logo (se presente) e sopra il nome del piano.</p>
                    <textarea
                        id="header-text"
                        rows={3}
                        value={header}
                        onChange={e => setHeader(e.target.value)}
                        className="w-full mt-1 p-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-violet-500 focus:border-violet-500"
                    />
                </div>

                {/* Footer Text */}
                <div>
                    <label htmlFor="footer-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Testo Piè di Pagina</label>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Questo testo apparirà in fondo a ogni pagina del PDF.</p>
                    <textarea
                        id="footer-text"
                        rows={3}
                        value={footer}
                        onChange={e => setFooter(e.target.value)}
                        className="w-full mt-1 p-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-violet-500 focus:border-violet-500"
                    />
                </div>

                {/* Save button */}
                <div className="flex justify-end">
                    <button
                        onClick={handleSave}
                        className="bg-violet-600 text-white font-semibold px-6 py-2 rounded-full hover:bg-violet-700 transition-colors"
                    >
                        {saved ? 'Salvato!' : 'Salva Impostazioni'}
                    </button>
                </div>
            </div>
        </div>
    );
});

export default PdfSettingsPage;
