import { makeAutoObservable, runInAction } from 'mobx';
import { db } from '../services/db';
import { Recipe } from '../types';
import Dexie from 'dexie';

class RecipeStore {
    recipes: Recipe[] = [];
    status: 'loading' | 'ready' | 'error' = 'loading';

    constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
        this.loadRecipes();
    }

    async loadRecipes() {
        this.status = 'loading';
        try {
            const recipesFromDb = await db.recipes.orderBy('name').toArray();
            runInAction(() => {
                this.recipes = recipesFromDb;
                this.status = 'ready';
            });
        } catch (e) {
            console.error("Failed to load recipes from DB", e);
            runInAction(() => {
                this.status = 'error';
            });
        }
    }

    async addRecipe(recipe: Omit<Recipe, 'id'>) {
        try {
            await db.recipes.add(recipe as Recipe);
            await this.loadRecipes();
        } catch (e) {
            console.error("Failed to add recipe", e);
            throw e;
        }
    }

    async updateRecipe(id: number, updates: Partial<Recipe>) {
        try {
            await db.recipes.update(id, updates);
            await this.loadRecipes();
        } catch (e) {
            console.error("Failed to update recipe", e);
            throw e;
        }
    }

    async deleteRecipe(id: number) {
        try {
            await db.recipes.delete(id);
            await this.loadRecipes();
        } catch (e) {
            console.error("Failed to delete recipe", e);
        }
    }
    
    async bulkAddOrUpdateRecipes(recipes: Omit<Recipe, 'id'>[]) {
        try {
            await (db as Dexie).transaction('rw', [db.recipes], async () => {
                for (const recipe of recipes) {
                    const existing = await db.recipes.where('name').equalsIgnoreCase(recipe.name).first();
                    if (existing && existing.id) {
                        await db.recipes.update(existing.id, recipe);
                    } else {
                        await db.recipes.add(recipe as Recipe);
                    }
                }
            });
            await this.loadRecipes();
        } catch (e) {
            console.error("Failed to bulk add/update recipes", e);
            throw e;
        }
    }
}

export const recipeStore = new RecipeStore();
