import React from 'react';
import { PdfSettings } from '../../stores/PdfSettingsStore';

interface PdfPreviewProps {
    settings: PdfSettings;
}

const PdfPreview: React.FC<PdfPreviewProps> = ({ settings }) => {
    let fontFamily = '';
    switch (settings.fontFamily) {
        case 'Serif':
            fontFamily = 'Georgia, serif';
            break;
        case 'Roboto':
        case 'Lato':
        case 'Merriweather':
            fontFamily = `'${settings.fontFamily}', sans-serif`;
            break;
        default:
            fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
            break;
    }

    const googleFonts = ['Roboto', 'Lato', 'Merriweather'];

    return (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden border dark:border-gray-700">
             {googleFonts.includes(settings.fontFamily) && (
                <>
                    <link rel="preconnect" href="https://fonts.googleapis.com" />
                    <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
                    <link href={`https://fonts.googleapis.com/css2?family=${settings.fontFamily.replace(' ', '+')}:wght@400;700&display=swap`} rel="stylesheet" />
                </>
            )}
            <div 
                className="p-8 aspect-[1/1.414] w-full overflow-hidden transform scale-[0.9] origin-top relative"
                style={{
                    fontFamily,
                    fontSize: `${settings.fontSizeBody}px`,
                    lineHeight: settings.lineHeight,
                    color: settings.textColor
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
                
                {settings.showProcedures && (
                    <p style={{ marginTop: '10px', fontStyle: 'italic', fontSize: '0.9em' }}>
                        <strong>Procedura:</strong><br/>Mescolare lo yogurt con i frutti di bosco.
                    </p>
                )}
                
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