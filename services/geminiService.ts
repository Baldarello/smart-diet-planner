import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
// Fix: Import types for the new function
import { DayPlan, ShoppingListCategory } from "../types";

let ai: GoogleGenAI | null = null;

if (process.env.API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} else {
  console.warn("API_KEY environment variable not set. AI features will be disabled.");
}

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

export function isQuotaError(error: unknown): boolean {
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        return message.includes('429') || message.includes('quota') || message.includes('resource has been exhausted');
    }
    return false;
}

export async function getPlanDetailsAndShoppingList(plan: DayPlan[]): Promise<{ weeklyPlan: DayPlan[], shoppingList: ShoppingListCategory[] }> {
    if (!ai) {
        throw new Error("AI features are disabled due to missing API key.");
    }

    const prompt = `
    Sei un assistente nutrizionista esperto. Ti viene fornito un piano alimentare settimanale in formato JSON.
    Il tuo compito è:
    1. Per ogni pasto, calcola una stima delle informazioni nutrizionali (carboidrati, proteine, grassi, calorie totali).
    2. Se manca un titolo per un pasto, creane uno breve e descrittivo.
    3. Se manca una procedura, creane una semplice.
    4. Genera una lista della spesa consolidata per l'intero piano, raggruppando gli articoli per categoria.

    Input:
    ---
    ${JSON.stringify(plan, null, 2)}
    ---

    Restituisci l'output ESCLUSIVAMENTE in formato JSON con la seguente struttura:
    {
      "weeklyPlan": [
        {
          "day": "NOME_GIORNO",
          "meals": [
            {
              "name": "NOME_PASTO",
              "title": "Titolo Piatto",
              "procedure": "Procedura di preparazione...",
              "items": [
                { "ingredientName": "Nome Ingrediente", "fullDescription": "Descrizione completa", "used": false }
              ],
              "done": false,
              "time": "HH:MM",
              "nutrition": {
                "carbs": 25,
                "protein": 15,
                "fat": 10,
                "calories": 250
              }
            }
          ]
        }
      ],
      "shoppingList": [
        {
          "category": "Nome Categoria",
          "items": [
            { "item": "Nome Articolo", "quantityValue": 150, "quantityUnit": "g" }
          ]
        }
      ]
    }
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                temperature: 0.1,
                safetySettings,
            },
        });
        
        if (!response.text) {
            throw new Error("Gemini API returned an empty response for plan details generation.");
        }
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as { weeklyPlan: DayPlan[], shoppingList: ShoppingListCategory[] };

    } catch (error) {
        console.error("Error calling Gemini API for plan details:", error);
        throw error;
    }
}

export async function getCategoriesForIngredients(ingredientNames: string[]): Promise<Record<string, string>> {
    if (!ai) {
        throw new Error("AI features are disabled due to missing API key.");
    }

    const prompt = `
Sei un assistente esperto di categorizzazione alimentare. Ti viene fornita una lista di ingredienti.
Il tuo compito è associare ogni ingrediente alla categoria di spesa più appropriata.

Le categorie disponibili sono:
- Frutta
- Verdura e Ortaggi
- Carboidrati e Cereali
- Proteine (Carne, Pesce, Legumi)
- Latticini e Derivati
- Grassi e Frutta Secca
- Condimenti e Spezie
- Bevande
- Altro

Restituisci l'output ESCLUSIVAMENTE in formato JSON, come un oggetto dove la chiave è il nome dell'ingrediente e il valore è la stringa della categoria.

Esempio di output:
{
  "Petto di pollo": "Proteine (Carne, Pesce, Legumi)",
  "Riso basmati": "Carboidrati e Cereali",
  "Olio EVO": "Condimenti e Spezie"
}

Lista di ingredienti da categorizzare:
---
${JSON.stringify(ingredientNames)}
---
`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {},
                    additionalProperties: { type: Type.STRING }
                },
                temperature: 0.0,
                safetySettings,
            },
        });

        if (!response.text) {
            throw new Error("Gemini API returned an empty response for category generation.");
        }
        const jsonString = response.text.trim();
        return JSON.parse(jsonString) as Record<string, string>;

    } catch (error) {
        console.error("Error calling Gemini API for ingredient categories:", error);
        throw error;
    }
}