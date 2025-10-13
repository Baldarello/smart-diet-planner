import { makeAutoObservable, runInAction } from 'mobx';
import { db } from '../services/db';
import { Ingredient } from '../types';

class IngredientStore {
    ingredients: Ingredient[] = [];
    status: 'loading' | 'ready' | 'error' = 'loading';

    constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
        this.loadIngredients();
    }

    async loadIngredients() {
        try {
            const ingredientsFromDb = await db.ingredients.orderBy('name').toArray();
            runInAction(() => {
                this.ingredients = ingredientsFromDb;
                this.status = 'ready';
            });
        } catch (e) {
            console.error("Failed to load ingredients from DB", e);
            runInAction(() => {
                this.status = 'error';
            });
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
        } catch (e) {
            // It will fail if the ingredient already exists, which is fine.
            if (e instanceof Error && e.name === 'ConstraintError') {
                // Ingredient already exists, which is fine.
            } else {
                console.error("Failed to add ingredient", e);
            }
        }
    }

    async updateIngredient(oldName: string, newName: string) {
        const trimmedNewName = newName.trim();
        if (!trimmedNewName || oldName === trimmedNewName) return;

        try {
            const ingredientToUpdate = await db.ingredients.where('name').equals(oldName).first();
            if (ingredientToUpdate && ingredientToUpdate.id) {
                await db.ingredients.update(ingredientToUpdate.id, { name: trimmedNewName });
                await this.loadIngredients(); // Reload to maintain sort order and uniqueness
            }
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
