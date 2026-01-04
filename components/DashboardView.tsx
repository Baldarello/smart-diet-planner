
import React, { useState } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { authStore } from '../stores/AuthStore';
import { uiStore } from '../stores/UIStore';
import { t } from '../i18n';
import { ClockIcon, FlameIcon, WaterDropIcon, StepsIcon, TodayIcon, WarningIcon, PantryIcon } from './Icons';
import ProgressChart from './ProgressChart';
import { Meal, PantryItem } from '../types';
import AchievementsModal from './AchievementsModal';
import { formatQuantity } from '../utils/quantityParser';

const CircularProgress: React.FC<{
    progress: number;
    goal: number;
    label: string;
    unit: string;
    color: string;
    icon: React.ReactNode;
}> = ({ progress, goal, label, unit, color, icon }) => {
    const radius = 50;
    const stroke = 10;
    const normalizedRadius = radius - stroke * 2;
    const circumference = normalizedRadius * 2 * Math.PI;
    const progressPercentage = goal > 0 ? Math.min((progress / goal) * 100, 100) : 0;
    const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

    return (
        <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-gray-700/50 rounded-2xl h-full">
            <div className="relative">
                <svg height={radius * 2} width={radius * 2} className="transform -rotate-90">
                    <circle
                        stroke="currentColor"
                        className="text-gray-200 dark:text-gray-600"
                        fill="transparent"
                        strokeWidth={stroke}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                    />
                    <circle
                        stroke="currentColor"
                        className={color}
                        fill="transparent"
                        strokeWidth={stroke}
                        strokeDasharray={circumference + ' ' + circumference}
                        style={{ strokeDashoffset }}
                        r={normalizedRadius}
                        cx={radius}
                        cy={radius}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-2xl" style={{ color: color.replace('text-', '') }}>
                    {icon}
                </div>
            </div>
            <p className="font-bold text-xl text-gray-800 dark:text-gray-200 mt-2">{Math.round(progress)} <span className="text-sm font-medium text-gray-500 dark:text-gray-400">/ {goal} {unit}</span></p>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">{label}</p>
        </div>
    );
};


const UpcomingMealCard: React.FC<{ meal: Meal, isGeneric?: boolean }> = ({ meal, isGeneric }) => {
    // For generic plans, the 'name' might be an ingredient (e.g. Bread).
    // We want to show the section name (e.g. Dinner) instead.
    const displayTitle = isGeneric && meal.section 
        ? meal.section.split(' - ')[0] 
        : meal.name;
    
    const displaySubtitle = isGeneric && meal.section 
        ? meal.name 
        : meal.title;

    return (
        <div className="bg-slate-50 dark:bg-gray-700/50 p-4 rounded-xl flex items-start gap-4">
            <div className="bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300 p-2 rounded-full mt-1">
                <ClockIcon />
            </div>
            <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wide">{displayTitle}</p>
                {displaySubtitle && <p className="text-sm text-violet-600 dark:text-violet-400 font-medium">{displaySubtitle}</p>}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{meal.time}</p>
            </div>
        </div>
    );
};

const StreakItem: React.FC<{ count: number, label: string, icon: React.ReactNode }> = ({ count, label, icon }) => {
    if (count < 2) return null;
    return (
        <div className="flex items-center gap-3 bg-slate-50 dark:bg-gray-700/50 p-3 rounded-xl">
            <div className="text-orange-500">{icon}</div>
            <div>
                <p className="font-bold text-lg text-gray-800 dark:text-gray-200">{count} {t('days')}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
            </div>
        </div>
    );
};

const AlertItem: React.FC<{ item: any, type: 'expired' | 'expiring' | 'stock' | 'shopping', onClick: () => void }> = ({ item, type, onClick }) => {
    const isDateAlert = type === 'expiring' || type === 'expired';
    
    let date = '';
    if (isDateAlert && item.expiryDate) {
        try {
            const [year, month, day] = item.expiryDate.split('-');
            date = `${day}/${month}/${year}`;
        } catch(e) {
            date = item.expiryDate;
        }
    }

    const config = {
        expired: {
            iconBg: 'bg-red-100 text-red-500 dark:bg-red-900/50',
            text: `${t('itemExpired')} (${date})`,
        },
        expiring: {
            iconBg: 'bg-orange-100 text-orange-500 dark:bg-orange-900/50',
            text: t('expiresOn', { date }),
        },
        stock: {
            iconBg: item.quantityValue !== null && item.quantityValue <= 0 
                ? 'bg-red-100 text-red-600 dark:bg-red-900/60 font-bold' 
                : 'bg-yellow-100 text-yellow-500 dark:bg-yellow-900/50',
            text: item.quantityValue !== null && item.quantityValue <= 0 
                ? t('itemFinished') 
                : formatQuantity(item.quantityValue, item.quantityUnit),
        },
        shopping: {
            iconBg: 'bg-blue-100 text-blue-500 dark:bg-blue-900/50',
            text: t('shoppingListAlert'),
        }
    }[type];

    return (
        <button onClick={onClick} className="w-full text-left p-3 rounded-lg flex items-center gap-3 bg-slate-50 dark:bg-gray-700/50 hover:bg-slate-100 dark:hover:bg-gray-700">
            <div className={`flex-shrink-0 p-1.5 rounded-full ${config.iconBg}`}>
                <WarningIcon />
            </div>
            <div>
                <p className="font-semibold text-sm text-gray-800 dark:text-gray-200">{item.item || item.item}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{config.text}</p>
            </div>
        </button>
    );
};

const DashboardView: React.FC = observer(() => {
    const store = mealPlanStore;
    const user = authStore.userProfile;

    const getTodayDateString = () => new Date().toLocaleDateString('en-CA');

    const handleGoToToday = () => {
        store.setCurrentDate(getTodayDateString());
        store.navigateTo('daily');
    };
    
    const handleGoToPantry = () => {
        store.navigateTo('pantry');
    };
    
    const handleGoToShoppingList = () => {
        store.navigateTo('list');
    };

    const welcomeMessage = () => {
        if (user && user.name) {
            return t('dashboardWelcome', { name: user.name.split(' ')[0] });
        }
        return t('dashboardWelcome').split(',')[0] + '!';
    };

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    const pendingMeals = store.dailyPlan?.meals
        .filter(meal => !meal.done && !meal.cheat) || [];
    
    const sortedPending = [...pendingMeals].sort((a, b) => (a.time ?? '00:00').localeCompare(b.time ?? '00:00'));
    
    let nextMeals = sortedPending.filter(meal => (meal.time ?? '00:00') >= currentTime).slice(0, 1);
    
    if (nextMeals.length === 0 && sortedPending.length > 0) {
        nextMeals = [sortedPending[0]];
    }

    const stepsProgress = store.currentDayProgress?.stepsTaken ?? 0;
    const waterProgress = store.currentDayProgress?.waterIntakeMl ?? 0;
    const waterGoalMl = store.hydrationGoalLiters * 1000;
    
    const last7DaysHistory = store.progressHistory.slice(-7);
    const weightLabels = last7DaysHistory.map(d => {
        try {
            const [year, month, day] = d.date.split('-');
            return `${day}/${month}`;
        } catch {
            return d.date;
        }
    });
    const weightData = last7DaysHistory.map(d => d.weightKg);

    const validWeightData = weightData.filter(w => w != null && !isNaN(w as number)) as number[];
    let yAxisMin: number | undefined = undefined;
    let yAxisMax: number | undefined = undefined;

    if (validWeightData.length > 0) {
        const minWeight = Math.min(...validWeightData);
        const maxWeight = Math.max(...validWeightData);
        yAxisMin = Math.floor(minWeight - 5);
        yAxisMax = Math.ceil(maxWeight + 5);
    }

    const { adherenceStreak, hydrationStreak, expiringSoonItems, lowStockItems, expiredItems, shoppingList } = store;
    
    const shoppingItems = shoppingList.flatMap(cat => cat.items);
    
    const hasAlerts = expiredItems.length > 0 || expiringSoonItems.length > 0 || lowStockItems.length > 0 || shoppingItems.length > 0;

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">{welcomeMessage()}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{t('dashboardSubtitle')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">{t('upcomingMeals')}</h2>
                            <button 
                                onClick={handleGoToToday} 
                                className="flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors"
                                title={t('goToTodayView')}
                            >
                                <TodayIcon />
                                <span className="hidden sm:inline">{t('goToToday')}</span>
                            </button>
                        </div>
                        {nextMeals && nextMeals.length > 0 ? (
                            <div className="space-y-3">
                                {nextMeals.map((meal, index) => <UpcomingMealCard key={index} meal={meal} isGeneric={store.isGenericPlan} />)}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 dark:text-gray-400 py-4">{t('noUpcomingMeals')}</p>
                        )}
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                         <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">{t('dashboardPantryAlerts')}</h2>
                            <button 
                                onClick={handleGoToPantry} 
                                className="flex items-center gap-2 text-sm font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors"
                                title={t('tabPantry')}
                            >
                                <PantryIcon />
                                <span className="hidden sm:inline">{t('tabPantry')}</span>
                            </button>
                        </div>
                        {hasAlerts ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                                {shoppingItems.length > 0 && (
                                    <div className="sm:col-span-2">
                                        <h3 className="font-semibold text-blue-600 dark:text-blue-400 mb-2">{t('dashboardMissingItems')}</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {shoppingItems.map((item, idx) => (
                                                <AlertItem key={`${item.item}-${idx}`} item={item} type="shopping" onClick={handleGoToShoppingList} />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {expiredItems.length > 0 && (
                                    <div className="sm:col-span-2 md:col-span-1">
                                        <h3 className="font-semibold text-red-600 dark:text-red-400 mb-2">{t('dashboardExpired')}</h3>
                                        <div className="space-y-2">
                                            {expiredItems.map(item => <AlertItem key={item.item} item={item} type="expired" onClick={handleGoToPantry} />)}
                                        </div>
                                    </div>
                                )}
                                {expiringSoonItems.length > 0 && (
                                    <div className="sm:col-span-2 md:col-span-1">
                                        <h3 className="font-semibold text-orange-600 dark:text-orange-400 mb-2">{t('dashboardExpiringSoon')}</h3>
                                        <div className="space-y-2">
                                            {expiringSoonItems.map(item => <AlertItem key={item.item} item={item} type="expiring" onClick={handleGoToPantry} />)}
                                        </div>
                                    </div>
                                )}
                                {lowStockItems.length > 0 && (
                                    <div className="sm:col-span-2 md:col-span-1">
                                        <h3 className="font-semibold text-yellow-600 dark:text-yellow-400 mb-2">{t('dashboardLowStock')}</h3>
                                        <div className="space-y-2">
                                            {lowStockItems.map(item => <AlertItem key={item.item} item={item} type="stock" onClick={handleGoToPantry} />)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 dark:text-gray-400 py-4">{t('dashboardNoAlerts')}</p>
                        )}
                    </div>
                    
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                         <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300">{t('streaksAndAchievements')}</h2>
                            <button 
                                onClick={() => uiStore.showAchievementsModal()}
                                className="text-sm font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-gray-700/50 p-2 rounded-lg transition-colors"
                            >
                                {t('viewAllAchievements')}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <StreakItem count={adherenceStreak} label={t('adherenceStreak')} icon={<FlameIcon />} />
                            <StreakItem count={hydrationStreak} label={t('hydrationStreak')} icon={<WaterDropIcon />} />
                        </div>
                    </div>

                </div>

                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                        <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4">{t('todaysProgress')}</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <CircularProgress progress={stepsProgress} goal={store.stepGoal} label={t('steps')} unit="" color="text-teal-500" icon={<StepsIcon />} />
                            <CircularProgress progress={waterProgress} goal={waterGoalMl} label={t('hydration')} unit="ml" color="text-blue-500" icon={<WaterDropIcon />} />
                        </div>
                    </div>
                    {weightData.some(d => d != null) && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg overflow-hidden">
                            <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4">{t('weightTrend')}</h2>
                            <ProgressChart
                                type="line"
                                labels={weightLabels}
                                datasets={[ { label: t('weight'), data: weightData, color: 'rgba(139, 92, 246, 1)', unit: t('unitKg') } ]}
                                yAxisMin={yAxisMin}
                                yAxisMax={yAxisMax}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default DashboardView;
