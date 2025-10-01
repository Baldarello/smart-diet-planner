import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';
import { StepsIcon } from './Icons';

const StepTracker: React.FC = observer(() => {
    const { stepGoal, setStepGoal, stepsTaken, setSteps, logSteps } = mealPlanStore;
    const [isEditingIntake, setIsEditingIntake] = useState(false);
    const [editableIntake, setEditableIntake] = useState(stepsTaken.toString());
    const [editableGoal, setEditableGoal] = useState(stepGoal.toString());

    useEffect(() => {
        if (!isEditingIntake) {
            setEditableIntake(stepsTaken.toString());
        }
    }, [stepsTaken, isEditingIntake]);
    
    useEffect(() => {
        setEditableGoal(stepGoal.toString());
    }, [stepGoal]);

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
        </div>
    );
});

export default StepTracker;
