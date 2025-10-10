import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { authStore } from '../stores/AuthStore';
import { t } from '../i18n';
import { ClockIcon, FlameIcon, TrophyIcon, WaterDropIcon, StepsIcon, TodayIcon, FootprintIcon } from './Icons';
import ProgressChart from './ProgressChart';
import { Meal } from '../types';

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
    const progressPercentage = goal > 0 ? (progress / goal) * 100 : 0;
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


const UpcomingMealCard: React.FC<{ meal: Meal }> = ({ meal }) => (
    <div className="bg-slate-50 dark:bg-gray-700/50 p-4 rounded-xl flex items-start gap-4">
        <div className="bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300 p-2 rounded-full mt-1">
            <ClockIcon />
        </div>
        <div>
            <p className="font-semibold text-gray-800 dark:text-gray-200">{meal.name}</p>
            <p className="text-sm text-violet-600 dark:text-violet-400 font-medium">{meal.title}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{meal.time}</p>
        </div>
    </div>
);

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

const AchievementCard: React.FC<{ label: string; icon: React.ReactNode; color: string }> = ({ label, icon, color }) => {
    const bgClass = `bg-${color}-50 dark:bg-${color}-900/30`;
    const textClass = `text-${color}-800 dark:text-${color}-200`;
    const iconColorClass = `text-${color}-500`;

    // A small hack because Tailwind CSS purges dynamic classes. We list them all here so they are preserved.
    const hiddenClasses = "bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-amber-500 bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-red-500 bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-blue-500 bg-teal-50 dark:bg-teal-900/30 text-teal-800 dark:text-teal-200 text-teal-500";

    return (
        <div className={`flex items-center gap-3 p-3 rounded-xl ${bgClass}`}>
            <div className={iconColorClass}>{icon}</div>
            <p className={`font-semibold text-sm ${textClass}`}>{label}</p>
        </div>
    );
};


const DashboardView: React.FC = observer(() => {
    const store = mealPlanStore;
    const user = authStore.userProfile;

    const getTodayDateString = () => new Date().toLocaleDateString('en-CA');

    const handleGoToToday = () => {
        store.setCurrentDate(getTodayDateString());
        store.setActiveTab('daily');
    };

    // Upcoming meals
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const upcomingMeals = store.dailyPlan?.meals
        .filter(meal => !meal.done && !meal.cheat && (meal.time ?? '00:00') >= currentTime)
        .slice(0, 1);

    // Progress data
    const stepsProgress = store.currentDayProgress?.stepsTaken ?? 0;
    const waterProgress = store.currentDayProgress?.waterIntakeMl ?? 0;
    const waterGoalMl = store.hydrationGoalLiters * 1000;
    
    // Chart data
    const last7DaysHistory = store.progressHistory.slice(-7);
    const weightLabels = last7DaysHistory.map(d => new Date(d.date).toLocaleDateString(store.locale, { month: 'short', day: 'numeric' }));
    const weightData = last7DaysHistory.map(d => d.weightKg);

    // Calculate focused Y-axis for weight chart
    const validWeightData = weightData.filter(w => w != null && !isNaN(w as number)) as number[];
    let yAxisMin: number | undefined = undefined;
    let yAxisMax: number | undefined = undefined;

    if (validWeightData.length > 0) {
        const minWeight = Math.min(...validWeightData);
        const maxWeight = Math.max(...validWeightData);
        yAxisMin = Math.floor(minWeight - 5);
        yAxisMax = Math.ceil(maxWeight + 5);
    }

    // Streaks & Achievements
    const { adherenceStreak, hydrationStreak, achievements } = store;
    
    const achievementsConfig: { [key: string]: { label: string; icon: React.ReactNode; color: string } } = {
        firstWeekComplete: { label: t('achievementFirstWeek'), icon: <TrophyIcon />, color: 'amber' },
        fiveKgLost: { label: t('achievement5kgLost'), icon: <TrophyIcon />, color: 'blue' },
        perfectWeekAdherence: { label: t('achievementPerfectWeekAdherence'), icon: <TrophyIcon />, color: 'amber' },
        perfectWeekHydration: { label: t('achievementPerfectWeekHydration'), icon: <TrophyIcon />, color: 'amber' },
        achievementMonthComplete: { label: t('achievementMonthComplete'), icon: <TrophyIcon />, color: 'red' },
        achievement10kgLost: { label: t('achievement10kgLost'), icon: <TrophyIcon />, color: 'blue' },
        achievementStepMarathon: { label: t('achievementStepMarathon'), icon: <FootprintIcon />, color: 'teal' },
    };


    return (
        <div className="max-w-6xl mx-auto animate-slide-in-up space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">{t('dashboardWelcome', { name: user?.name.split(' ')[0] || '' })}</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">{t('dashboardSubtitle')}</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Content Column */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Upcoming Meals */}
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
                        {upcomingMeals && upcomingMeals.length > 0 ? (
                            <div className="space-y-3">
                                {upcomingMeals.map((meal, index) => <UpcomingMealCard key={index} meal={meal} />)}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 dark:text-gray-400 py-4">{t('noUpcomingMeals')}</p>
                        )}
                    </div>
                    
                    {/* Streaks & Achievements */}
                    {(adherenceStreak > 1 || hydrationStreak > 1 || achievements.length > 0) && (
                         <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                            <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4">{t('streaksAndAchievements')}</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <StreakItem count={adherenceStreak} label={t('adherenceStreak')} icon={<FlameIcon />} />
                                <StreakItem count={hydrationStreak} label={t('hydrationStreak')} icon={<WaterDropIcon />} />
                                {achievements.map(achKey => {
                                    const config = achievementsConfig[achKey];
                                    if (!config) return null;
                                    return <AchievementCard key={achKey} label={config.label} icon={config.icon} color={config.color} />;
                                })}
                            </div>
                        </div>
                    )}

                </div>

                {/* Sidebar Column */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
                        <h2 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-4">{t('todaysProgress')}</h2>
                        <div className="grid grid-cols-2 gap-4">
                            <CircularProgress progress={stepsProgress} goal={store.stepGoal} label={t('steps')} unit="" color="text-teal-500" icon={<StepsIcon />} />
                            <CircularProgress progress={waterProgress} goal={waterGoalMl} label={t('hydration')} unit="ml" color="text-blue-500" icon={<WaterDropIcon />} />
                        </div>
                    </div>
                    {weightData.some(d => d != null) && (
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
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