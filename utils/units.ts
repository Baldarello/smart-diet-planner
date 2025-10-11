export const weightUnits = ['g', 'kg', 'hg', 'mg'];
export const volumeUnits = ['ml', 'l', 'cl'];
export const pieceUnits = [
    'unità',
    'pezzo/i',
    'fetta/e',
    'vasetto/i',
    'cucchiaio/i',
    'cucchiaino/i',
    'scatoletta/e',
    'confezione/i',
    'bottiglia/e',
    'spicchio',
    'pizzico'
];

export const allUnits = [...weightUnits, ...volumeUnits, ...pieceUnits].sort((a, b) => a.localeCompare(b));
