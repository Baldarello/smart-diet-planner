import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';
import { StepsIcon, FlameIcon } from './Icons';

const StepTracker: React.FC = observer(() => {
    const { stepGoal, setStepGoal, stepsTaken, setSteps, logSteps } = mealPlanStore;
    const [isEditingIntake, setIsEditingIntake] = useState(false);
    const [editableIntake, setEditableIntake] = useState(stepsTaken.toString());
    const [editableGoal, setEditableGoal] = useState(stepGoal.toString());
    
    // State for calorie estimation
    const [hours, setHours] = useState('1');
    const [caloriesBurned, setCaloriesBurned] = useState<number | null>(null);

    useEffect(() => {
        if (!isEditingIntake) {
            setEditableIntake(stepsTaken.toString());
        }
    }, [stepsTaken, isEditingIntake]);
    
    useEffect(() => {
        setEditableGoal(stepGoal.toString());
    }, [stepGoal]);

    useEffect(() => {
        // A more continuous and physically-based model for calorie estimation.
        // The calculation is based on the work done (number of steps) and modified by intensity (pace).
        // This avoids the paradox of time-based formulas where lower intensity over longer time burns more calories for the same distance.
        const calculateCalories = () => {
            const numericHours = parseFloat(hours.replace(',', '.'));
            if (isNaN(numericHours) || numericHours <= 0 || stepsTaken <= 0) {
                setCaloriesBurned(null);
                return;
            }
    
            // Base calorie expenditure per step, approximating a 70kg person.
            const BASE_CALORIES_PER_STEP = 0.045;
            // A baseline pace for a moderate walk, in steps per hour.
            const BASELINE_PACE = 5500;
    
            // Calculate the user's actual pace.
            const pace = stepsTaken / numericHours;
    
            // Calculate a modifier based on how much the user's pace deviates from the baseline.
            // Faster paces are less efficient and burn more calories per step.
            // For every 2000 steps/hr faster than baseline, we add a 10% burn modifier.
            const paceDifference = pace - BASELINE_PACE;
            const intensityModifier = 1 + (paceDifference / 2000) * 0.10;
            
            // Ensure the modifier doesn't result in an absurdly low or high burn.
            // Clamp it between 0.8 (very slow) and 1.5 (very fast run).
            const clampedModifier = Math.max(0.8, Math.min(intensityModifier, 1.5));
    
            const calories = Math.round(stepsTaken * BASE_CALORIES_PER_STEP * clampedModifier);
            setCaloriesBurned(calories);
        };
    
        calculateCalories();
    }, [hours, stepsTaken]);


    const goal = parseInt(editableGoal, 10);
    const progressPercentage = goal > 0 ? Math.min((stepsTaken / goal) * 100, 100) : 0;

    const handleGoalSave = () => {
        const value = parseInt(editableGoal, 10);
        if (!isNaN(value) && value > 0) {
            setStepGoal(value);
        } else {
            setEditableGoal(stepGoal.toString());
        }
    };

    const handleIntakeSave = () => {
        const value = parseInt(editableIntake, 10);
        if (!isNaN(value) && value >= 0) {
            setSteps(value);
        } else {
            setEditableIntake(stepsTaken.toString());
        }
        setIsEditingIntake(false);
    };

    const handleIntakeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        } else if (e.key === 'Escape') {
            setEditableIntake(stepsTaken.toString());
            setIsEditingIntake(false);
        }
    };
    
    const handleAddDuration = (minutes: number) => {
        const currentHours = parseFloat(hours.replace(',', '.')) || 0;
        const newTotalHours = Math.round((currentHours + (minutes / 60)) * 100) / 100;
        setHours(String(newTotalHours).replace('.', ','));
    };

    return (
        <div className="bg-teal-50 dark:bg-teal-900/20 p-4 rounded-lg mt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-y-3 sm:gap-y-0">
                 <div className="flex items-center flex-shrink-0">
                    <StepsIcon />
                    <h4 className="font-semibold text-teal-800 dark:text-teal-300 ml-3">{t('stepTrackerTitle')}</h4>
                </div>
                 <div className="flex items-center self-end sm:self-center">
                    <label className="text-sm text-teal-600 dark:text-teal-400 mr-2 whitespace-nowrap">{t('stepGoal')}</label>
                    <input
                        type="text"
                        inputMode="numeric"
                        value={editableGoal}
                        onChange={(e) => setEditableGoal(e.target.value)}
                        onBlur={handleGoalSave}
                        className="w-24 text-right font-bold bg-transparent border-b-2 border-teal-200 dark:border-teal-700 focus:border-teal-500 dark:focus:border-teal-400 outline-none text-teal-700 dark:text-teal-200"
                        aria-label={t('stepGoal')}
                    />
                    <span className="ml-2 font-semibold text-teal-700 dark:text-teal-200">{t('stepsUnit')}</span>
                </div>
            </div>
            <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline mb-1">
                    <span className="text-sm font-medium text-teal-700 dark:text-teal-300 whitespace-nowrap">{t('stepsTaken')}</span>
                    <span className="text-sm font-bold text-teal-800 dark:text-teal-200 self-end sm:self-auto">
                        {isEditingIntake ? (
                            <input
                                type="text"
                                inputMode="numeric"
                                value={editableIntake}
                                onChange={(e) => setEditableIntake(e.target.value)}
                                onBlur={handleIntakeSave}
                                onKeyDown={handleIntakeKeyDown}
                                autoFocus
                                className="w-20 text-right font-bold bg-white dark:bg-gray-700 border-b-2 border-teal-400 dark:border-teal-500 outline-none text-teal-700 dark:text-teal-200"
                                aria-label={t('stepsTaken')}
                            />
                        ) : (
                            <span
                                onClick={() => setIsEditingIntake(true)}
                                className="cursor-pointer p-1 rounded-md hover:bg-teal-100 dark:hover:bg-teal-900/40"
                                title={t('editStepsTitle')}
                            >
                                {stepsTaken}
                            </span>
                        )}
                        &nbsp;/ {isNaN(goal) ? '...' : goal} {t('stepsUnit')}
                    </span>
                </div>
                <div className="w-full bg-teal-200 dark:bg-teal-800 rounded-full h-2.5">
                    <div className="bg-teal-500 h-2.5 rounded-full transition-all duration-300 ease-in-out" style={{ width: `${progressPercentage}%` }}></div>
                </div>
            </div>
            <div className="mt-4 text-center">
                <span className="text-sm font-medium text-teal-700 dark:text-teal-300">{t('quickAddStepsTitle')}</span>
                <div className="flex justify-center gap-2 mt-2">
                    {[1000, 2500, 5000].map(amount => (
                        <button
                            key={amount}
                            onClick={() => logSteps(amount)}
                            className="bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-200 font-semibold px-4 py-2 rounded-full hover:bg-teal-200 dark:hover:bg-teal-800/60 transition-colors text-sm"
                            aria-label={`Add ${amount} steps`}
                        >
                            +{amount}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Calorie Estimation Section */}
            <div className="mt-4 border-t border-teal-200 dark:border-teal-700/50 pt-4 space-y-3">
                {/* Hours Input */}
                <div className="flex items-center justify-between">
                    <label htmlFor="activity-hours" className="text-sm font-medium text-teal-700 dark:text-teal-300">{t('activityHours')}</label>
                    <div className="flex items-center">
                         <input
                            id="activity-hours"
                            type="text"
                            inputMode="decimal"
                            value={hours}
                            onChange={(e) => setHours(e.target.value)}
                            className="w-16 text-right font-bold bg-transparent border-b-2 border-teal-200 dark:border-teal-700 focus:border-teal-500 dark:focus:border-teal-400 outline-none text-teal-700 dark:text-teal-200"
                            aria-label={t('activityHours')}
                        />
                        <span className="ml-2 font-semibold text-teal-700 dark:text-teal-200">{t('hoursUnit')}</span>
                    </div>
                </div>
                
                {/* Quick Add Duration */}
                <div className="text-center pt-2">
                    <span className="text-sm font-medium text-teal-700 dark:text-teal-300">{t('quickAddDurationTitle')}</span>
                    <div className="flex justify-center gap-2 mt-2">
                        {[15, 30, 45].map(minutes => (
                            <button
                                key={minutes}
                                onClick={() => handleAddDuration(minutes)}
                                className="bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-200 font-semibold px-3 py-1.5 rounded-full hover:bg-teal-200 dark:hover:bg-teal-800/60 transition-colors text-sm"
                                aria-label={`Add ${minutes} minutes`}
                            >
                                +{minutes}m
                            </button>
                        ))}
                    </div>
                </div>


                {/* Estimated Calories Display */}
                {caloriesBurned !== null && (
                    <div className="!mt-4 flex items-center justify-center bg-teal-100 dark:bg-teal-800/60 p-3 rounded-lg">
                        <FlameIcon />
                        <span className="ml-2 font-semibold text-teal-800 dark:text-teal-200">{t('estimatedCalories')}</span>
                        <span className="ml-1 font-bold text-lg text-teal-600 dark:text-teal-100">{caloriesBurned}</span>
                        <span className="ml-1 font-semibold text-teal-800 dark:text-teal-200">{t('caloriesUnit')}</span>
                    </div>
                )}
            </div>
        </div>
    );
});

export default StepTracker;