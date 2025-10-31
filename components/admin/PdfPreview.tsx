import React from 'react';
import { PdfSettings } from '../../stores/PdfSettingsStore';

interface PdfPreviewProps {
    settings: PdfSettings;
}

const PdfPreview: React.FC<PdfPreviewProps> = ({ settings }) => {
    const fontFamily = settings.fontFamily === 'Serif' 
        ? 'Georgia, serif' 
        : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

    return (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden border dark:border-gray-700">
            <div 
                className="p-8 aspect-[1/1.414] w-full overflow-hidden transform scale-[0.9] origin-top relative"
                style={{
                    fontFamily,
                    fontSize: `${settings.fontSizeBody}px`,
                    lineHeight: settings.lineHeight,
                    color: '#333'
                }}
            >
                {/* Header */}
                <div style={{ textAlign: 'center', borderBottom: '1px solid #eee', paddingBottom: '20px', marginBottom: '20px' }}>
                    {settings.logo && <img src={settings.logo} alt="Logo" style={{ maxHeight: '60px', margin: '0 auto 10px' }} />}
                    <div style={{ whiteSpace: 'pre-wrap', color: '#555', fontSize: '0.9em' }}>
                        {settings.headerText.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                    </div>
                </div>

                {/* Body */}
                <h1 style={{ fontSize: `${settings.fontSizeH1}px`, color: settings.primaryColor, borderBottom: `2px solid ${settings.primaryColor}`, paddingBottom: '5px', marginBottom: '15px' }}>
                    Nome del Piano
                </h1>

                <h2 style={{ fontSize: `${settings.fontSizeH2}px`, color: settings.primaryColor, marginTop: '20px' }}>
                    LUNEDI
                </h2>
                
                <h3 style={{ fontSize: `${settings.fontSizeH3}px`, fontWeight: 600, marginTop: '15px', marginBottom: '8px' }}>
                    COLAZIONE - Yogurt e Frutta
                </h3>
                
                <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                    <li style={{ backgroundColor: '#f9fafb', borderLeft: `3px solid ${settings.primaryColor}`, opacity: 0.8, padding: '6px 10px', marginBottom: '4px', borderRadius: '4px' }}>
                        150g di Yogurt Greco
                    </li>
                    <li style={{ backgroundColor: '#f9fafb', borderLeft: `3px solid ${settings.primaryColor}`, opacity: 0.8, padding: '6px 10px', marginBottom: '4px', borderRadius: '4px' }}>
                        30g di Frutti di Bosco
                    </li>
                </ul>
                
                {/* Footer */}
                <div style={{ position: 'absolute', bottom: '30px', left: '30px', right: '30px', textAlign: 'center', fontSize: '0.7em', color: '#666', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                        {settings.footerText.split('\n').map((line, i) => <div key={i}>{line}</div>)}
                    </div>
                    {settings.showPageNumbers && <div style={{ marginTop: '5px' }}>Pag. 1</div>}
                </div>
            </div>
        </div>
    );
};

export default PdfPreview;
