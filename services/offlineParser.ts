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
                const ingredientName = item.ingredientName;
                const existing = aggregatedMap.get(ingredientName);

                // If quantity is not parsable (e.g., a range "1-2" or text "q.b."), treat it as a string.
                if (!quantity) {
                    if (existing) {
                        const existingDesc = existing.quantity.value === 0 ? existing.quantity.unit : formatQuantity(existing.quantity);
                        existing.quantity = { value: 0, unit: `${existingDesc}, ${item.fullDescription}` };
                    } else {
                        aggregatedMap.set(ingredientName, {
                            quantity: { value: 0, unit: item.fullDescription },
                            category: categorizeIngredient(ingredientName)
                        });
                    }
                    return; // Continue to next item
                }

                // If quantity is zero, ignore it.
                if (quantity.value <= 0) return;

                // Standard logic for numeric quantities
                if (existing) {
                    // If the existing entry is numeric and units match, sum the values.
                    if (existing.quantity.value !== 0 && existing.quantity.unit === quantity.unit) {
                        existing.quantity.value += quantity.value;
                    } else {
                        // Otherwise, concatenate as a string.
                        const existingDesc = existing.quantity.value === 0 ? existing.quantity.unit : formatQuantity(existing.quantity);
                        const newDesc = `${existingDesc}, ${formatQuantity(quantity)}`;
                        existing.quantity = { value: 0, unit: newDesc };
                    }
                } else {
                    // Add the new numeric item.
                    aggregatedMap.set(ingredientName, {
                        quantity: quantity,
                        category: categorizeIngredient(ingredientName)
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
 * Finds lines that repeat across multiple pages, likely headers or footers.
 * @param pageTexts An array of strings, where each string is the text content of a page.
 * @param numPages The total number of pages.
 * @returns A Set of strings containing the detected header/footer lines.
 */
function findRepeatedLines(pageTexts: string[], numPages: number): Set<string> {
    const lineCounts = new Map<string, number>();
    const repeatedLines = new Set<string>();
    
    if (numPages <= 1) {
        return repeatedLines;
    }

    const pageLines = pageTexts.map(text => 
        text.split('\n').map(l => l.trim()).filter(l => l.length > 3)
    );

    pageLines.forEach(lines => {
        const uniqueLinesOnPage = new Set(lines);
        uniqueLinesOnPage.forEach(line => {
            lineCounts.set(line, (lineCounts.get(line) || 0) + 1);
        });
    });

    lineCounts.forEach((count, line) => {
        // Heuristic: A line is a header/footer if it appears on more than half of the pages.
        if (count > numPages / 2) {
            repeatedLines.add(line);
        }
    });

    return repeatedLines;
}

/**
 * Processes a block of text lines belonging to a single meal to extract its title and ingredients.
 * @param mealName The name of the meal (e.g., "COLAZIONE").
 * @param contentLines The lines of text between this meal keyword and the next.
 * @returns A structured Meal object.
 */
function processMealBlock(mealName: string, contentLines: string[]): Meal {
    const meal: Meal = {
        name: mealName,
        items: [],
        done: false,
        time: MEAL_TIMES[mealName] || '12:00',
    };

    const ingredientStartRegex = /^(\s*[-*•]|\d+)/;
    const bulletStripRegex = /^(\s*[*•]|\d+[.)])\s+/;
    let hasFoundIngredients = false;

    contentLines.forEach(line => {
        if (IGNORED_LINES.includes(line.toUpperCase())) return;
        
        const isIngredientLine = ingredientStartRegex.test(line);

        if (isIngredientLine) {
            hasFoundIngredients = true;
            const description = line.replace(bulletStripRegex, '').trim();
            const contentLine = description || line;
            
            // Split by semicolon ONLY to handle multiple ingredients on the same line.
            const ingredients = contentLine.split(';');
            
            ingredients.forEach(ingredientText => {
                // Remove any bullet characters but do not split by them.
                const cleanedIngredientText = ingredientText.replace(/•/g, '').trim();
                if (cleanedIngredientText) {
                    const { ingredientName } = extractIngredientInfo(cleanedIngredientText);
                    meal.items.push({
                        fullDescription: cleanedIngredientText,
                        ingredientName: ingredientName || cleanedIngredientText,
                        used: false,
                    });
                }
            });
        } 
        // A non-ingredient line before any ingredients have been found is the title
        else if (!meal.title && !hasFoundIngredients) {
            meal.title = line;
        }
    });
    
    return meal;
}

/**
 * Parses the text content from a diet PDF's pages into structured meal plan and shopping list data.
 * @param pageTexts An array of strings, where each string is the raw text from one page of the PDF.
 * @returns Structured meal plan data.
 */
export function parsePdfText(pageTexts: string[]): MealPlanData {
    const numPages = pageTexts.length;
    const repeatedLines = findRepeatedLines(pageTexts, numPages);
    
    const initialLines = pageTexts
        .flatMap(text => text.split('\n'))
        .map(line => line.trim())
        .filter(line => line.length > 0 && !repeatedLines.has(line));
    
    // New, more robust logic to merge multi-line ingredients pivoted by a hyphen.
    const mergedLines: string[] = [];
    for (let i = 0; i < initialLines.length; i++) {
        const currentLine = initialLines[i];

        // If a line is just a hyphen, it's a continuation marker.
        if (currentLine.trim() === '-') {
            const prevLine = mergedLines.pop(); // Get the previously added line.
            const nextLine = initialLines[i + 1]; // Look ahead to the next line.

            if (prevLine && nextLine) {
                // Merge the previous line, a hyphen, and the next line.
                const merged = `${prevLine}-${nextLine}`;
                mergedLines.push(merged);
                i++; // Important: skip the next line since it has been merged.
            } else if (prevLine) {
                // This case handles a hyphen at the very end of the text. Put the previous line back.
                mergedLines.push(prevLine);
            }
            // If there's no previous line, the hyphen is at the start and can be ignored.
        } else {
            mergedLines.push(currentLine);
        }
    }
    const allLines = mergedLines;
    
    const weeklyPlan: DayPlan[] = [];
    let currentDay: DayPlan | null = null;
    let mealBlocks: { mealName: string, contentLines: string[] }[] = [];

    allLines.forEach(line => {
        const upperLine = line.toUpperCase();
        
        const dayKeyword = DAY_KEYWORDS.find(keyword => upperLine.includes(keyword));
        if (dayKeyword) {
            if (currentDay && mealBlocks.length > 0) {
                mealBlocks.forEach(block => {
                    const meal = processMealBlock(block.mealName, block.contentLines);
                    if (meal.items.length > 0 || meal.title) {
                        currentDay!.meals.push(meal);
                    }
                });
            }
            currentDay = { day: dayKeyword, meals: [] };
            weeklyPlan.push(currentDay);
            mealBlocks = [];
            return;
        }

        if (!currentDay) {
            return;
        }

        const mealKeyword = MEAL_KEYWORDS.find(keyword => upperLine.includes(keyword));
        if (mealKeyword) {
            mealBlocks.push({ mealName: mealKeyword, contentLines: [] });
            return;
        }

        if (mealBlocks.length > 0) {
            mealBlocks[mealBlocks.length - 1].contentLines.push(line);
        }
    });

    if (currentDay && mealBlocks.length > 0) {
        mealBlocks.forEach(block => {
            const meal = processMealBlock(block.mealName, block.contentLines);
            if (meal.items.length > 0 || meal.title) {
                currentDay!.meals.push(meal);
            }
        });
    }

    const shoppingList = generateShoppingList(weeklyPlan);
    return { weeklyPlan, shoppingList };
}