

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
 * Parses a quantity string (e.g., "100g", "1 banana") into a value and unit.
 * It will return null for complex strings with separators or ranges (e.g., "1-2 noci", "120g - Petto di Pollo")
 * to ensure they are treated as a single, un-parsable description.
 */
export function parseQuantity(description: string): ParsedQuantity | null {
    if (!description) return null;
    const desc = normalizeString(description);

    // Overhauled check for ranges or hyphenated descriptions to prevent splitting.
    // This will catch: "1-2", "1 - 2", "120g - item", "1 - item".
    // It checks if a line starting with a number contains a hyphen anywhere after it.
    // This is a clear indicator that it's a range or a description, not a simple quantity.
    if (/^\d+.*-/.test(desc)) {
        return null;
    }

    // Handle number words like "un vasetto", "mezza cipolla"
    const words = desc.split(' ');
    if (numberWords[words[0]]) {
        return {
            value: numberWords[words[0]],
            unit: words.slice(1).join(' ') || words[0]
        };
    }

    // Regex to capture a leading number and the rest of the string.
    const standardMatch = desc.match(/^(\d+[\.,]?\d*)\s*(.*)/);
    
    if (standardMatch) {
        const value = parseFloat(standardMatch[1].replace(',', '.'));
        const unit = (standardMatch[2] || '').trim() || 'units';
        return { value, unit };
    }

    // If no quantity found, assume it's a non-quantifiable item
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