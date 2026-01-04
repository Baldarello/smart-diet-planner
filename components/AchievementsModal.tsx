
import React, { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import { t } from '../i18n';
import { TrophyIcon, FootprintIcon, CloseIcon, WaterDropIcon, CalendarCheckIcon, MedalIcon } from './Icons';

interface AchievementsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const allAchievementsConfig: { [key: string]: { icon: React.ReactNode; color: string } } = {
    firstHydration: { icon: <WaterDropIcon />, color: 'blue' },
    perfectWeekHydration: { icon: <TrophyIcon />, color: 'blue' },
    totalWater50L: { icon: <MedalIcon />, color: 'blue' },
    firstSteps: { icon: <FootprintIcon />, color: 'teal' },
    dailyStepGoalReached: { icon: <CalendarCheckIcon />, color: 'teal' },
    stepMarathon: { icon: <TrophyIcon />, color: 'teal' },
    perfectWeekSteps: { icon: <TrophyIcon />, color: 'teal' },
};

const AchievementItem: React.FC<{
    achKey: string;
    isUnlocked: boolean;
}> = ({ achKey, isUnlocked }) => {
    const config = allAchievementsConfig[achKey];
    if (!config) return null;

    const pascalCase = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    const titleKey = achKey.startsWith('achievement') 
        ? achKey 
        : `achievement${pascalCase(achKey)}`;
    const descKey = `${titleKey}Desc`;
    
    const baseClasses = "bg-slate-50 dark:bg-gray-700/50 p-4 rounded-2xl flex items-center gap-4 transition-all duration-300";
    const unlockedClasses = `border-l-4 border-${config.color}-500`;
    const lockedClasses = "opacity-50 grayscale";

    return (
        <div className={`${baseClasses} ${isUnlocked ? unlockedClasses : ''} ${!isUnlocked ? lockedClasses : ''}`}>
             <div className="hidden">
                <span className="border-blue-500 text-blue-500"></span>
                <span className="border-teal-500 text-teal-500"></span>
            </div>
            <div className={`flex-shrink-0 text-${config.color}-500`}>{config.icon}</div>
            <div>
                <h4 className="font-bold text-gray-800 dark:text-gray-200">{t(titleKey as any)}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t(descKey as any)}</p>
            </div>
        </div>
    );
};

const AchievementsModal: React.FC<AchievementsModalProps> = observer(({ isOpen, onClose }) => {
    const { earnedAchievements } = mealPlanStore;

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const unlocked = Object.keys(allAchievementsConfig).filter(key => earnedAchievements.includes(key));
    const locked = Object.keys(allAchievementsConfig).filter(key => !earnedAchievements.includes(key));
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[80] p-4" role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl p-6 animate-slide-in-up flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 id="modal-title" className="text-2xl font-bold text-gray-800 dark:text-gray-200">{t('allAchievementsTitle')}</h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label={t('close')}>
                        <CloseIcon />
                    </button>
                </div>

                <div className="overflow-y-auto pr-2 -mr-2">
                    {unlocked.length > 0 && (
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-violet-600 dark:text-violet-400 mb-3">{t('unlockedAchievements')} ({unlocked.length})</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {unlocked.map(key => <AchievementItem key={key} achKey={key} isUnlocked={true} />)}
                            </div>
                        </div>
                    )}
                    {locked.length > 0 && (
                        <div>
                            <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400 mb-3">{t('lockedAchievements')} ({locked.length})</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {locked.map(key => <AchievementItem key={key} achKey={key} isUnlocked={false} />)}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default AchievementsModal;
