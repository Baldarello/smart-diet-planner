
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

export function parseQuantity(description: string): ParsedQuantity | null {
    if (!description) return null;
    const desc = normalizeString(description);

    if (/^\d+.*-/.test(desc)) {
        return null;
    }

    const words = desc.split(/\s+/);
    if (numberWords[words[0]]) {
        return {
            value: numberWords[words[0]],
            unit: words.length > 1 ? words[1] : 'unità'
        };
    }

    const standardMatch = desc.match(/^(\d+[\.,]?\d*)\s*([a-zA-ZÀ-ú]+)?/);
    
    if (standardMatch) {
        const value = parseFloat(standardMatch[1].replace(',', '.'));
        const unit = (standardMatch[2] || 'unità').trim();
        return { value, unit };
    }

    return null;
}

export function formatQuantity(value: number | null, unit: string): string {
    if (value === null) return '-';
    const roundedValue = Math.round(value * 100) / 100;
    return `${roundedValue} ${unit}`;
}

export function subtractQuantities(pantryValue: number, mealDescription: string, reverse: boolean = false): number {
    const parsed = parseQuantity(mealDescription);
    if (!parsed || parsed.value === null) return pantryValue;
    
    const factor = reverse ? -1 : 1;
    const newValue = pantryValue - (parsed.value * factor);
    return Math.max(0, newValue);
}

export function splitQuantityAndName(description: string): { quantity: string | null; name: string } {
    if (!description) {
        return { quantity: null, name: '' };
    }
    const desc = description.trim();

    const words = desc.split(/\s+/);
    if (Object.prototype.hasOwnProperty.call(numberWords, words[0].toLowerCase())) {
        let quantity = words[0];
        let nameStartIndex = 1;
        if (words.length > 1 && !['di', 'd\''].includes(words[1].toLowerCase())) {
            quantity += ` ${words[1]}`;
            nameStartIndex = 2;
        }
        let name = words.slice(nameStartIndex).join(' ');
        if (name.toLowerCase().startsWith('di ')) name = name.substring(3).trim();
        else if (name.toLowerCase().startsWith("d'")) name = name.substring(2).trim();
        return { quantity, name: name.charAt(0).toUpperCase() + name.slice(1) };
    }

    const match = desc.match(/^(\d+[\.,]?\d*\s*[a-zA-ZÀ-ú\/]+|\d+[\.,]?\d*)\s*(.*)/);

    if (match) {
        let quantity = match[1].trim();
        const quantityMatch = quantity.match(/^(\d+[\.,]?\d*)([a-zA-ZÀ-ú\/]+)$/);
        if (quantityMatch) {
            const unitPart = quantityMatch[2];
            if (unitPart.length > 2) {
                quantity = `${quantityMatch[1]} ${unitPart}`;
            }
        }
        let name = match[2].trim();
        if (name.toLowerCase().startsWith('di ')) {
            name = name.substring(3).trim();
        } else if (name.toLowerCase().startsWith("d'")) {
            name = name.substring(2).trim();
        }
        name = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';
        return { quantity, name };
    }

    return { quantity: null, name: description };
}
