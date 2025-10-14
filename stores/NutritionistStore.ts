import { makeAutoObservable, runInAction } from 'mobx';
import { db } from '../services/db';
import { NutritionistPlan, DayPlan, ShoppingListCategory } from '../types';

interface PlanCreationData {
  planName: string;
  weeklyPlan: DayPlan[];
  shoppingList: ShoppingListCategory[];
}

class NutritionistStore {
    plans: NutritionistPlan[] = [];
    status: 'loading' | 'ready' | 'error' = 'loading';

    constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
        this.loadPlans();
    }

    async loadPlans() {
        this.status = 'loading';
        try {
            const plansFromDb = await db.nutritionistPlans.orderBy('creationDate').reverse().toArray();
            runInAction(() => {
                this.plans = plansFromDb;
                this.status = 'ready';
            });
        } catch (e) {
            console.error("Failed to load nutritionist plans from DB", e);
            runInAction(() => {
                this.status = 'error';
            });
        }
    }

    async addPlan(planData: PlanCreationData) {
        try {
            const newPlan: Omit<NutritionistPlan, 'id'> = {
                name: planData.planName,
                creationDate: new Date().toISOString(),
                planData: planData,
            };
            const id = await db.nutritionistPlans.add(newPlan as NutritionistPlan);
            await this.loadPlans(); // Reload to get the latest list
            return id;
        } catch (e) {
            console.error("Failed to add nutritionist plan", e);
            throw e;
        }
    }

    async updatePlan(id: number, planData: PlanCreationData) {
        try {
            await db.nutritionistPlans.update(id, {
                name: planData.planName,
                planData: planData,
            });
            await this.loadPlans();
        } catch (e) {
            console.error("Failed to update nutritionist plan", e);
            throw e;
        }
    }

    async deletePlan(id: number) {
        try {
            await db.nutritionistPlans.delete(id);
            await this.loadPlans(); // Refresh the list
        } catch (e) {
            console.error("Failed to delete nutritionist plan", e);
        }
    }
}

export const nutritionistStore = new NutritionistStore();
