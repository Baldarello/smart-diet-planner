
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from "@google/genai";
// Fix: Import types for the new function
import { DayPlan, ShoppingListCategory } from "../types";

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

// @google/genai Guidelines: Define the schema for plan details output for improved reliability and structure
const planDetailsSchema = {
    type: Type.OBJECT,
    properties: {
        weeklyPlan: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    day: { type: Type.STRING },
                    meals: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING },
                                title: { type: Type.STRING },
                                procedure: { type: Type.STRING },
                                items: {
                                    type: Type.ARRAY,
                                    items: {
                                        type: Type.OBJECT,
                                        properties: {
                                            ingredientName: { type: Type.STRING },
                                            fullDescription: { type: Type.STRING },
                                            used: { type: Type.BOOLEAN }
                                        },
                                        required: ['ingredientName', 'fullDescription', 'used']
                                    }
                                },
                                done: { type: Type.BOOLEAN },
                                time: { type: Type.STRING },
                                nutrition: {
                                    type: Type.OBJECT,
                                    properties: {
                                        carbs: { type: Type.NUMBER },
                                        protein: { type: Type.NUMBER },
                                        fat: { type: Type.NUMBER },
                                        calories: { type: Type.NUMBER }
                                    },
                                    required: ['carbs', 'protein', 'fat', 'calories']
                                }
                            },
                            required: ['name', 'items', 'done', 'nutrition']
                        }
                    }
                },
                required: ['day', 'meals']
            }
        },
        shoppingList: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    category: { type: Type.STRING },
                    items: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                item: { type: Type.STRING },
                                quantityValue: { type: Type.NUMBER },
                                quantityUnit: { type: Type.STRING }
                            },
                            required: ['item', 'quantityUnit']
                        }
                    }
                },
                required: ['category', 'items']
            }
        }
    },
    required: ['weeklyPlan', 'shoppingList']
};

export async function getPlanDetailsAndShoppingList(plan: DayPlan[]): Promise<{ weeklyPlan: DayPlan[], shoppingList: ShoppingListCategory[] }> {
    // Guidelines: Create a new GoogleGenAI instance right before making an API call to ensure the latest API key is used.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

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

    Restituisci l'output ESCLUSIVAMENTE in formato JSON con la struttura richiesta.
    `;

    try {
        const response = await ai.models.generateContent({
            // Guideline: Use 'gemini-3-flash-preview' for basic text tasks like plan analysis and nutrition estimation.
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: planDetailsSchema,
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
    // Guidelines: Create a new GoogleGenAI instance right before making an API call.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = `
Sei un assistente esperto di categorizzazione alimentare. Ti viene fornita una lista di ingredienti.
Il tuo compito è associare ogni ingrediente alla categoria di spesa più appropriata.

Le categorie disponibili sono:
- Frutta
- Verdura e Ortaggi
- Carboidrati e Cereali
- Carne
- Pesce
- Legumi
- Uova
- Latticini e Derivati
- Grassi e Frutta Secca
- Condimenti e Spezie
- Bevande
- Altro

Restituisci l'output ESCLUSIVAMENTE in formato JSON, come un array di oggetti, dove ogni oggetto ha "ingredientName" e "category".

Esempio di output:
[
  { "ingredientName": "Petto di pollo", "category": "Carne" },
  { "ingredientName": "Salmone", "category": "Pesce" },
  { "ingredientName": "Uova", "category": "Uova" },
  { "ingredientName": "Lenticchie", "category": "Legumi" },
  { "ingredientName": "Riso basmati", "category": "Carboidrati e Cereali" }
]

Lista di ingredienti da categorizzare:
---
${JSON.stringify(ingredientNames)}
---
`;

    try {
        const response = await ai.models.generateContent({
            // Guideline: Use 'gemini-3-flash-preview' for basic text categorization tasks.
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            ingredientName: { type: Type.STRING },
                            category: { type: Type.STRING }
                        },
                        required: ['ingredientName', 'category']
                    }
                },
                temperature: 0.0,
                safetySettings,
            },
        });

        if (!response.text) {
            throw new Error("Gemini API returned an empty response for category generation.");
        }
        const jsonString = response.text.trim();
        const categoriesArray = JSON.parse(jsonString) as { ingredientName: string, category: string }[];
        
        const categoryRecord: Record<string, string> = {};
        for (const item of categoriesArray) {
            if (item.ingredientName && item.category) {
                 categoryRecord[item.ingredientName] = item.category;
            }
        }
        return categoryRecord;

    } catch (error) {
        console.error("Error calling Gemini API for ingredient categories:", error);
        throw error;
    }
}


export async function getNutritionForIngredients(ingredientNames: string[]): Promise<Record<string, { calories: number; carbs: number; protein: number; fat: number }>> {
    // Guidelines: Create a new GoogleGenAI instance right before making an API call.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const prompt = `
Sei un esperto di dati nutrizionali. Ti viene fornita una lista di ingredienti.
Il tuo compito è fornire i valori nutrizionali medi (calorie, carboidrati, proteine, grassi) per 100 grammi di ciascun ingrediente.
Usa valori numerici interi o con al massimo un decimale. Se un ingrediente non è riconoscibile, omettilo dalla risposta.

Restituisci l'output ESCLUSIVAMENTE in formato JSON, come un array di oggetti. Ogni oggetto deve contenere "ingredientName" e un oggetto "nutrition" con i dati nutrizionali.

Esempio di output:
[
  { "ingredientName": "Petto di pollo", "nutrition": { "calories": 165, "carbs": 0, "protein": 31, "fat": 3.6 } },
  { "ingredientName": "Riso basmati", "nutrition": { "calories": 130, "carbs": 28, "protein": 2.7, "fat": 0.3 } }
]

Lista di ingredienti da analizzare:
---
${JSON.stringify(ingredientNames)}
---
`;

    try {
        const response = await ai.models.generateContent({
            // Guideline: Use 'gemini-3-flash-preview' for extraction tasks.
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            ingredientName: { type: Type.STRING, description: "Nome dell'ingrediente" },
                            nutrition: {
                                type: Type.OBJECT,
                                properties: {
                                    calories: { type: Type.NUMBER, description: "Calorie totali per 100g" },
                                    carbs: { type: Type.NUMBER, description: "Grammi di carboidrati per 100g" },
                                    protein: { type: Type.NUMBER, description: "Grammi di proteine per 100g" },
                                    fat: { type: Type.NUMBER, description: "Grammi di grassi per 100g" },
                                },
                                required: ['calories', 'carbs', 'protein', 'fat']
                            }
                        },
                        required: ['ingredientName', 'nutrition']
                    }
                },
                temperature: 0.0,
                safetySettings,
            },
        });

        if (!response.text) {
            throw new Error("Gemini API returned an empty response for nutrition generation.");
        }
        const jsonString = response.text.trim();
        const nutritionArray = JSON.parse(jsonString) as { ingredientName: string; nutrition: { calories: number; carbs: number; protein: number; fat: number; } }[];
        
        const nutritionRecord: Record<string, { calories: number; carbs: number; protein: number; fat: number }> = {};
        for (const item of nutritionArray) {
            if (item.ingredientName && item.nutrition) {
                nutritionRecord[item.ingredientName] = item.nutrition;
            }
        }
        return nutritionRecord;

    } catch (error) {
        console.error("Error calling Gemini API for ingredient nutrition:", error);
        throw error;
    }
}
