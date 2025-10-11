

export interface ParsedQuantity {
  value: number | null;
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
 * It intelligently extracts the number and the word immediately following it as the unit.
 * Returns null for complex strings with ranges or if no parsable number is found at the start.
 */
export function parseQuantity(description: string): ParsedQuantity | null {
    if (!description) return null;
    const desc = normalizeString(description);

    // Skip ranges or hyphenated descriptions to avoid incorrect parsing.
    if (/^\d+.*-/.test(desc)) {
        return null;
    }

    // Handle number words like "un vasetto", "mezza cipolla"
    const words = desc.split(/\s+/);
    if (numberWords[words[0]]) {
        return {
            value: numberWords[words[0]],
            unit: words.length > 1 ? words[1] : 'unità'
        };
    }

    // Regex to capture a leading number and the optional word immediately after it.
    const standardMatch = desc.match(/^(\d+[\.,]?\d*)\s*([a-zA-ZÀ-ú]+)?/);
    
    if (standardMatch) {
        const value = parseFloat(standardMatch[1].replace(',', '.'));
        // The unit is the word following the number, or 'units' if it's just a number.
        const unit = (standardMatch[2] || 'unità').trim();
        return { value, unit };
    }

    return null;
}

/**
 * Formats a parsed quantity back into a string.
 */
export function formatQuantity(value: number | null, unit: string): string {
    if (value === null) return '-';
    // Round to 2 decimal places to avoid floating point issues
    const roundedValue = Math.round(value * 100) / 100;
    return `${roundedValue} ${unit}`;
}
