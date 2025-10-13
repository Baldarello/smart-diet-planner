import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { MealPlanData, DayPlan, ShoppingListCategory, Meal, NutritionInfo, ShoppingListItem } from '../types';

if (!process.env.GEMINI_API_KEY) {
  const errorMsg = "FATAL: GEMINI_API_KEY environment variable not set. The application cannot start without it.";
  console.error(errorMsg);
  throw new Error(errorMsg);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
    {
      category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
      threshold: HarmBlockThreshold.BLOCK_LOW_AND_ABOVE,
    },
];

const mealItemSchema = {
  type: Type.OBJECT,
  properties: {
    ingredientName: { type: Type.STRING, description: "The clean, base name of the ingredient (e.g., 'Yogurt di soia', 'Riso venere'). This name must be consistent for the same ingredient across the entire plan to allow for correct pantry tracking." },
    fullDescription: { type: Type.STRING, description: "The complete, original text for the ingredient, including quantity and preparation notes (e.g., '1 vasetto di yogurt di soia bianco (da 125g)', '60g di riso venere')." }
  },
  required: ['ingredientName', 'fullDescription']
};

const nutritionSchema = {
    type: Type.OBJECT,
    properties: {
        carbs: { type: Type.NUMBER, description: "Estimated carbohydrates in grams." },
        protein: { type: Type.NUMBER, description: "Estimated protein in grams." },
        fat: { type: Type.NUMBER, description: "Estimated fat in grams." },
        calories: { type: Type.NUMBER, description: "Estimated total calories (kcal)." }
    },
    required: ['carbs', 'protein', 'fat', 'calories']
};

const mealSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Il nome del pasto (COLAZIONE, SPUNTINO, PRANZO, MERENDA, CENA)." },
    title: { type: Type.STRING, description: "Il titolo o nome specifico del piatto, se presente (es. 'Riso venere con ceci, carote e fagiolini')." },
    procedure: { type: Type.STRING, description: "La ricetta o il procedimento facoltativo per preparare il piatto. Conserva questo campo se fornito nell'input." },
    time: { type: Type.STRING, description: "Un orario suggerito per il pasto in formato HH:MM (es. '08:00', '13:00'). Scegli un orario logico in base al nome del pasto." },
    items: {
      type: Type.ARRAY,
      items: mealItemSchema,
      description: "L'elenco degli alimenti e ingredienti. Ogni elemento deve essere un oggetto strutturato con 'ingredientName' e 'fullDescription'."
    }
  },
  required: ['name', 'items', 'time']
};

const mealSchemaWithNutrition = {
    ...mealSchema,
    properties: {
        ...mealSchema.properties,
        nutrition: {
            ...nutritionSchema,
            description: "Stima nutrizionale del pasto (carboidrati, proteine, grassi in grammi e calorie totali in kcal)."
        }
    }
}

const daySchema = {
  type: Type.OBJECT,
  properties: {
    day: { type: Type.STRING, description: "Il nome del giorno della settimana in maiuscolo (LUNEDI, MARTEDI, etc.)." },
    meals: {
      type: Type.ARRAY,
      items: mealSchema,
      description: "Un elenco di tutti i pasti per quel giorno."
    }
  },
  required: ['day', 'meals']
};

const daySchemaWithNutrition = {
    ...daySchema,
    properties: {
        ...daySchema.properties,
        meals: {
            type: Type.ARRAY,
            items: mealSchemaWithNutrition,
            description: "Un elenco di tutti i pasti per quel giorno, completi di dati nutrizionali."
        }
    }
}

const weeklyPlanSchemaWithNutrition = {
    type: Type.ARRAY,
    items: daySchemaWithNutrition
};


const shoppingItemSchema = {
  type: Type.OBJECT,
  properties: {
    item: { type: Type.STRING, description: "The name of the ingredient to purchase. It must match the 'ingredientName' used in the weekly plan." },
    quantityValue: { type: Type.NUMBER, description: "The total aggregated numeric quantity needed for the entire week. For non-numeric quantities (e.g., 'q.b.'), omit this field or use 0." },
    quantityUnit: { type: Type.STRING, description: "The unit of measurement for the quantity (e.g., 'g', 'cucchiaio', 'pezzo/i'). For non-numeric quantities, this can describe the amount (e.g., 'q.b.')." }
  },
  required: ['item', 'quantityUnit']
};

const shoppingCategorySchema = {
  type: Type.OBJECT,
  properties: {
    category: { type: Type.STRING, description: "Il nome della categoria di cibo (es. 'Frutta', 'Verdura e Ortaggi')." },
    items: {
      type: Type.ARRAY,
      items: shoppingItemSchema,
      description: "L'elenco degli ingredienti per questa categoria."
    }
  },
  required: ['category', 'items']
};

const shoppingListSchema = {
    type: Type.ARRAY,
    items: shoppingCategorySchema
};

const planAndListSchema = {
    type: Type.OBJECT,
    properties: {
        weeklyPlan: weeklyPlanSchemaWithNutrition,
        shoppingList: shoppingListSchema,
    },
    required: ['weeklyPlan', 'shoppingList']
};

export function isQuotaError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return message.includes('429') || message.includes('quota') || message.includes('resource has been exhausted');
    }
    return false;
}

export async function getPlanDetailsAndShoppingList(plan: DayPlan[]): Promise<{ weeklyPlan: DayPlan[], shoppingList: ShoppingListCategory[] } | null> {
    const prompt = `
Sei un assistente nutrizionale esperto. Ti viene fornito un oggetto JSON che rappresenta un piano alimentare settimanale. Le descrizioni degli ingredienti ('fullDescription') potrebbero essere state modificate.

I TUOI COMPITI SONO:
1.  **ANALISI COMPLETA DEL PIANO**: Analizza l'intero piano. Per ogni ingrediente:
    *   Assicurati che \`ingredientName\` sia il nome pulito e base dell'ingrediente. Lo stesso ingrediente deve avere lo stesso \`ingredientName\` ovunque.
2.  **ORARI, PROCEDIMENTO E NUTRIZIONE**: Per OGNI pasto:
    *   Assegna un orario logico in \`time\` (formato HH:MM).
    *   Se è fornito un campo \`procedure\`, conservalo nel risultato.
    *   Fornisci una stima nutrizionale (carbs, protein, fat, calories) nel campo \`nutrition\`.
3.  **LISTA DELLA SPESA**: Basandoti sul piano aggiornato, genera una lista della spesa aggregata e categorizzata.
    *   Il campo "item" nella lista deve corrispondere esattamente all'"ingredientName" del piano.
    *   Per ogni articolo, separa la quantità numerica (\`quantityValue\`) dall'unità di misura (\`quantityUnit\`). Se una quantità non è numerica (es. "q.b."), ometti \`quantityValue\` e usa \`quantityUnit\` per la descrizione.

**REGOLE IMPORTANTI:**
*   Restituisci un singolo oggetto JSON contenente sia il piano settimanale aggiornato (\`weeklyPlan\`) sia la lista della spesa (\`shoppingList\`).
*   Fornisci l'output **esclusivamente** in formato JSON, seguendo lo schema specificato.

JSON del piano alimentare da elaborare:
---
${JSON.stringify(plan)}
---
`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: planAndListSchema,
                temperature: 0.1,
                // Fix: `safetySettings` must be a property of the `config` object.
                safetySettings,
            },
        });
        if (!response.text) {
            throw new Error("Gemini API returned an empty response for plan details and shopping list generation.");
        }
        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString) as { weeklyPlan: DayPlan[], shoppingList: ShoppingListCategory[] };

        // Post-process the shopping list to ensure data integrity with the app's types.
        if (result.shoppingList) {
            result.shoppingList.forEach(category => {
                category.items.forEach((item: Partial<ShoppingListItem>) => {
                    if (item.quantityValue === undefined) {
                        item.quantityValue = null;
                    }
                });
            });
        }

        return result as { weeklyPlan: DayPlan[], shoppingList: ShoppingListCategory[] };
    } catch (error) {
        console.error("Error calling Gemini API for plan details and shopping list:", error);
        throw error;
    }
}