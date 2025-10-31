import React, { useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { pdfSettingsStore } from '../../stores/PdfSettingsStore';
import { t } from '../../i18n';
import { UploadIcon, TrashIcon } from '../Icons';
import Switch from '../Switch';
import PdfPreview from './PdfPreview';
import RangeSlider from './RangeSlider';

const PdfSettingsPage: React.FC = observer(() => {
    const { 
        settings, 
        setHeaderText, 
        setFooterText, 
        setLogo, 
        removeLogo, 
        isHydrated, 
        setPrimaryColor, 
        setFontFamily, 
        setFontSizeH1,
        setFontSizeH2,
        setFontSizeH3,
        setFontSizeBody,
        setLineHeight,
        setShowPageNumbers 
    } = pdfSettingsStore;
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && (file.type === 'image/jpeg' || file.type === 'image/png')) {
            setLogo(file);
        }
    };

    if (!isHydrated) {
        return <div>Loading settings...</div>;
    }

    return (
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-8 border-b dark:border-gray-700 pb-4">Impostazioni PDF</h3>
                <div className="space-y-10">

                    {/* Section: Content */}
                    <div>
                        <h4 className="text-lg font-semibold text-violet-700 dark:text-violet-400 mb-4">Contenuto</h4>
                        <div className="space-y-6">
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
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg" onChange={handleLogoUpload}/>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="header-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Testo Intestazione</label>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Apparirà sotto il logo.</p>
                                <textarea id="header-text" rows={4} value={settings.headerText} onChange={e => setHeaderText(e.target.value)} className="w-full mt-1 p-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"/>
                            </div>
                            <div>
                                <label htmlFor="footer-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Testo Piè di Pagina</label>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Apparirà in fondo a ogni pagina.</p>
                                <textarea id="footer-text" rows={4} value={settings.footerText} onChange={e => setFooterText(e.target.value)} className="w-full mt-1 p-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"/>
                            </div>
                        </div>
                    </div>

                    {/* Section: Style & Typography */}
                    <div>
                        <h4 className="text-lg font-semibold text-violet-700 dark:text-violet-400 mb-4">Stile e Tipografia</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                            <div>
                                <label htmlFor="primary-color" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Colore Primario</label>
                                <input id="primary-color" type="color" value={settings.primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="mt-1 h-10 w-full p-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md cursor-pointer"/>
                            </div>
                            <div>
                                <label htmlFor="font-family" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Stile Font</label>
                                <select id="font-family" value={settings.fontFamily} onChange={e => setFontFamily(e.target.value as 'Sans-serif' | 'Serif')} className="w-full mt-1 p-2 bg-slate-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md h-10">
                                    <option>Sans-serif</option>
                                    <option>Serif</option>
                                </select>
                            </div>
                            <RangeSlider label="Dimensione Titolo H1" value={settings.fontSizeH1} onChange={setFontSizeH1} min={18} max={48} step={1} unit="px" />
                            <RangeSlider label="Dimensione Titolo H2" value={settings.fontSizeH2} onChange={setFontSizeH2} min={16} max={36} step={1} unit="px" />
                            <RangeSlider label="Dimensione Titolo H3" value={settings.fontSizeH3} onChange={setFontSizeH3} min={14} max={28} step={1} unit="px" />
                            <RangeSlider label="Dimensione Testo" value={settings.fontSizeBody} onChange={setFontSizeBody} min={8} max={20} step={1} unit="px" />
                            <RangeSlider label="Interlinea" value={settings.lineHeight} onChange={setLineHeight} min={1.2} max={2.2} step={0.1} unit="" />
                        </div>
                    </div>
                    
                    {/* Section: Options */}
                    <div>
                         <h4 className="text-lg font-semibold text-violet-700 dark:text-violet-400 mb-4">Opzioni</h4>
                         <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-gray-700/50 rounded-lg">
                            <label htmlFor="show-page-numbers" className="font-medium text-gray-700 dark:text-gray-300">Mostra Numeri di Pagina</label>
                            <Switch id="show-page-numbers" checked={settings.showPageNumbers} onChange={setShowPageNumbers}/>
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="lg:col-span-1">
                <div className="sticky top-24">
                    <h4 className="text-xl font-bold text-gray-800 dark:text-gray-200 mb-4 text-center">Anteprima PDF</h4>
                    <PdfPreview settings={settings} />
                </div>
            </div>
        </div>
    );
});

export default PdfSettingsPage;