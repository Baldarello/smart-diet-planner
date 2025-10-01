import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';
import { WaterDropIcon } from './Icons';

const HydrationTracker: React.FC = observer(() => {
    const { hydrationGoalLiters, setHydrationGoal, currentDayProgress, setWaterIntake, logWaterIntake } = mealPlanStore;
    const waterIntakeMl = currentDayProgress?.waterIntakeMl ?? 0;
    
    const [isEditingIntake, setIsEditingIntake] = useState(false);
    const [editableIntake, setEditableIntake] = useState(waterIntakeMl.toString());
    const [editableGoal, setEditableGoal] = useState(hydrationGoalLiters.toString());

    useEffect(() => {
        if (!isEditingIntake) {
            setEditableIntake(waterIntakeMl.toString());
        }
    }, [waterIntakeMl, isEditingIntake]);
    
    useEffect(() => {
        setEditableGoal(hydrationGoalLiters.toString());
    }, [hydrationGoalLiters]);

    const goalMl = parseFloat(editableGoal) * 1000;
    const progressPercentage = goalMl > 0 ? Math.min((waterIntakeMl / goalMl) * 100, 100) : 0;

    const handleGoalSave = () => {
        const value = parseFloat(editableGoal);
        if (!isNaN(value) && value > 0) {
            setHydrationGoal(value);
        } else {
            setEditableGoal(hydrationGoalLiters.toString());
        }
    };

    const handleIntakeSave = () => {
        const value = parseInt(editableIntake, 10);
        if (!isNaN(value) && value >= 0) {
            setWaterIntake(value);
        } else {
            setEditableIntake(waterIntakeMl.toString());
        }
        setIsEditingIntake(false);
    };

    const handleIntakeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        } else if (e.key === 'Escape') {
            setEditableIntake(waterIntakeMl.toString());
            setIsEditingIntake(false);
        }
    };

    return (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg mt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-y-3 sm:gap-y-0">
                 <div className="flex items-center flex-shrink-0">
                    <WaterDropIcon />
                    <h4 className="font-semibold text-blue-800 dark:text-blue-300 ml-3">{t('hydrationTrackerTitle')}</h4>
                </div>
                 <div className="flex items-center self-end sm:self-center">
                    <label className="text-sm text-blue-600 dark:text-blue-400 mr-2 whitespace-nowrap">{t('hydrationGoal')}</label>
                    <input
                        type="text"
                        inputMode="decimal"
                        value={editableGoal}
                        onChange={(e) => setEditableGoal(e.target.value)}
                        onBlur={handleGoalSave}
                        className="w-16 text-right font-bold bg-transparent border-b-2 border-blue-200 dark:border-blue-700 focus:border-blue-500 dark:focus:border-blue-400 outline-none text-blue-700 dark:text-blue-200"
                        aria-label={t('hydrationGoal')}
                    />
                    <span className="ml-2 font-semibold text-blue-700 dark:text-blue-200">{t('hydrationUnit')}</span>
                </div>
            </div>
            <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline mb-1">
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300 whitespace-nowrap">{t('hydrationIntake')}</span>
                    <span className="text-sm font-bold text-blue-800 dark:text-blue-200 self-end sm:self-auto">
                        {isEditingIntake ? (
                            <input
                                type="text"
                                inputMode="numeric"
                                value={editableIntake}
                                onChange={(e) => setEditableIntake(e.target.value)}
                                onBlur={handleIntakeSave}
                                onKeyDown={handleIntakeKeyDown}
                                autoFocus
                                className="w-20 text-right font-bold bg-white dark:bg-gray-700 border-b-2 border-blue-400 dark:border-blue-500 outline-none text-blue-700 dark:text-blue-200"
                                aria-label={t('hydrationIntake')}
                            />
                        ) : (
                            <span
                                onClick={() => setIsEditingIntake(true)}
                                className="cursor-pointer p-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/40"
                                title={t('editIntakeTitle')}
                            >
                                {waterIntakeMl}
                            </span>
                        )}
                        &nbsp;/ {isNaN(goalMl) ? '...' : goalMl} {t('hydrationUnitMl')}
                    </span>
                </div>
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2.5">
                    <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-300 ease-in-out" style={{ width: `${progressPercentage}%` }}></div>
                </div>
            </div>
            <div className="mt-4 text-center">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">{t('quickAddWaterTitle')}</span>
                <div className="flex justify-center gap-2 mt-2">
                    {[250, 500, 750].map(amount => (
                        <button
                            key={amount}
                            onClick={() => logWaterIntake(amount)}
                            className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200 font-semibold px-4 py-2 rounded-full hover:bg-blue-200 dark:hover:bg-blue-800/60 transition-colors text-sm"
                            aria-label={`Add ${amount} ml`}
                        >
                            +{amount} ml
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
});

export default HydrationTracker;