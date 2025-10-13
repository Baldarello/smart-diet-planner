import React, { useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { t } from '../i18n';
import MealTimeEditor from './MealTimeEditor';
import MealModificationControl from './MealModificationControl';
import { WarningIcon } from './Icons';
import { mealPlanStore } from '../stores/MealPlanStore';

interface MealActionsPopupProps {
    dayIndex: number;
    mealIndex: number;
    onClose: () => void;
    onLogCheatMeal?: () => void;
    onResetClick?: () => void;
}

const MealActionsPopup: React.FC<MealActionsPopupProps> = observer(({ dayIndex, mealIndex, onClose, onLogCheatMeal, onResetClick }) => {
    const popupRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onClose]);

    const handleLogCheat = () => {
        if (onLogCheatMeal) {
            onLogCheatMeal();
        }
        onClose();
    };

    const handleResetClick = () => {
        if (onResetClick) {
            onResetClick();
        }
        onClose();
    };

    return (
        <div
            ref={popupRef}
            className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg z-50 border dark:border-gray-700 animate-slide-in-up"
            style={{ animationDuration: '0.2s' }}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="py-1">
                <div className="px-4 py-2 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700">
                     <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('mealTime')}</span>
                     <MealTimeEditor dayIndex={dayIndex} mealIndex={mealIndex} />
                </div>
                {onResetClick && (
                    <MealModificationControl
                        dayIndex={dayIndex}
                        mealIndex={mealIndex}
                        showText={true}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                        onResetClick={handleResetClick}
                    />
                )}
                {onLogCheatMeal && mealPlanStore.showCheatMealButton && (
                    <>
                        <div className="border-t border-gray-100 dark:border-gray-700 my-1"></div>
                        <button 
                            onClick={handleLogCheat} 
                            className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                        >
                            <WarningIcon />
                            <span className="ml-2">{t('logCheatMealTitle')}</span>
                        </button>
                    </>
                )}
            </div>
        </div>
    );
});

export default MealActionsPopup;