
import { GoogleGenAI, Type } from "@google/genai";
import { MealPlanData } from '../types';

if (!process.env.API_KEY) {
  // In a real app, you'd want to handle this more gracefully.
  // For this context, we'll alert and throw to stop execution.
  const errorMsg = "API_KEY environment variable not set.";
  alert(errorMsg); // For user visibility
  throw new Error(errorMsg); // To halt script execution
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const mealSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Il nome del pasto (COLAZIONE, SPUNTINO, PRANZO, MERENDA, CENA)." },
    title: { type: Type.STRING, description: "Il titolo o nome specifico del piatto, se presente (es. 'Riso venere con ceci, carote e fagiolini')." },
    items: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "L'elenco degli alimenti, ingredienti, quantità e istruzioni per questo pasto."
    }
  },
  required: ['name', 'items']
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
    item: { type: Type.STRING, description: "Il nome dell'ingrediente da acquistare." },
    quantity: { type: Type.STRING, description: "La quantità totale aggregata necessaria per l'intera settimana, incluse le unità di misura (es. '250g', '2 cucchiai', '3')." }
  },
  required: ['item', 'quantity']
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
      items: shoppingItemSchema,
      description: "La lista della spesa completa e aggregata per tutti gli ingredienti della settimana."
    }
  },
  required: ['weeklyPlan', 'shoppingList']
};

export async function parsePdfToMealPlan(text: string): Promise<MealPlanData | null> {
  const prompt = `
Sei un assistente nutrizionale altamente specializzato. Il tuo compito è analizzare il testo di un piano alimentare settimanale fornito in lingua italiana ed estrarre due set di informazioni: un piano giornaliero dettagliato e una lista della spesa aggregata.

1.  **Piano Settimanale**: Analizza il testo per ogni giorno, da LUNEDI a DOMENICA. Per ogni giorno, identifica tutti i pasti previsti: COLAZIONE, SPUNTINO, PRANZO, MERENDA, e CENA. Estrai il titolo del piatto (se specificato) e l'elenco completo degli ingredienti con le loro quantità.

2.  **Lista della Spesa**: Dopo aver analizzato l'intera settimana, crea una lista della spesa completa. Identifica ogni singolo ingrediente, somma le quantità totali necessarie per la settimana e raggruppa gli ingredienti identici in un'unica voce. Sii molto preciso nel riportare le quantità e le unità di misura (es. '150g di riso', '3 cucchiai di olio', '2 banane').

Fornisci l'output **esclusivamente** in formato JSON, seguendo lo schema specificato. Non includere alcun testo, spiegazione, o markdown (come \`\`\`json) al di fuori dell'oggetto JSON.

Testo del piano alimentare da analizzare:
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
        responseSchema: finalSchema,
      },
    });

    const jsonString = response.text.trim();
    const parsedData: MealPlanData = JSON.parse(jsonString);
    return parsedData;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get a valid response from the AI. The meal plan might be in an unsupported format or the API call failed.");
  }
}
