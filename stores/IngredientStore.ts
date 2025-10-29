import { makeAutoObservable, runInAction } from 'mobx';
import { db } from '../services/db';
import { Ingredient } from '../types';
import Dexie from 'dexie';

class IngredientStore {
    ingredients: Ingredient[] = [];
    status: 'loading' | 'ready' | 'error' = 'loading';
    isPopulating = false;
    isPopulatingFromAI = false;

    constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
        this.loadIngredients();
    }

    async loadIngredients() {
        try {
            this.status = 'loading';
            const ingredientsFromDb = await db.ingredients.orderBy('name').toArray();
            runInAction(() => {
                this.ingredients = ingredientsFromDb;
                this.status = 'ready';
            });
            // After loading, trigger the population for missing data only if not already running
            if (!this.isPopulating) {
                this.populateNutritionalData();
            }
        } catch (e) {
            console.error("Failed to load ingredients from DB", e);
            runInAction(() => {
                this.status = 'error';
            });
        }
    }

    async populateFromAI() {
        if (this.isPopulatingFromAI) return;
    
        runInAction(() => {
            this.isPopulatingFromAI = true;
        });
    
        try {
            const { getCommonIngredients } = await import('../services/geminiService');
            const commonIngredients = await getCommonIngredients();
            
            await this.bulkAddOrUpdateIngredients(commonIngredients);
    
            // After adding, trigger nutritional data population for any new items that need it
            // No need to await this, it can run in the background
            this.populateNutritionalData();
        } catch (error) {
            console.error("Failed to populate ingredients from AI", error);
            // TODO: Set an error state in the store to be displayed in the UI
        } finally {
            runInAction(() => {
                this.isPopulatingFromAI = false;
            });
        }
    }

    async populateNutritionalData() {
        const ingredientsToUpdate = this.ingredients.filter(i => i.calories === undefined);

        if (ingredientsToUpdate.length === 0) {
            return;
        }

        runInAction(() => {
            this.isPopulating = true;
        });
        
        console.log(`Found ${ingredientsToUpdate.length} ingredients needing nutritional data.`);
        
        const { getNutritionForIngredients } = await import('../services/geminiService');
        
        const ingredientNames = ingredientsToUpdate.map(i => i.name);
        
        const CHUNK_SIZE = 50;
        for (let i = 0; i < ingredientNames.length; i += CHUNK_SIZE) {
            const chunk = ingredientNames.slice(i, i + CHUNK_SIZE);
            try {
                const nutritionData = await getNutritionForIngredients(chunk);
                
                const updates: { key: number, changes: Partial<Ingredient> }[] = [];
                for (const name in nutritionData) {
                    const ingredient = ingredientsToUpdate.find(ing => ing.name === name);
                    if (ingredient && ingredient.id) {
                        updates.push({
                            key: ingredient.id,
                            changes: { ...nutritionData[name] }
                        });
                    }
                }
                
                if (updates.length > 0) {
                    await db.ingredients.bulkUpdate(updates);
                    console.log(`Updated nutritional data for ${updates.length} ingredients.`);
                }

            } catch (error) {
                console.error(`Failed to populate nutritional data for chunk ${i / CHUNK_SIZE}`, error);
            }
        }

        runInAction(() => {
            this.isPopulating = false;
        });
        await this.loadIngredients();
    }

    async bulkAddOrUpdateIngredients(ingredients: Omit<Ingredient, 'id'>[]) {
        try {
            // Fix: Cast `db` to `Dexie` and use array syntax for tables to fix transaction method type error.
            await (db as Dexie).transaction('rw', [db.ingredients], async () => {
                for (const ingredient of ingredients) {
                    const existing = await db.ingredients.where('name').equalsIgnoreCase(ingredient.name).first();
                    if (existing && existing.id) {
                        // Keep existing data if new data is undefined
                        const updateData = {
                            category: ingredient.category !== undefined ? ingredient.category : existing.category,
                            calories: ingredient.calories !== undefined ? ingredient.calories : existing.calories,
                            carbs: ingredient.carbs !== undefined ? ingredient.carbs : existing.carbs,
                            protein: ingredient.protein !== undefined ? ingredient.protein : existing.protein,
                            fat: ingredient.fat !== undefined ? ingredient.fat : existing.fat,
                        };
                        await db.ingredients.update(existing.id, updateData);
                    } else {
                        await db.ingredients.add(ingredient as Ingredient);
                    }
                }
            });
            await this.loadIngredients(); // Refresh store state
        } catch (e) {
            console.error("Failed to bulk add/update ingredients", e);
            throw e; // re-throw to be caught by the UI
        }
    }

    getCategoryForIngredient(name: string): string | undefined {
        const ingredient = this.ingredients.find(i => i.name.toLowerCase() === name.toLowerCase());
        return ingredient?.category;
    }

    async setCategories(categories: Record<string, string>) {
        try {
            const updates: Promise<any>[] = [];
            
            for (const name in categories) {
                const category = categories[name];
                const existing = this.ingredients.find(i => i.name === name);
                if (existing?.id) {
                    updates.push(db.ingredients.update(existing.id, { category }));
                }
            }
            await Promise.all(updates);
            // Reload from DB to ensure local state is the single source of truth
            await this.loadIngredients();

        } catch (e) {
            console.error("Failed to set categories in DB", e);
        }
    }

    async addIngredient(name: string) {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        try {
            // '&name' in schema makes it unique, add will fail if it exists.
            const id = await db.ingredients.add({ name: trimmedName });
            runInAction(() => {
                if (!this.ingredients.some(i => i.name === trimmedName)) {
                    this.ingredients.push({ id: id as number, name: trimmedName });
                    this.ingredients.sort((a,b) => a.name.localeCompare(b.name));
                }
            });
            // Trigger nutritional data population for the new ingredient
            this.populateNutritionalData();
        } catch (e) {
            // It will fail if the ingredient already exists, which is fine.
            if (e instanceof Error && e.name === 'ConstraintError') {
                // Ingredient already exists, which is fine.
            } else {
                console.error("Failed to add ingredient", e);
            }
        }
    }

    async updateIngredient(id: number, updates: Partial<Omit<Ingredient, 'id'>>) {
        try {
            if (updates.name !== undefined) {
                const trimmedName = updates.name.trim();
                if (!trimmedName) {
                    console.error("Ingredient name cannot be empty.");
                    return;
                }
                updates.name = trimmedName;
            }

            await db.ingredients.update(id, updates);
            await this.loadIngredients();
        } catch (e) {
            console.error("Failed to update ingredient", e);
        }
    }

    async deleteIngredient(name: string) {
        try {
            await db.ingredients.where('name').equals(name).delete();
            runInAction(() => {
                this.ingredients = this.ingredients.filter(i => i.name !== name);
            });
        } catch (e) {
            console.error("Failed to delete ingredient", e);
        }
    }
}

export const ingredientStore = new IngredientStore();