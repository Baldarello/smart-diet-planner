import { MealPlanData, DayPlan, Meal, ShoppingListCategory, ShoppingListItem, MealItem } from '../types';
import { parseQuantity, formatQuantity, ParsedQuantity } from '../utils/quantityParser';

const DAY_KEYWORDS = ['LUNEDI', 'MARTEDI', 'MERCOLEDI', 'GIOVEDI', 'VENERDI', 'SABATO', 'DOMENICA'];
const MEAL_KEYWORDS = ['COLAZIONE', 'SPUNTINO', 'PRANZO', 'MERENDA', 'CENA'];
const MEAL_TIMES: { [key: string]: string } = {
  COLAZIONE: '08:00',
  SPUNTINO: '10:30',
  PRANZO: '13:00',
  MERENDA: '16:30',
  CENA: '19:30',
};
const IGNORED_LINES = ['OPPURE', 'IN ALTERNATIVA'];

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
function categorizeIngredient(name: string): string {
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
 * Generates a categorized shopping list by aggregating all ingredients from a weekly plan.
 * @param plan The weekly meal plan.
 * @returns A categorized shopping list.
 */
export function generateShoppingList(plan: DayPlan[]): ShoppingListCategory[] {
    const aggregatedMap: Map<string, { quantity: ParsedQuantity, category: string }> = new Map();

    plan.forEach(day => {
        day.meals.forEach(meal => {
            meal.items.forEach(item => {
                const quantity = parseQuantity(item.fullDescription);
                if (!quantity || quantity.value <= 0) return; // Skip items without a parsable quantity

                const existing = aggregatedMap.get(item.ingredientName);
                if (existing) {
                    if (existing.quantity.unit === quantity.unit) {
                        existing.quantity.value += quantity.value;
                    } else {
                        // If units are different (e.g., 'g' vs 'cucchiaio'), combine them as a string
                        const newQuantityString = `${formatQuantity(existing.quantity)}, ${formatQuantity(quantity)}`;
                        existing.quantity = { value: 0, unit: newQuantityString }; 
                    }
                } else {
                    aggregatedMap.set(item.ingredientName, {
                        quantity: quantity,
                        category: categorizeIngredient(item.ingredientName)
                    });
                }
            });
        });
    });

    const categoryMap: Map<string, ShoppingListItem[]> = new Map();
    aggregatedMap.forEach((value, key) => {
        if (!categoryMap.has(value.category)) {
            categoryMap.set(value.category, []);
        }
        categoryMap.get(value.category)!.push({
            item: key,
            quantity: value.quantity.value === 0 ? value.quantity.unit : formatQuantity(value.quantity)
        });
    });

    const shoppingList: ShoppingListCategory[] = [];
    categoryMap.forEach((items, category) => {
        shoppingList.push({ category, items });
    });

    shoppingList.sort((a, b) => a.category.localeCompare(b.category));
    return shoppingList;
}

/**
 * Parses the full text content of a diet PDF into structured meal plan and shopping list data.
 * @param text The raw text from the PDF.
 * @returns Structured meal plan data.
 */
export function parsePdfText(text: string): MealPlanData {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const weeklyPlan: DayPlan[] = [];
    let currentDay: DayPlan | null = null;
    let currentMeal: Meal | null = null;

    // Regex to detect lines starting with list markers (bullets, numbers)
    const ingredientStartRegex = /^(\s*[*•]|\d+)/;
    // Regex to strip bullet points. It's safe to run on non-bullet lines.
    const bulletStripRegex = /^(\s*[*•]|\d+[.)])\s+/;

    lines.forEach(line => {
        const upperLine = line.toUpperCase();
        
        // State change: New Day
        if (DAY_KEYWORDS.includes(upperLine)) {
            currentDay = { day: line, meals: [] };
            weeklyPlan.push(currentDay);
            currentMeal = null;
            return;
        }
        
        // State change: New Meal
        if (currentDay && MEAL_KEYWORDS.includes(upperLine)) {
            currentMeal = {
                name: line,
                items: [],
                done: false,
                time: MEAL_TIMES[upperLine] || '12:00',
            };
            currentDay.meals.push(currentMeal);
            return;
        }
        
        // Ignore separator lines
        if (IGNORED_LINES.includes(upperLine)) {
            return;
        }

        // Process line within a meal context
        if (currentMeal) {
            const isIngredient = ingredientStartRegex.test(line);

            if (isIngredient) {
                // This line is an ingredient. Clean the bullet point if it exists.
                const description = line.replace(bulletStripRegex, '').trim();
                // Fallback to original line if stripping results in an empty string
                const contentLine = description || line; 
                
                // Split by ';' or '•' to handle multiple ingredients on the same line.
                // Fix: Replace `replaceAll` with `replace` using a global regex for wider compatibility.
                const ingredients = contentLine.replace(/•/g,"").split(/[;]/);
                
                ingredients.forEach(ingredientText => {
                    const trimmedText = ingredientText.trim();
                    if (trimmedText) { // Avoid adding empty items
                        const { ingredientName } = extractIngredientInfo(trimmedText);
                        currentMeal.items.push({
                            fullDescription: trimmedText,
                            ingredientName: ingredientName || trimmedText,
                            used: false
                        });
                    }
                });

            } else if (!currentMeal.title && currentMeal.items.length === 0) {
                // This line is not an ingredient and we don't have a title or any items yet.
                // It's likely the title of the dish (e.g., "Polpette di ricotta veg").
                currentMeal.title = line;
            }
            // Otherwise, ignore the line (it could be a note, instruction, etc.)
        }
    });

    const shoppingList = generateShoppingList(weeklyPlan);
    return { weeklyPlan, shoppingList };
}