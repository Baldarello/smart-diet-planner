import { GoogleGenAI, Type } from "@google/genai";
import { MealPlanData, DayPlan, ShoppingListCategory, Meal, NutritionInfo } from '../types';

if (!process.env.GEMINI_API_KEY) {
  const errorMsg = "GEMINI_API_KEY environment variable not set.";
  alert(errorMsg);
  throw new Error(errorMsg);
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

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

const weeklyPlanSchema = {
    type: Type.ARRAY,
    items: daySchema
};

const weeklyPlanSchemaWithNutrition = {
    type: Type.ARRAY,
    items: daySchemaWithNutrition
};


const shoppingItemSchema = {
  type: Type.OBJECT,
  properties: {
    item: { type: Type.STRING, description: "Il nome dell'ingrediente da acquistare. Deve corrispondere all''ingredientName' usato nel piano settimanale." },
    quantity: { type: Type.STRING, description: "La quantità totale aggregata necessaria per l'intera settimana, incluse le unità di misura (es. '250g', '2 cucchiai', '3')." }
  },
  required: ['item', 'quantity']
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

export async function parseMealStructure(text: string): Promise<DayPlan[] | null> {
    const prompt = `
Sei un assistente nutrizionale esperto. Il tuo compito è analizzare il testo grezzo estratto da un PDF di un piano dietetico e strutturarlo in un formato JSON preciso.

COMPITI:
1.  **ANALIZZA E STRUTTURA**: Leggi il testo e crea un piano settimanale da LUNEDI a DOMENICA. Per ogni giorno, identifica i pasti (COLAZIONE, PRANZO, SPUNTINO, MERENDA, CENA).
2.  **ESTRAI TITOLI E INGREDIENTI**: Per ogni pasto:
    *   **Titolo del Piatto (\`title\`)**: Identifica se c'è un nome specifico per il piatto. A volte si trova sulla stessa riga del nome del pasto (es. "PRANZO Riso venere con ceci...").
    *   **Lista Ingredienti (\`items\`)**: Estrai solo le righe che sono chiaramente ingredienti, di solito precedute da un punto elenco (•, -, *) o un numero. Per ogni ingrediente, fornisci:
        *   \`fullDescription\`: Il testo originale completo, incluse quantità e note (es. "60g di riso venere", "2-3 cucchiai di hummus di ceci (fatto in casa...)"). Mantieni l'intera descrizione, anche se è lunga.
        *   \`ingredientName\`: Il nome pulito e base dell'ingrediente (es. "Riso venere", "Hummus di ceci"). Sii coerente per lo stesso ingrediente in tutto il piano.
3.  **ASSEGNA ORARI**: Assegna un orario logico in formato HH:MM (\`time\`) a ogni pasto (es. COLAZIONE: "08:00").

REGOLE IMPORTANTI E COSA IGNORARE:
*   **IGNORA I PROCEDIMENTI**: Ignora completamente qualsiasi sezione o paragrafo intitolato "Procedimento:" o che descrive chiaramente le istruzioni di cottura. Queste non sono liste di ingredienti.
*   **GESTISCI CASI SPECIALI**: Se un pasto è descritto come "Libera" (es. "CENA: Libera"), imposta questo come \`title\` e lascia la lista \`items\` vuota.
*   **NON** calcolare valori nutrizionali né generare una lista della spesa in questa fase.
*   L'output deve essere **esclusivamente** un array JSON che segue lo schema fornito. Non includere testo o spiegazioni aggiuntive.

Testo del PDF da analizzare:
---
${text}
---
`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: weeklyPlanSchema,
            },
        });
        if (!response.text) {
            throw new Error("Gemini API returned an empty or invalid response for plan structure parsing.");
        }
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as DayPlan[];
    } catch (error) {
        console.error("Error calling Gemini API for plan structure parsing:", error);
        throw error;
    }
}

export async function getNutritionForMeal(meal: Pick<Meal, 'title' | 'items'>): Promise<NutritionInfo | null> {
    if (!meal.items || meal.items.length === 0) return null;

    const prompt = `
Sei un esperto di nutrizione. Analizza gli ingredienti del seguente pasto e fornisci una stima accurata dei suoi valori nutrizionali (carboidrati, proteine, grassi in grammi e calorie totali in kcal).

Dettagli del pasto:
---
${JSON.stringify({ title: meal.title, items: meal.items.map(i => i.fullDescription) })}
---

Fornisci la risposta **esclusivamente** in formato JSON, seguendo lo schema specificato.
`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: nutritionSchema,
            },
        });
         if (!response.text) {
            console.warn("Gemini API returned empty response for nutrition analysis.");
            return null;
        }
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as NutritionInfo;
    } catch (error) {
        console.error("Error calling Gemini API for nutrition analysis:", error);
        // Re-throw the error so the calling function can handle it, especially for quota errors.
        throw error;
    }
}

export async function getPlanDetailsAndShoppingList(plan: DayPlan[]): Promise<{ weeklyPlan: DayPlan[], shoppingList: ShoppingListCategory[] } | null> {
    const prompt = `
Sei un assistente nutrizionale esperto. Ti viene fornito un oggetto JSON che rappresenta un piano alimentare settimanale. Le descrizioni degli ingredienti ('fullDescription') potrebbero essere state modificate.

I TUOI COMPITI SONO:
1.  **ANALISI COMPLETA DEL PIANO**: Analizza l'intero piano. Per ogni ingrediente:
    *   Assicurati che \`ingredientName\` sia il nome pulito e base dell'ingrediente. Lo stesso ingrediente deve avere lo stesso \`ingredientName\` ovunque.
2.  **ORARI E NUTRIZIONE**: Per OGNI pasto:
    *   Assegna un orario logico in \`time\` (formato HH:MM).
    *   Fornisci una stima nutrizionale (carbs, protein, fat, calories) nel campo \`nutrition\`.
3.  **LISTA DELLA SPESA**: Basandoti sul piano aggiornato, genera una lista della spesa aggregata e categorizzata.
    *   Il campo "item" nella lista deve corrispondere esattamente all'"ingredientName" del piano.

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
            },
        });
        if (!response.text) {
            throw new Error("Gemini API returned an empty response for plan details and shopping list generation.");
        }
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as { weeklyPlan: DayPlan[], shoppingList: ShoppingListCategory[] };
    } catch (error) {
        console.error("Error calling Gemini API for plan details and shopping list:", error);
        throw error;
    }
}