import { MealPlanData, DayPlan, Meal, ShoppingListCategory, ShoppingListItem, MealItem } from '../types';
import { parseQuantity, formatQuantity, ParsedQuantity } from '../utils/quantityParser';

export const DAY_KEYWORDS = ['LUNEDI', 'MARTEDI', 'MERCOLEDI', 'GIOVEDI', 'VENERDI', 'SABATO', 'DOMENICA'];
export const MEAL_KEYWORDS = ['COLAZIONE', 'SPUNTINO', 'PRANZO', 'MERENDA', 'CENA'];
export const MEAL_TIMES: { [key: string]: string } = {
  COLAZIONE: '08:00',
  SPUNTINO: '10:30',
  PRANZO: '13:00',
  MERENDA: '16:30',
  CENA: '19:30',
};

/**
 * Extracts a clean, consistent ingredient name from a full description string.
 * @param description The full text of the meal item, e.g., "1 vasetto di yogurt di soia (da 125g)"
 * @returns An object containing the cleaned ingredient name.
 */
export function extractIngredientInfo(description: string): Pick<MealItem, 'ingredientName'> {
  let name = description.toLowerCase();
  // Remove quantities and common units at the start of the string
  name = name.replace(/^[\d\s.,-]+(g|kg|ml|l|gr|gr|cucchiaio|cucchiai|vasetto|fetta|fette|scatoletta|bicchiere|cucchiaino)?\s*(di)?\s*/, '');
  // Remove parenthetical notes
  name = name.replace(/\(.*?\)/g, '');
  // Remove common articles and prepositions that are often noise
  name = name.replace(/\b(un|uno|una|di|d'|del|dello|della|dei|degli|delle|con|e|a|al)\b/g, '');
  // Clean up extra whitespace and capitalize
  name = name.replace(/\s+/g, ' ').trim();
  name = name ? name.charAt(0).toUpperCase() + name.slice(1) : '';

  // If cleaning results in an empty string, fall back to the original description
  if (!name) {
    name = description;
  }

  return { ingredientName: name };
}

/**
 * Assigns an ingredient to a shopping list category based on keywords.
 * @param name The clean ingredient name.
 * @returns A category name string.
 */
export function categorizeIngredient(name: string): string {
    const lowerName = name.toLowerCase();
    
    if (['frutta', 'mela', 'banana', 'arancia', 'pera', 'fragole', 'kiwi', 'pesca', 'limone', 'frutti'].some(k => lowerName.includes(k))) return 'Frutta';
    if (['verdura', 'ortaggi', 'insalata', 'pomodoro', 'carota', 'zucchina', 'melanzana', 'spinaci', 'broccoli', 'cipolla', 'aglio', 'peperone', 'fagiolini'].some(k => lowerName.includes(k))) return 'Verdura e Ortaggi';
    if (['pane', 'pasta', 'riso', 'cereali', 'patate', 'farina', 'biscottate', 'gallette', 'couscous', 'quinoa', 'farro'].some(k => lowerName.includes(k))) return 'Carboidrati e Cereali';
    if (['carne', 'pollo', 'manzo', 'tacchino', 'pesce', 'tonno', 'salmone', 'uova', 'uovo', 'legumi', 'ceci', 'fagioli', 'lenticchie', 'tofu', 'seitan', 'sgombro'].some(k => lowerName.includes(k))) return 'Proteine (Carne, Pesce, Legumi)';
    if (['latte', 'yogurt', 'formaggio', 'ricotta', 'parmigiano', 'mozzarella'].some(k => lowerName.includes(k))) return 'Latticini e Derivati';
    if (['olio', 'burro', 'noci', 'mandorle', 'semi', 'avocado'].some(k => lowerName.includes(k))) return 'Grassi e Frutta Secca';
    if (['acqua', 'caffè', 'the'].some(k => lowerName.includes(k))) return 'Bevande';

    return 'Altro';
}

/**
 * A simple heuristic function to convert common Italian plural nouns to singular.
 * This helps in aggregating ingredients like "mela" and "mele".
 * @param word The word to singularize.
 * @returns The singular form of the word.
 */
export function singularize(word: string): string {
    const s = word.toLowerCase().trim();

    if (['g', 'kg', 'ml', 'l'].includes(s)) {
        return s;
    }
    
    const exceptions: { [key: string]: string } = {
        'uova': 'uovo',
        'cucchiai': 'cucchiaio',
        'bicchieri': 'bicchiere',
        'vasetti': 'vasetto',
        'fette': 'fetta',
        'gallette': 'galletta',
        'biscottate': 'biscottata',
        'polpette': 'polpetta',
        'ceci': 'ceci',
        'kiwi': 'kiwi',
    };
    if (exceptions[s]) {
        return exceptions[s];
    }
    
    const singularEWords = ['pesce', 'carne', 'latte', 'pane', 'the', 'zenzero'];
    if (singularEWords.includes(s)) {
        return s;
    }

    if (s.endsWith('i') && s.length > 3) {
        return s.slice(0, -1) + 'o'; // e.g., pomodori -> pomodoro
    }
    if (s.endsWith('e') && s.length > 3) {
        return s.slice(0, -1) + 'a'; // e.g., mele -> mela
    }
    
    return s;
}