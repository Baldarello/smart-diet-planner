import { makeAutoObservable, runInAction } from 'mobx';
import { db } from '../services/db';
import { Ingredient } from '../types';

class IngredientStore {
    ingredients: string[] = [];
    status: 'loading' | 'ready' | 'error' = 'loading';

    constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
        this.loadIngredients();
    }

    async loadIngredients() {
        try {
            const ingredientsFromDb = await db.ingredients.orderBy('name').toArray();
            runInAction(() => {
                this.ingredients = ingredientsFromDb.map(i => i.name);
                this.status = 'ready';
            });
        } catch (e) {
            console.error("Failed to load ingredients from DB", e);
            runInAction(() => {
                this.status = 'error';
            });
        }
    }

    async addIngredient(name: string) {
        const trimmedName = name.trim();
        if (!trimmedName) return;

        try {
            // '&name' in schema makes it unique, add will fail if it exists.
            await db.ingredients.add({ name: trimmedName });
            // Instead of reloading all, just add it to the local state if successful
             runInAction(() => {
                if (!this.ingredients.includes(trimmedName)) {
                    this.ingredients.push(trimmedName);
                    this.ingredients.sort();
                }
            });
        } catch (e) {
            // It will fail if the ingredient already exists, which is fine.
            // We can just ignore the error in that case.
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
                this.ingredients = this.ingredients.filter(i => i !== name);
            });
        } catch (e) {
            console.error("Failed to delete ingredient", e);
        }
    }
}

export const ingredientStore = new IngredientStore();
