import { GoogleGenAI, Type } from "@google/genai";
import { MealPlanData } from '../types';

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

const mealSchema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "Il nome del pasto (COLAZIONE, SPUNTINO, PRANZO, MERENDA, CENA)." },
    title: { type: Type.STRING, description: "Il titolo o nome specifico del piatto, se presente (es. 'Riso venere con ceci, carote e fagiolini')." },
    items: {
      type: Type.ARRAY,
      items: mealItemSchema,
      description: "L'elenco degli alimenti e ingredienti. Ogni elemento deve essere un oggetto strutturato con 'ingredientName' e 'fullDescription'."
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

export async function parsePdfToMealPlan(text: string): Promise<MealPlanData | null> {
  const prompt = `
Sei un assistente nutrizionale altamente specializzato. Il tuo compito è analizzare il testo di un piano alimentare settimanale fornito in lingua italiana ed estrarre due set di informazioni: un piano giornaliero dettagliato e una lista della spesa aggregata e categorizzata.

**REGOLE IMPORTANTI:**
1.  **Piano Settimanale Dettagliato**: Analizza il testo per ogni giorno, da LUNEDI a DOMENICA. Per ogni giorno, identifica tutti i pasti (COLAZIONE, SPUNTINO, PRANZO, MERENDA, CENA).
    *   Per ogni pasto, estrai un elenco di \`items\`. Ogni \`item\` DEVE essere un oggetto JSON con due campi:
        *   \`"ingredientName"\`: Il nome pulito e generico dell'ingrediente (es. "Yogurt di soia", "Mela", "Pane integrale"). Questo nome deve essere **identico** per lo stesso ingrediente in tutto il piano.
        *   \`"fullDescription"\`: Il testo originale completo dell'ingrediente, inclusa la quantità (es. "1 vasetto di yogurt di soia bianco (da 125g)", "1 mela", "3 fettine (60g) di pane integrale").
2.  **Lista della Spesa Aggregata**: Dopo aver analizzato l'intera settimana, crea una lista della spesa. Somma le quantità totali per ogni ingrediente.
    *   Il campo \`"item"\` nella lista della spesa DEVE corrispondere esattamente all'\`"ingredientName"\` usato nel piano settimanale.
    *   Raggruppa gli ingredienti in categorie logiche: 'Frutta', 'Verdura e Ortaggi', 'Cereali e Derivati', 'Legumi', 'Proteine (Tofu, Seitan, etc.)', 'Latticini e Alternative', 'Frutta Secca e Semi', 'Condimenti, Spezie e Oli', 'Altro'.

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

    // FIX: Access the 'text' property directly from the response.
    // As per Gemini API guidelines, 'text' is a property, not a method.
    const jsonString = response.text.trim();
    const parsedData: MealPlanData = JSON.parse(jsonString);
    return parsedData;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to get a valid response from the AI. The meal plan might be in an unsupported format or the API call failed.");
  }
}