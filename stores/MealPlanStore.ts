import {makeAutoObservable, runInAction, toJS, computed} from 'mobx';
import {
    ArchivedPlan,
    BodyMetrics,
    DailyLog,
    DayPlan,
    HydrationSnackbarInfo,
    Locale,
    Meal,
    MealItem,
    NutritionInfo,
    PantryItem,
    ProgressRecord,
    ShoppingListCategory,
    ShoppingListItem,
    StoredState,
    Theme,
    GenericPlanData,
    GenericPlanPreferences,
    PlanCreationData
} from '../types';
import {categorizeIngredient, extractIngredientInfo, DAY_KEYWORDS, MEAL_KEYWORDS, MEAL_TIMES} from '../services/offlineParser';
import {getPlanDetailsAndShoppingList, isQuotaError, getCategoriesForIngredients} from '../services/geminiService';
import {parseQuantity, subtractQuantities} from '../utils/quantityParser';
import {db} from '../services/db';
import {calculateCaloriesBurned} from '../utils/calories';
import {authStore} from './AuthStore';
import {readSharedFile} from '../services/driveService';
import { trackEvent } from '../services/analyticsService';
import { t } from '../i18n';

export enum AppStatus {
    INITIAL,
    HYDRATING,
    LOADING,
    IMPORTING,
    SYNCING,
    SUCCESS,
    ERROR,
    AWAITING_DATES,
}

export type NavigableTab = 'dashboard' | 'daily' | 'calendar' | 'plan' | 'list' | 'pantry' | 'progress' | 'archive' | 'settings' | 'upload';

interface ImportedJsonData extends PlanCreationData {
    pantry?: PantryItem[];
    startDate?: string;
    endDate?: string;
    showBodyMetricsInApp?: boolean;
    stepGoal?: number;
    hydrationGoalLiters?: number;
}

const getTodayDateString = () => new Date().toLocaleDateString('en-CA');

export class MealPlanStore {
    status: AppStatus = AppStatus.HYDRATING;
    error: string | null = null;
    masterMealPlan: DayPlan[] = [];
    presetMealPlan: DayPlan[] = []; 
    shoppingList: ShoppingListCategory[] = [];
    pantry: PantryItem[] = [];
    archivedPlans: ArchivedPlan[] = [];
    activeTab: NavigableTab = 'dashboard';
    currentPlanName = 'My Diet Plan';
    theme: Theme = 'light';
    locale: Locale = 'it';
    currentPlanId: string | null = null;

    isGenericPlan = false;
    genericPlanData: GenericPlanData | null = null;
    genericPlanPreferences: GenericPlanPreferences = {};

    startDate: string | null = null;
    endDate: string | null = null;
    currentDate: string = getTodayDateString();
    currentDayPlan: DailyLog | null = null;
    planToSet: DayPlan[] | null = null; 
    shoppingListManaged = false;

    currentDayProgress: ProgressRecord | null = null;
    recalculatingProgress = false;
    showMacros = false;
    showCheatMealButton = false;
    showBodyMetricsInApp = true;

    hydrationGoalLiters = 3;
    stepGoal = 6000;
    bodyMetrics: BodyMetrics = {};
    bodyFatUnit: 'kg' | '%' = 'kg';
    bodyWaterUnit: 'liters' | '%' = 'liters';
    hydrationSnackbar: HydrationSnackbarInfo | null = null;
    progressHistory: ProgressRecord[] = [];
    earnedAchievements: string[] = [];

    sentNotifications = new Map<string, boolean>();
    lastActiveDate: string = getTodayDateString();
    lastModified: number = 0;
    planVersion: number = 0;
    onlineMode = true;
    recalculatingActualMeal: { mealIndex: number } | null = null;

    constructor() {
        makeAutoObservable(this, {
            dailyPlan: computed,
            dailyNutritionSummary: computed,
            adherenceStreak: computed,
            hydrationStreak: computed,
            expiringSoonItems: computed,
            lowStockItems: computed,
            expiredItems: computed
        }, {autoBind: true});
    }

    get dailyPlan() {
        return this.currentDayPlan;
    }

    get dailyNutritionSummary(): NutritionInfo | null {
        if (!this.currentDayPlan) return null;
        const summary: NutritionInfo = { carbs: 0, protein: 0, fat: 0, calories: 0 };
        this.currentDayPlan.meals.forEach(m => {
            const nut = m.actualNutrition || m.nutrition;
            if (nut && (m.done || m.actualNutrition)) {
                summary.carbs += nut.carbs;
                summary.protein += nut.protein;
                summary.fat += nut.fat;
                summary.calories += nut.calories;
            }
        });
        return summary;
    }

    get adherenceStreak(): number {
        let streak = 0;
        const history = [...this.progressHistory].reverse();
        for (const record of history) {
            if (record.adherence >= 80) streak++;
            else if (record.date === this.currentDate) continue;
            else break;
        }
        return streak;
    }

    get hydrationStreak(): number {
        let streak = 0;
        const history = [...this.progressHistory].reverse();
        const goalMl = this.hydrationGoalLiters * 1000;
        for (const record of history) {
            if (record.waterIntakeMl >= goalMl) streak++;
            else if (record.date === this.currentDate) continue;
            else break;
        }
        return streak;
    }

    setActiveTab(tab: NavigableTab) {
        this.activeTab = tab;
        trackEvent('tab_changed', { tab });
    }

    navigateTo(tab: NavigableTab, replace: boolean = false) {
        this.setActiveTab(tab);
        try {
            const path = `./${tab}`;
            if (replace) window.history.replaceState({ tab }, '', path);
            else window.history.pushState({ tab }, '', path);
        } catch (e) {
            console.warn("Navigation restricted", e);
        }
        window.dispatchEvent(new PopStateEvent('popstate'));
    }

    setCurrentPlanName(name: string) {
        this.currentPlanName = name;
        this.saveToDB();
    }

    setCurrentDate(date: string) {
        this.currentDate = date;
        this.loadPlanForDate(date);
    }

    setTheme(theme: Theme) {
        this.theme = theme;
        this.saveToDB();
    }

    setLocale(locale: Locale) {
        this.locale = locale;
        this.saveToDB();
    }

    setShowMacros(show: boolean) {
        this.showMacros = show;
        this.saveToDB();
    }

    setShowCheatMealButton(show: boolean) {
        this.showCheatMealButton = show;
        this.saveToDB();
    }

    private updatePantryFromItem(item: MealItem, reverse: boolean = false) {
        const matchingPantryItem = this.pantry.find(p => 
            p.item.toLowerCase() === item.ingredientName.toLowerCase()
        );

        if (matchingPantryItem && matchingPantryItem.quantityValue !== null) {
            const oldVal = matchingPantryItem.quantityValue;
            const newVal = subtractQuantities(oldVal, item.fullDescription, reverse);
            matchingPantryItem.quantityValue = newVal;
            
            if (newVal <= 0 && !reverse) {
                const alreadyInList = this.shoppingList.some(cat => 
                    cat.items.some(si => si.item.toLowerCase() === matchingPantryItem.item.toLowerCase())
                );
                if (!alreadyInList) {
                    this.movePantryItemToShoppingList(matchingPantryItem, false);
                }
            }

            this.saveToDB();
        }
    }

    private updatePantryFromMeal(meal: Meal, reverse: boolean = false) {
        meal.items.forEach(item => this.updatePantryFromItem(item, reverse));
    }

    recalculateActualMealNutrition = async (mealIndex: number) => {
        if (!this.currentDayPlan || !this.onlineMode) return;
        runInAction(() => { this.recalculatingActualMeal = { mealIndex }; });
        setTimeout(() => {
            runInAction(() => {
                if (this.currentDayPlan && this.currentDayPlan.meals[mealIndex]) {
                    const original = this.currentDayPlan.meals[mealIndex].nutrition;
                    if (original) {
                        this.currentDayPlan.meals[mealIndex].actualNutrition = {
                            calories: original.calories * 0.9,
                            carbs: original.carbs * 0.9,
                            protein: original.protein * 0.9,
                            fat: original.fat * 0.9,
                        };
                    }
                }
                this.recalculatingActualMeal = null;
                this.saveToDB();
            });
        }, 1500);
    }

    init = async () => {
        runInAction(() => {
            if (!process.env.API_KEY) this.onlineMode = false;
        });

        const queryParams = new URLSearchParams(window.location.search);
        const planIdFromUrl = queryParams.get('plan_id');

        if (planIdFromUrl) {
            await this.importPlanFromUrl(planIdFromUrl);
            return;
        }

        try {
            const [savedState, progressHistory] = await Promise.all([
                db.appState.get('dietPlanData'),
                db.progressHistory.orderBy('date').toArray()
            ]);

            runInAction(() => {
                this.progressHistory = progressHistory;
                if (savedState) {
                    const data = savedState.value;
                    this.masterMealPlan = data.masterMealPlan || [];
                    this.presetMealPlan = data.presetMealPlan || [];
                    this.isGenericPlan = data.isGenericPlan || false;
                    this.genericPlanData = data.genericPlanData || null;
                    this.genericPlanPreferences = data.genericPlanPreferences || {};
                    this.shoppingList = (data.shoppingList || []).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
                    this.pantry = data.pantry || [];
                    this.archivedPlans = data.archivedPlans || [];
                    this.currentPlanName = data.currentPlanName || 'My Diet Plan';
                    this.theme = data.theme || 'light';
                    this.locale = data.locale || 'it';
                    this.hydrationGoalLiters = data.hydrationGoalLiters || 3;
                    this.lastActiveDate = data.lastActiveDate || getTodayDateString();
                    this.currentPlanId = data.currentPlanId || null;
                    this.stepGoal = data.stepGoal || 6000;
                    this.bodyMetrics = data.bodyMetrics || {};
                    this.startDate = data.startDate || null;
                    this.endDate = data.endDate || null;
                    this.shoppingListManaged = data.shoppingListManaged ?? true;
                    this.lastModified = data.lastModified || Date.now();
                    this.showMacros = data.showMacros ?? false;
                    this.showCheatMealButton = data.showCheatMealButton ?? false;
                    this.showBodyMetricsInApp = data.showBodyMetricsInApp ?? true;
                    this.bodyFatUnit = data.bodyFatUnit || 'kg';
                    this.bodyWaterUnit = data.bodyWaterUnit || 'liters';
                    this.planVersion = data.planVersion || 0;

                    if (data.sentNotifications) this.sentNotifications = new Map(data.sentNotifications);

                    this.resetSentNotificationsIfNeeded();
                    this.updateAchievements();

                    if ((this.masterMealPlan.length > 0 || this.isGenericPlan) && this.currentPlanId) {
                        this.status = AppStatus.SUCCESS;
                        this.loadPlanForDate(this.currentDate);
                    } else {
                        this.status = AppStatus.INITIAL;
                    }
                } else {
                    this.status = AppStatus.INITIAL;
                }
            });
        } catch (error) {
            console.error("Initialization failed", error);
            runInAction(() => {
                this.status = AppStatus.ERROR;
                this.error = "Failed to load data from the database.";
            });
        }
    }

    resetSentNotificationsIfNeeded() {
        if (this.currentDate !== this.lastActiveDate) {
            this.sentNotifications.clear();
            this.lastActiveDate = this.currentDate;
            this.saveToDB();
        }
    }

    markNotificationSent(key: string) {
        this.sentNotifications.set(key, true);
        this.saveToDB();
    }

    setGenericPlanPreference = async (day: string, sectionKey: string, selectedIndices: number[]) => {
        if (!this.genericPlanPreferences[day]) {
            this.genericPlanPreferences[day] = {};
        }
        this.genericPlanPreferences[day][sectionKey] = selectedIndices;
        this.saveToDB();
        
        if (this.isGenericPlan) {
            await this.regenerateGenericShoppingList();
        }
    }

    private regenerateGenericShoppingList = async () => {
        if (!this.genericPlanData) return;
        
        const aggregatedIngredients = new Map<string, { totalValue: number; unit: string }>();
        const processMeal = (m: Meal) => {
            m.items.forEach(item => {
                const name = item.ingredientName.trim();
                if (!name) return;
                const parsed = parseQuantity(item.fullDescription);
                const value = parsed?.value || 0;
                const unit = parsed?.unit || 'g';
                const existing = aggregatedIngredients.get(name);
                if (existing && existing.unit === unit) existing.totalValue += value;
                else if (!existing) aggregatedIngredients.set(name, { totalValue: value, unit });
            });
        };

        const getAllPreferredMeals = () => {
            DAY_KEYWORDS.forEach(day => {
                const prefs = this.genericPlanPreferences[day] || {};
                
                const addFromSection = (sectionKey: string, source: Meal[]) => {
                    const sel = prefs[sectionKey];
                    if (sel === undefined) { 
                        source.forEach(processMeal);
                    } else {
                        sel.forEach(idx => { if (source[idx]) processMeal(source[idx]); });
                    }
                };

                addFromSection('breakfast', this.genericPlanData!.breakfast);
                const snacks = [...(this.genericPlanData!.snacks || []), ...(this.genericPlanData!.snack1 || []), ...(this.genericPlanData!.snack2 || [])];
                addFromSection('snacks_morning', snacks);
                addFromSection('snacks_afternoon', snacks);
                addFromSection('lunch_carbs', this.genericPlanData!.lunch.carbs);
                addFromSection('lunch_protein', this.genericPlanData!.lunch.protein);
                addFromSection('lunch_vegetables', this.genericPlanData!.lunch.vegetables);
                addFromSection('lunch_fats', this.genericPlanData!.lunch.fats);
                addFromSection('dinner_carbs', this.genericPlanData!.dinner.carbs);
                addFromSection('dinner_protein', this.genericPlanData!.dinner.protein);
                addFromSection('dinner_vegetables', this.genericPlanData!.dinner.vegetables);
                addFromSection('dinner_fats', this.genericPlanData!.dinner.fats);
            });
        };

        getAllPreferredMeals();

        const uniqueNames = Array.from(aggregatedIngredients.keys());
        const categoryMap = new Map<string, string>();
        
        const uncachedNames = uniqueNames.filter(name => !this.shoppingList.some(cat => cat.items.some(i => i.item === name)));
        if (uncachedNames.length > 0 && this.onlineMode) {
            try {
                const newCategories = await getCategoriesForIngredients(uncachedNames);
                Object.entries(newCategories).forEach(([name, cat]) => categoryMap.set(name, cat));
            } catch (e) {}
        }

        const shoppingListByCategory: Record<string, ShoppingListItem[]> = {};
        aggregatedIngredients.forEach(({ totalValue, unit }, name) => {
            const category = categoryMap.get(name) || categorizeIngredient(name);
            if (!shoppingListByCategory[category]) shoppingListByCategory[category] = [];
            shoppingListByCategory[category].push({ item: name, quantityValue: totalValue || null, quantityUnit: unit });
        });

        runInAction(() => {
            this.shoppingList = Object.entries(shoppingListByCategory).map(([category, items], idx) => ({
                category,
                items,
                sortOrder: idx
            })).sort((a, b) => a.category.localeCompare(b.category));
        });
        this.saveToDB();
    }

    setStepGoal(steps: number) {
        this.stepGoal = steps;
        this.saveToDB();
    }

    setHydrationGoal(liters: number) {
        this.hydrationGoalLiters = liters;
        this.saveToDB();
    }

    updateCurrentDayProgress(metric: keyof ProgressRecord, value: any) {
        if (this.currentDayProgress) {
            (this.currentDayProgress as any)[metric] = value;
            db.progressHistory.put(toJS(this.currentDayProgress));
            this.updateAchievements();
        }
    }

    updateCurrentDayProgressObject(updates: Partial<ProgressRecord>) {
        if (this.currentDayProgress) {
            Object.assign(this.currentDayProgress, updates);
            db.progressHistory.put(toJS(this.currentDayProgress));
            this.updateAchievements();
        }
    }

    updateHydrationStatus() {
        if (!this.currentDayProgress) return;
        const goalMl = this.hydrationGoalLiters * 1000;
        const currentMl = this.currentDayProgress.waterIntakeMl;
        const now = new Date();
        const hours = now.getHours();
        
        if (hours >= 10 && hours <= 21 && currentMl < goalMl * 0.5) {
            const lastTime = sessionStorage.getItem('lastHydrationSnackbarTime');
            const nowTs = Date.now();
            if (!lastTime || nowTs - parseInt(lastTime) > 4 * 3600 * 1000) {
                runInAction(() => {
                    this.hydrationSnackbar = {
                        visible: true,
                        time: now.toLocaleTimeString(),
                        amount: 250
                    };
                });
                sessionStorage.setItem('lastHydrationSnackbarTime', nowTs.toString());
            }
        }
    }

    getDayNutritionSummary(day: DayPlan): NutritionInfo {
        const summary: NutritionInfo = { carbs: 0, protein: 0, fat: 0, calories: 0 };
        day.meals.forEach(m => {
            if (m.nutrition) {
                summary.carbs += m.nutrition.carbs;
                summary.protein += m.nutrition.protein;
                summary.fat += m.nutrition.fat;
                summary.calories += m.nutrition.calories;
            }
        });
        return summary;
    }

    toggleAllItemsInMeal(mealIndex: number) {
        if (this.currentDayPlan && this.currentDayPlan.meals[mealIndex]) {
            const meal = this.currentDayPlan.meals[mealIndex];
            const allUsed = meal.items.every(i => i.used);
            meal.items.forEach((_, idx) => {
                if (meal.items[idx].used === allUsed) {
                    this.toggleMealItem(mealIndex, idx);
                }
            });
        }
    }

    resetMealToPreset(dayIndex: number, mealIndex: number) {
        runInAction(() => {
            if (dayIndex === -1 && this.currentDayPlan) {
                const dayName = this.currentDayPlan.day;
                const date = this.currentDayPlan.date;
                const freshLog = this.generateDailyLogFromGeneric(date, dayName);
                if (freshLog.meals[mealIndex]) {
                    this.currentDayPlan.meals[mealIndex] = freshLog.meals[mealIndex];
                    this.updateDailyLog(this.currentDayPlan);
                }
            } else if (this.presetMealPlan[dayIndex] && this.masterMealPlan[dayIndex]) {
                const presetMeal = JSON.parse(JSON.stringify(this.presetMealPlan[dayIndex].meals[mealIndex]));
                this.masterMealPlan[dayIndex].meals[mealIndex] = presetMeal;
                if (this.currentDayPlan && this.currentDayPlan.day === this.masterMealPlan[dayIndex].day) {
                    this.currentDayPlan.meals[mealIndex] = JSON.parse(JSON.stringify(presetMeal));
                    this.updateDailyLog(this.currentDayPlan);
                }
                this.saveToDB();
            }
        });
    }

    updateItemDescription(dayIndex: number, mealIndex: number, itemIndex: number, newDescription: string) {
        runInAction(() => {
            const meal = this.masterMealPlan[dayIndex]?.meals[mealIndex];
            if (meal && meal.items[itemIndex]) {
                meal.items[itemIndex].fullDescription = newDescription;
                const info = extractIngredientInfo(newDescription);
                meal.items[itemIndex].ingredientName = info.ingredientName;
                this.saveToDB();
                if (this.currentDayPlan && this.currentDayPlan.day === this.masterMealPlan[dayIndex].day) {
                    this.currentDayPlan.meals[mealIndex].items[itemIndex] = JSON.parse(JSON.stringify(meal.items[itemIndex]));
                    this.updateDailyLog(this.currentDayPlan);
                }
            }
        });
    }

    updateShoppingListCategoryOrder(categoryName: string, direction: 'up' | 'down') {
        const index = this.shoppingList.findIndex(c => c.category === categoryName);
        if (index === -1) return;
        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= this.shoppingList.length) return;

        const temp = this.shoppingList[index];
        this.shoppingList[index] = this.shoppingList[newIndex];
        this.shoppingList[newIndex] = temp;
        this.shoppingList.forEach((c, i) => c.sortOrder = i);
        this.saveToDB();
    }

    updateArchivedPlanName(id: string, newName: string) {
        const plan = this.archivedPlans.find(p => p.id === id);
        if (plan) {
            plan.name = newName;
            this.saveToDB();
        }
    }

    restorePlanFromArchive(id: string) {
        const archive = this.archivedPlans.find(p => p.id === id);
        if (archive) {
            this.masterMealPlan = JSON.parse(JSON.stringify(archive.plan));
            this.presetMealPlan = JSON.parse(JSON.stringify(archive.plan));
            this.shoppingList = JSON.parse(JSON.stringify(archive.shoppingList));
            this.currentPlanName = archive.name;
            this.currentPlanId = archive.id;
            this.archivedPlans = this.archivedPlans.filter(p => p.id !== id);
            this.status = AppStatus.SUCCESS;
            this.saveToDB();
            this.loadPlanForDate(this.currentDate);
        }
    }

    setWaterIntake(ml: number) {
        if (this.currentDayProgress) {
            this.currentDayProgress.waterIntakeMl = ml;
            db.progressHistory.put(toJS(this.currentDayProgress));
            this.updateAchievements();
        }
    }

    logWaterIntake(ml: number) {
        if (this.currentDayProgress) {
            this.currentDayProgress.waterIntakeMl += ml;
            db.progressHistory.put(toJS(this.currentDayProgress));
            this.updateAchievements();
        }
    }

    dismissHydrationSnackbar() {
        if (this.hydrationSnackbar) {
            this.hydrationSnackbar.visible = false;
        }
    }

    updateMealTime(dayIndex: number, mealIndex: number, time: string) {
        runInAction(() => {
            const meal = this.masterMealPlan[dayIndex]?.meals[mealIndex];
            if (meal) {
                meal.time = time;
                this.saveToDB();
                if (this.currentDayPlan && this.currentDayPlan.day === this.masterMealPlan[dayIndex].day) {
                    this.currentDayPlan.meals[mealIndex].time = time;
                    this.updateDailyLog(this.currentDayPlan);
                }
            }
        });
    }

    setSteps(steps: number) {
        if (this.currentDayProgress) {
            this.currentDayProgress.stepsTaken = steps;
            db.progressHistory.put(toJS(this.currentDayProgress));
            this.updateAchievements();
        }
    }

    logSteps(steps: number) {
        if (this.currentDayProgress) {
            this.currentDayProgress.stepsTaken += steps;
            db.progressHistory.put(toJS(this.currentDayProgress));
            this.updateAchievements();
        }
    }

    setBodyMetric(metric: keyof BodyMetrics, value: number | undefined) {
        this.bodyMetrics[metric] = value;
        this.saveToDB();
        if (this.currentDayProgress) {
            const updates: any = {};
            if (metric === 'weightKg') updates.weightKg = value;
            if (metric === 'heightCm') updates.heightCm = value;
            if (metric === 'bodyFatKg') updates.bodyFatKg = value;
            if (metric === 'bodyFatPercentage') updates.bodyFatPercentage = value;
            if (metric === 'leanMassKg') updates.leanMassKg = value;
            if (metric === 'bodyWaterLiters') updates.bodyWaterLiters = value;
            if (metric === 'bodyWaterPercentage') updates.bodyWaterPercentage = value;
            if (Object.keys(updates).length > 0) this.updateCurrentDayProgressObject(updates);
        }
        trackEvent('body_metrics_updated', { metric, value });
    }

    saveToDB = async () => {
        try {
            this.lastModified = Date.now();
            const dataToSave: Omit<StoredState, 'waterIntakeMl' | 'stepsTaken' | 'hasUnsavedChanges'> = {
                masterMealPlan: toJS(this.masterMealPlan),
                presetMealPlan: toJS(this.presetMealPlan),
                shoppingList: toJS(this.shoppingList),
                pantry: toJS(this.pantry),
                archivedPlans: toJS(this.archivedPlans),
                currentPlanName: this.currentPlanName,
                theme: this.theme,
                locale: this.locale,
                hydrationGoalLiters: this.hydrationGoalLiters,
                lastActiveDate: this.lastActiveDate,
                currentPlanId: this.currentPlanId,
                sentNotifications: Array.from(this.sentNotifications.entries()),
                stepGoal: this.stepGoal,
                bodyMetrics: toJS(this.bodyMetrics),
                startDate: this.startDate,
                endDate: this.endDate,
                shoppingListManaged: this.shoppingListManaged,
                lastModified: this.lastModified,
                showMacros: this.showMacros,
                showCheatMealButton: this.showCheatMealButton,
                showBodyMetricsInApp: this.showBodyMetricsInApp,
                bodyFatUnit: this.bodyFatUnit,
                bodyWaterUnit: this.bodyWaterUnit,
                isGenericPlan: this.isGenericPlan,
                genericPlanData: toJS(this.genericPlanData || undefined),
                genericPlanPreferences: toJS(this.genericPlanPreferences),
                planVersion: this.planVersion,
            };
            await db.appState.put({key: 'dietPlanData', value: dataToSave as StoredState});
        } catch (error) {
            console.error("Failed to save data", error);
        }
    }

    processImportedData = async (data: ImportedJsonData) => {
        try {
            const isGeneric = data.type === 'generic';
            runInAction(() => {
                this.shoppingList = (data.shoppingList || []).map((cat, index) => ({...cat, sortOrder: index}));
                this.pantry = data.pantry || [];
                this.currentPlanName = data.planName || 'My Diet Plan';
                this.showBodyMetricsInApp = data.showBodyMetricsInApp ?? false;
                if (data.stepGoal) this.stepGoal = data.stepGoal;
                if (data.hydrationGoalLiters) this.hydrationGoalLiters = data.hydrationGoalLiters;
                this.isGenericPlan = isGeneric;
                if (isGeneric && data.genericPlan) {
                    this.genericPlanData = data.genericPlan;
                    this.planToSet = []; 
                    this.genericPlanPreferences = {};
                } else {
                    const sanitizedPlan = (data.weeklyPlan || []).map(day => ({
                        ...day,
                        meals: day.meals.map(meal => ({
                            ...meal,
                            done: false,
                            actualNutrition: null,
                            items: (meal.items || []).map(item => ({...item, used: false}))
                        }))
                    }));
                    this.planToSet = sanitizedPlan;
                    this.genericPlanData = null;
                }
            });
            trackEvent('plan_imported', { type: isGeneric ? 'generic' : 'weekly' });
            if (data.startDate && data.endDate) {
                await this.commitNewPlan(data.startDate, data.endDate);
                this.navigateTo('list', true);
            } else {
                runInAction(() => { this.status = AppStatus.AWAITING_DATES; });
            }
        } catch (e: any) {
            console.error("Import failed", e);
            runInAction(() => { this.status = AppStatus.ERROR; this.error = `Failed: ${e.message}`; });
        }
    }

    importPlanFromUrl = async (url: string) => {
        runInAction(() => { this.status = AppStatus.IMPORTING; });
        try {
            const data = await readSharedFile(url);
            await this.processImportedData(data);
        } catch (e: any) {
            runInAction(() => { this.status = AppStatus.ERROR; this.error = `Failed: ${e.message}`; });
        }
    }

    processJsonFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                await this.processImportedData(data);
            } catch (error: any) {
                runInAction(() => { this.status = AppStatus.ERROR; this.error = "Invalid JSON file."; });
            }
        };
        reader.readAsText(file);
    };

    cancelNewPlan = () => {
        this.status = AppStatus.SUCCESS;
        this.planToSet = null;
        if (!this.currentPlanId) this.navigateTo('upload');
    }

    commitNewPlan = async (startDate: string, endDate: string) => {
        runInAction(() => {
            if (this.masterMealPlan.length > 0 || (this.isGenericPlan && this.genericPlanData)) {
                const currentPlanToArchive: ArchivedPlan = {
                    id: this.currentPlanId || Date.now().toString(),
                    name: this.currentPlanName,
                    date: new Date().toLocaleDateString(this.locale === 'it' ? 'it-IT' : 'en-GB'),
                    plan: this.masterMealPlan, 
                    shoppingList: this.shoppingList
                };
                this.archivedPlans.push(currentPlanToArchive);
            }
            if (!this.isGenericPlan && this.planToSet) {
                this.masterMealPlan = this.planToSet!;
                this.presetMealPlan = JSON.parse(JSON.stringify(this.planToSet));
            } else {
                this.masterMealPlan = [];
                this.presetMealPlan = [];
            }
            this.startDate = startDate;
            this.endDate = endDate;
            this.status = AppStatus.SUCCESS;
            this.shoppingListManaged = false;
            this.sentNotifications.clear();
            this.lastActiveDate = getTodayDateString();
            this.currentPlanId = Date.now().toString();
            this.currentDate = getTodayDateString();
            this.planToSet = null;
            this.planVersion = (this.planVersion || 0) + 1;
        });
        await db.dailyLogs.clear();
        this.saveToDB();
        this.loadPlanForDate(this.currentDate);
    }

    private generateDailyLogFromGeneric(dateStr: string, dayName: string): DailyLog {
        if (!this.genericPlanData) throw new Error("No generic plan data available");
        const preferences = this.genericPlanPreferences[dayName.toUpperCase()] || {};
        const generatedMeals: Meal[] = [];

        const processSection = (sectionTitle: string, sectionKey: string, options: Meal[], sectionTime?: string) => {
            const selectedIndices = preferences[sectionKey];
            options.forEach((option, index) => {
                if (selectedIndices && !selectedIndices.includes(index)) return;
                generatedMeals.push({
                    ...toJS(option),
                    done: false,
                    cheat: false,
                    section: sectionTitle,
                    time: option.time || sectionTime,
                    items: option.items.map(i => ({ ...toJS(i), used: false }))
                });
            });
        };

        const processModular = (sectionTitle: string, modularData: any, sectionKeyPrefix: string) => {
            const time = modularData.time;
            processSection(`${sectionTitle} - CARBOIDRATI`, `${sectionKeyPrefix}_carbs`, modularData.carbs, time);
            processSection(`${sectionTitle} - PROTEINE`, `${sectionKeyPrefix}_protein`, modularData.protein, time);
            processSection(`${sectionTitle} - VERDURE`, `${sectionKeyPrefix}_vegetables`, modularData.vegetables, time);
            processSection(`${sectionTitle} - GRASSI`, `${sectionKeyPrefix}_fats`, modularData.fats, time);
        };

        const allSnacks = [...(this.genericPlanData.snacks || []), ...(this.genericPlanData.snack1 || []), ...(this.genericPlanData.snack2 || [])];
        
        processSection("COLAZIONE", "breakfast", this.genericPlanData.breakfast);
        if (allSnacks.length > 0) processSection("SPUNTINO MATTINA", "snacks_morning", allSnacks, this.genericPlanData.morningSnackTime);
        
        processModular("PRANZO", this.genericPlanData.lunch, "lunch");
        
        if (allSnacks.length > 0) processSection("MERENDA", "snacks_afternoon", allSnacks, this.genericPlanData.afternoonSnackTime);
        
        processModular("CENA", this.genericPlanData.dinner, "dinner");

        return { date: dateStr, day: dayName, meals: generatedMeals };
    }

    async loadPlanForDate(dateStr: string) {
        try {
            const progressRecord = await db.progressHistory.where('date').equals(dateStr).first();
            if (progressRecord) this.currentDayProgress = progressRecord;
            else {
                const latestRecord = await db.progressHistory.where('date').below(dateStr).last();
                const newRecord: ProgressRecord = {
                    date: dateStr, adherence: 0, plannedCalories: 0, actualCalories: 0, stepsTaken: 0, waterIntakeMl: 0,
                    weightKg: latestRecord?.weightKg ?? this.bodyMetrics.weightKg,
                    bodyFatKg: latestRecord?.bodyFatKg ?? this.bodyMetrics.bodyFatKg,
                    bodyFatPercentage: latestRecord?.bodyFatPercentage ?? this.bodyMetrics.bodyFatPercentage,
                    leanMassKg: latestRecord?.leanMassKg ?? this.bodyMetrics.leanMassKg,
                    bodyWaterLiters: latestRecord?.bodyWaterLiters ?? this.bodyMetrics.bodyWaterLiters,
                    bodyWaterPercentage: latestRecord?.bodyWaterPercentage ?? this.bodyMetrics.bodyWaterPercentage,
                    activityHours: 1, estimatedCaloriesBurned: 0
                };
                this.currentDayProgress = newRecord;
            }
        } catch (e) {}

        if (!this.masterMealPlan.length && !this.isGenericPlan) {
            runInAction(() => { this.currentDayPlan = null; });
            return;
        }

        try {
            let dailyLog = await db.dailyLogs.where('date').equals(dateStr).first();
            if (!dailyLog) {
                const date = new Date(dateStr);
                const dayIndex = (date.getDay() + 6) % 7;
                const dayName = DAY_KEYWORDS[dayIndex];
                if (this.isGenericPlan && this.genericPlanData) {
                    dailyLog = this.generateDailyLogFromGeneric(dateStr, dayName);
                    await db.dailyLogs.put(dailyLog);
                } else {
                    const masterDay = this.masterMealPlan.find(d => d.day.toUpperCase() === dayName);
                    if (masterDay) {
                        dailyLog = {...JSON.parse(JSON.stringify(masterDay)), date: dateStr};
                        dailyLog!.meals.forEach(meal => {
                            meal.done = false; meal.cheat = false; meal.actualNutrition = null;
                            meal.items.forEach(item => item.used = false);
                        });
                        await db.dailyLogs.put(dailyLog!);
                    }
                }
            }
            runInAction(() => { this.currentDayPlan = dailyLog || null; });
        } catch (e) {
            runInAction(() => { this.currentDayPlan = null; });
        }
    }

    toggleMealDone = (mealIndex: number) => {
        if (this.currentDayPlan) {
            const meal = this.currentDayPlan.meals[mealIndex];
            meal.done = !meal.done;
            
            this.updatePantryFromMeal(meal, !meal.done);
            
            if (meal.done && !meal.cheat && !meal.actualNutrition && this.onlineMode) {
                this.recalculateActualMealNutrition(mealIndex);
            }
            this.updateDailyLog(this.currentDayPlan);
            this.updateAchievements();
            trackEvent('meal_toggled', { status: meal.done ? 'done' : 'todo', mealName: meal.name });
        }
    }

    toggleSectionDone = (mealIndices: number[]) => {
        if (this.currentDayPlan && mealIndices.length > 0) {
            const firstMeal = this.currentDayPlan.meals[mealIndices[0]];
            const newState = !firstMeal.sectionDone;
            
            runInAction(() => {
                mealIndices.forEach(idx => {
                    const meal = this.currentDayPlan!.meals[idx];
                    meal.sectionDone = newState;
                });
            });
            
            this.updateDailyLog(this.currentDayPlan);
            trackEvent('section_toggled', { status: newState ? 'done' : 'todo', section: firstMeal.section });
        }
    }

    toggleMealItem = (mealIndex: number, itemIndex: number) => {
        if (this.currentDayPlan) {
            const item = this.currentDayPlan.meals[mealIndex].items[itemIndex];
            item.used = !item.used;
            
            this.updatePantryFromItem(item, !item.used);
            
            this.updateDailyLog(this.currentDayPlan);
        }
    }

    updateDailyLog(log: DailyLog) {
        db.dailyLogs.put(toJS(log));
        this.updateStatsForDate(log.date);
    }

    async updateStatsForDate(date: string) {
        if (!this.currentDayProgress || this.currentDayProgress.date !== date) return; 
        const log = this.currentDayPlan;
        if (!log) return;
        const totalMeals = log.meals.length;
        const doneMeals = log.meals.filter(m => m.done).length;
        const adherence = totalMeals > 0 ? (doneMeals / totalMeals) * 100 : 0;
        let plannedCals = 0;
        let actualCals = 0;
        log.meals.forEach(m => {
            if (m.nutrition) plannedCals += m.nutrition.calories;
            if (m.actualNutrition) actualCals += m.actualNutrition.calories;
            else if (m.done && m.nutrition && !m.cheat) actualCals += m.nutrition.calories; 
        });
        runInAction(() => {
            this.currentDayProgress!.adherence = adherence;
            this.currentDayProgress!.plannedCalories = plannedCals;
            this.currentDayProgress!.actualCalories = actualCals;
        });
        await db.progressHistory.put(toJS(this.currentDayProgress!));
    }

    logCheatMeal = (mealIndex: number, description: string) => {
        if (this.currentDayPlan) {
            const meal = this.currentDayPlan.meals[mealIndex];
            meal.cheat = true;
            meal.cheatMealDescription = description;
            meal.done = true;
            this.updateDailyLog(this.currentDayPlan);
            this.updateAchievements();
        }
    }

    undoCheatMeal = (mealIndex: number) => {
        if (this.currentDayPlan) {
            const meal = this.currentDayPlan.meals[mealIndex];
            meal.cheat = false;
            meal.cheatMealDescription = undefined;
            meal.done = false;
            this.updateDailyLog(this.currentDayPlan);
        }
    }

    addShoppingListCategory(categoryName: string) {
        if (!this.shoppingList.find(c => c.category === categoryName)) {
            this.shoppingList.push({ category: categoryName, items: [] });
            this.saveToDB();
        }
    }

    addShoppingListItem(category: string, item: ShoppingListItem) {
        const cat = this.shoppingList.find(c => c.category === category);
        if (cat) { cat.items.push(item); this.saveToDB(); }
    }

    updateShoppingListItem(category: string, itemIndex: number, newItem: ShoppingListItem) {
        const cat = this.shoppingList.find(c => c.category === category);
        if (cat) { cat.items[itemIndex] = newItem; this.saveToDB(); }
    }

    deleteShoppingListItem(category: string, itemIndex: number) {
        const cat = this.shoppingList.find(c => c.category === category);
        if (cat) { cat.items.splice(itemIndex, 1); this.saveToDB(); }
    }

    moveShoppingItemToPantry(item: ShoppingListItem, category: string) {
        const cat = this.shoppingList.find(c => c.category === category);
        if (cat) {
            const index = cat.items.findIndex(i => i.item === item.item);
            if (index > -1) cat.items.splice(index, 1);
        }
        this.addPantryItem(item.item, item.quantityValue, item.quantityUnit, category);
        this.saveToDB();
    }

    addPantryItem(item: string, quantityValue: number | null, quantityUnit: string, category: string) {
        const existing = this.pantry.find(p => p.item === item);
        if (existing) { 
            existing.quantityValue = quantityValue; 
            existing.quantityUnit = quantityUnit; 
            existing.originalQuantityValue = quantityValue;
            existing.originalQuantityUnit = quantityUnit;
        }
        else {
            this.pantry.push({
                item, quantityValue, quantityUnit, originalCategory: category,
                originalQuantityValue: quantityValue, originalQuantityUnit: quantityUnit
            });
        }
        this.saveToDB();
    }

    updatePantryItem(item: string, updates: Partial<PantryItem>) {
        const index = this.pantry.findIndex(p => p.item === item);
        if (index > -1) {
            this.pantry[index] = { ...this.pantry[index], ...updates };
            this.saveToDB();
        }
    }

    movePantryItemToShoppingList(pantryItem: PantryItem, removeFromPantry: boolean = true) {
        if (removeFromPantry) {
            this.pantry = this.pantry.filter(p => p.item !== pantryItem.item);
        }
        let category = pantryItem.originalCategory || 'Altro';
        if (!this.shoppingList.find(c => c.category === category)) this.addShoppingListCategory(category);
        this.addShoppingListItem(category, {
            item: pantryItem.item,
            quantityValue: pantryItem.originalQuantityValue ?? pantryItem.quantityValue,
            quantityUnit: pantryItem.originalQuantityUnit ?? pantryItem.quantityUnit
        });
        this.saveToDB();
    }

    get expiringSoonItems() {
        return this.pantry.filter(p => {
            if (!p.expiryDate) return false;
            const diff = new Date(p.expiryDate).getTime() - new Date().getTime();
            return diff / (1000 * 3600 * 24) <= 7 && diff >= 0;
        });
    }

    get lowStockItems() {
        return this.pantry.filter(p => {
            if (p.quantityValue === null) return false;
            
            if (p.lowStockThreshold) {
                const threshold = parseQuantity(p.lowStockThreshold)?.value;
                if (threshold !== null && p.quantityValue <= threshold) return true;
            }

            if (p.originalQuantityValue !== undefined && p.originalQuantityValue !== null && p.originalQuantityValue > 0) {
                if (p.quantityValue <= p.originalQuantityValue * 0.3) return true;
            }

            if (p.quantityValue <= 0) return true;

            return false;
        });
    }

    get expiredItems() {
        return this.pantry.filter(p => p.expiryDate && new Date(p.expiryDate) < new Date());
    }

    updateAchievements() {
        const newAchievements: string[] = [];
        if (this.progressHistory.some(p => p.waterIntakeMl > 0)) newAchievements.push('firstHydration');
        newAchievements.forEach(a => { if (!this.earnedAchievements.includes(a)) this.earnedAchievements.push(a); });
    }

    public startSimulationClassic = async () => {
        const today = getTodayDateString();
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        const endDateStr = nextMonth.toISOString().split('T')[0];

        const samplePlan: DayPlan[] = DAY_KEYWORDS.map(day => ({
            day,
            meals: [
                { 
                    name: 'COLAZIONE', title: 'Yogurt e Avena', time: '08:00', done: false,
                    items: [
                        { ingredientName: 'Yogurt Greco', fullDescription: '150g Yogurt Greco', used: false },
                        { ingredientName: 'Avena', fullDescription: '40g Avena', used: false }
                    ],
                    nutrition: { calories: 250, carbs: 30, protein: 18, fat: 5 }
                },
                { 
                    name: 'PRANZO', title: 'Riso e Pollo', time: '13:00', done: false,
                    items: [
                        { ingredientName: 'Riso Basmati', fullDescription: '80g Riso Basmati', used: false },
                        { ingredientName: 'Petto di Pollo', fullDescription: '120g Petto di Pollo', used: false },
                        { ingredientName: 'Zucchine', fullDescription: '200g Zucchine', used: false }
                    ],
                    nutrition: { calories: 450, carbs: 60, protein: 35, fat: 8 }
                },
                { 
                    name: 'CENA', title: 'Salmone e Patate', time: '20:00', done: false,
                    items: [
                        { ingredientName: 'Salmone', fullDescription: '150g Salmone fresco', used: false },
                        { ingredientName: 'Patate', fullDescription: '200g Patate al vapore', used: false }
                    ],
                    nutrition: { calories: 500, carbs: 40, protein: 30, fat: 22 }
                }
            ]
        }));

        runInAction(() => {
            this.isGenericPlan = false;
            this.genericPlanData = null;
            this.masterMealPlan = samplePlan;
            this.presetMealPlan = JSON.parse(JSON.stringify(samplePlan));
            this.startDate = today;
            this.endDate = endDateStr;
            this.currentPlanId = 'sim_classic_' + Date.now();
            this.currentPlanName = 'Simulazione Piano Classico';
            this.status = AppStatus.SUCCESS;
            this.showMacros = true;
            this.shoppingList = [
                { category: 'Carne', items: [{ item: 'Petto di Pollo', quantityValue: 840, quantityUnit: 'g' }] },
                { category: 'Pesce', items: [{ item: 'Salmone fresco', quantityValue: 1050, quantityUnit: 'g' }] },
                { category: 'Latticini e Derivati', items: [{ item: 'Yogurt Greco', quantityValue: 1050, quantityUnit: 'g' }] },
            ];
        });
        await db.dailyLogs.clear();
        await this.saveToDB();
        await this.loadPlanForDate(this.currentDate);
        this.navigateTo('dashboard');
    }

    public startSimulationGeneric = async () => {
        const today = getTodayDateString();
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        
        const genericData: GenericPlanData = {
            breakfast: [
                { name: 'Opzione 1', title: 'Yogurt', items: [{ ingredientName: 'Yogurt', fullDescription: '150g Yogurt', used: false }], done: false, time: '08:00' },
                { name: 'Opzione 2', title: 'Uova', items: [{ ingredientName: 'Uova', fullDescription: '2 Uova', used: false }], done: false, time: '08:00' }
            ],
            snacks: [
                { name: 'Opzione 1', title: 'Frutto', items: [{ ingredientName: 'Mela', fullDescription: '1 Mela', used: false }], done: false, time: '10:30' }
            ],
            morningSnackTime: '10:30',
            afternoonSnackTime: '16:30',
            lunch: {
                carbs: [{ name: 'Riso', items: [{ ingredientName: 'Riso', fullDescription: '80g Riso', used: false }], done: false }],
                protein: [{ name: 'Pollo', items: [{ ingredientName: 'Pollo', fullDescription: '150g Pollo', used: false }], done: false }],
                vegetables: [{ name: 'Miste', items: [{ ingredientName: 'Insalata', fullDescription: '100g Insalata', used: false }], done: false }],
                fats: [{ name: 'Olio', items: [{ ingredientName: 'Olio EVO', fullDescription: '10g Olio EVO', used: false }], done: false }],
                suggestions: [],
                time: '13:00'
            },
            dinner: {
                carbs: [{ name: 'Pane', items: [{ ingredientName: 'Pane', fullDescription: '50g Pane', used: false }], done: false }],
                protein: [{ name: 'Pesce', items: [{ ingredientName: 'Merluzzo', fullDescription: '200g Merluzzo', used: false }], done: false }],
                vegetables: [{ name: 'Grigliate', items: [{ ingredientName: 'Verdure', fullDescription: '200g Verdure', used: false }], done: false }],
                fats: [{ name: 'Noci', items: [{ ingredientName: 'Noci', fullDescription: '15g Noci', used: false }], done: false }],
                suggestions: [],
                time: '20:00'
            }
        };

        runInAction(() => {
            this.isGenericPlan = true;
            this.genericPlanData = genericData;
            this.masterMealPlan = [];
            this.presetMealPlan = [];
            this.startDate = today;
            this.endDate = nextMonth.toISOString().split('T')[0];
            this.currentPlanId = 'sim_generic_' + Date.now();
            this.currentPlanName = 'Simulazione Piano Generico';
            this.status = AppStatus.SUCCESS;
            this.showMacros = false;
        });
        await db.dailyLogs.clear();
        await this.saveToDB();
        await this.loadPlanForDate(this.currentDate);
        this.navigateTo('dashboard');
    }

    public exitSimulation = async () => { await db.appState.clear(); await db.dailyLogs.clear(); window.location.reload(); }
}

export const mealPlanStore = new MealPlanStore();
