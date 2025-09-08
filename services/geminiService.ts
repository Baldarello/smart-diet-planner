import { GoogleGenAI, Type } from "@google/genai";
import { MealPlanData, DayPlan } from '../types';

if (!process.env.API_KEY) {
  const errorMsg = "API_KEY environment variable not set.";
  alert(errorMsg);
  throw new Error(errorMsg);
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    },
    nutrition: {
        ...nutritionSchema,
        description: "Stima nutrizionale del pasto (carboidrati, proteine, grassi in grammi e calorie totali in kcal)."
    }
  },
  required: ['name', 'items', 'time']
};

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

const finalSchema = {
  type: Type.OBJECT,
  properties: {
    weeklyPlan: {
      type: Type.ARRAY,
      items: daySchema,
      description: "Il piano alimentare completo per l'intera settimana, da LUNEDI a DOMENICA."
    },
    shoppingList: {
      type: Type.ARRAY,
      items: shoppingCategorySchema,
      description: "La lista della spesa completa, con gli ingredienti raggruppati per categoria."
    }
  },
  required: ['weeklyPlan', 'shoppingList']
};

export async function regeneratePlanData(plan: DayPlan[]): Promise<MealPlanData | null> {
    const prompt = `
Sei un assistente nutrizionale specializzato. Ti viene fornito un oggetto JSON che rappresenta un piano alimentare settimanale. Le descrizioni degli ingredienti ('fullDescription') potrebbero essere state modificate dall'utente.

I TUOI COMPITI SONO:
1.  **RIPULIRE E STANDARDIZZARE**: Analizza l'intero piano. Per ogni ingrediente, assicurati che il campo \`ingredientName\` sia il nome pulito e base dell'ingrediente. Lo stesso ingrediente deve avere lo stesso \`ingredientName\` ovunque.
2.  **ASSEGNARE ORARI**: Per OGNI pasto, assegna un orario logico e appropriato nel campo \`time\` in formato HH:MM (es. COLAZIONE -> "08:00", PRANZO -> "13:00"). Se un orario è già presente, mantienilo a meno che non sia palesemente illogico per il tipo di pasto.
3.  **ANALISI NUTRIZIONALE**: Per OGNI pasto, analizza i suoi ingredienti e fornisci una **stima** del contenuto nutrizionale (carbs, protein, fat, calories).
4.  **RIGENERARE LA LISTA DELLA SPESA**: Basandoti sul piano settimanale (potenzialmente modificato), crea una NUOVA lista della spesa aggregata.

**REGOLE IMPORTANTI:**
*   Il campo \`"item"\` nella nuova lista della spesa DEVE corrispondere esattamente all'\`"ingredientName"\` che hai standardizzato.
*   Mantieni la struttura del piano settimanale, popolando i campi \`time\`, \`nutrition\` e modificando \`ingredientName\` se necessario.
*   Fornisci l'output **esclusivamente** in formato JSON, seguendo lo schema specificato, con sia \`weeklyPlan\` che \`shoppingList\`.

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
                responseSchema: finalSchema,
            },
        });
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as MealPlanData;
    } catch (error) {
        console.error("Error calling Gemini API for recalculation:", error);
        throw new Error("Failed to get a valid response from the AI during recalculation.");
    }
}