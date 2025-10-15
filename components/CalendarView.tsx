import React, { useState, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';

const getMonthDetails = (year: number, month: number) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // 0=Monday
    return { daysInMonth, startDayOfWeek };
};

const CalendarView: React.FC = observer(() => {
    const { currentDate, setCurrentDate, startDate, endDate, progressHistory, locale } = mealPlanStore;
    const [viewDate, setViewDate] = useState(new Date(currentDate));

    const loggedDays = useMemo(() => {
        const set = new Set<string>();
        progressHistory.forEach(record => {
            // A day is considered logged if adherence is greater than 0
            if (record.adherence > 0) {
                set.add(record.date);
            }
        });
        return set;
    }, [progressHistory]);
    
    const { daysInMonth, startDayOfWeek } = getMonthDetails(viewDate.getFullYear(), viewDate.getMonth());
    const blanks = Array(startDayOfWeek).fill(null);
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const handlePrevMonth = () => {
        setViewDate(current => new Date(current.getFullYear(), current.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(current => new Date(current.getFullYear(), current.getMonth() + 1, 1));
    };

    const handleDayClick = (dateStr: string, isDisabled: boolean) => {
        if (isDisabled) return;
        setCurrentDate(dateStr);
        mealPlanStore.navigateTo('daily');
    };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekDays = locale === 'it' 
        ? ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
        <div className="bg-white dark:bg-gray-800 p-6 sm:p-8 rounded-2xl shadow-lg transition-all duration-300 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <button onClick={handlePrevMonth} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">&lt;</button>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200 capitalize">
                    {viewDate.toLocaleString(locale, { month: 'long', year: 'numeric' })}
                </h2>
                <button onClick={handleNextMonth} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">&gt;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-sm font-semibold text-gray-500 dark:text-gray-400 mb-2">
                {weekDays.map(day => <div key={day}>{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {blanks.map((_, i) => <div key={`blank-${i}`} />)}
                {days.map(day => {
                    const dayDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                    const dateStr = dayDate.toLocaleDateString('en-CA');
                    
                    const isToday = dayDate.getTime() === today.getTime();
                    const isSelected = dateStr === currentDate;
                    const isDisabled = (startDate && dateStr < startDate) || (endDate && dateStr > endDate);
                    const isLogged = loggedDays.has(dateStr);

                    let baseClasses = "relative w-full aspect-square flex items-center justify-center rounded-full transition-colors duration-200";
                    let stateClasses = "";
                    if (isDisabled) {
                        stateClasses = "text-gray-300 dark:text-gray-600 cursor-not-allowed";
                    } else {
                        stateClasses = "cursor-pointer hover:bg-violet-100 dark:hover:bg-gray-700";
                        if (isSelected) {
                            stateClasses += " bg-violet-600 text-white font-bold";
                        } else if (isToday) {
                            stateClasses += " border-2 border-violet-500";
                        }
                    }
                    
                    return (
                        <button key={day} onClick={() => handleDayClick(dateStr, isDisabled)} className={`${baseClasses} ${stateClasses}`}>
                            <span>{day}</span>
                            {isLogged && !isSelected && <div className="absolute bottom-1.5 h-1.5 w-1.5 bg-green-500 rounded-full"></div>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
});

export default CalendarView;