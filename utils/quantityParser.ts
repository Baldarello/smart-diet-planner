export interface ParsedQuantity {
  value: number;
  unit: string;
}

const numberWords: { [key: string]: number } = {
  un: 1, uno: 1, una: 1,
  due: 2, tre: 3, quattro: 4, cinque: 5, sei: 6, sette: 7, otto: 8, nove: 9, dieci: 10,
  mezza: 0.5, mezzo: 0.5,
};

function normalizeString(s: string): string {
    return s.toLowerCase().trim();
}

/**
 * Parses a quantity string (e.g., "100g", "1 banana", "2-3 cucchiai") into a value and unit.
 */
export function parseQuantity(description: string): ParsedQuantity | null {
    if (!description) return null;
    let desc = normalizeString(description);

    // Handle ranges like "2-3 noci" -> take the first number
    const rangeMatch = desc.match(/^(\d+)-\d+\s*(.*)/);
    if (rangeMatch) {
        desc = `${rangeMatch[1]} ${rangeMatch[2] || ''}`.trim();
    }
    
    // Handle number words like "un vasetto", "mezza cipolla"
    const words = desc.split(' ');
    if (numberWords[words[0]]) {
        return {
            value: numberWords[words[0]],
            unit: words.slice(1).join(' ') || words[0]
        };
    }

    // Handle standard numbers "100g", "60 g", "1.5 tazze"
    const standardMatch = desc.match(/^(\d+[\.,]?\d*)\s*(.*)/);
    if (standardMatch) {
        const value = parseFloat(standardMatch[1].replace(',', '.'));
        const unit = standardMatch[2] || 'units';
        return { value, unit };
    }

    // If no quantity found, assume it's a non-quantifiable item (like "sale e pepe")
    return null;
}

/**
 * Formats a parsed quantity back into a string.
 */
export function formatQuantity(pq: ParsedQuantity): string {
    // Round to 2 decimal places to avoid floating point issues
    const value = Math.round(pq.value * 100) / 100;
    
    if (pq.unit === 'units') return `${value}`;
    
    // Handles cases like "100g" vs "1 banana"
    if (/^[a-zA-ZÀ-ú]/.test(pq.unit)) {
        return `${value} ${pq.unit}`;
    }
    
    return `${value}${pq.unit}`;
}
