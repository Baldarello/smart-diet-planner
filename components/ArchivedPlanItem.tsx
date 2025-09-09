import React, { useState, useEffect, useRef } from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import MealPlanView from './MealPlanView';
import { RestoreIcon, EditIcon } from './Icons';
import { ArchivedPlan } from '../types';
import { t } from '../i18n';

const ArchivedPlanItem: React.FC<{ archive: ArchivedPlan }> = observer(({ archive }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(archive.name);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSave = () => { mealPlanStore.updateArchivedPlanName(archive.id, name); setIsEditing(false); };
    useEffect(() => { if (isEditing) { inputRef.current?.focus(); inputRef.current?.select(); } }, [isEditing]);
    
    return (
         <details key={archive.id} className="group bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg transition-colors duration-200 hover:bg-violet-50 dark:hover:bg-gray-700/50">
            <summary className="font-semibold text-lg text-gray-700 dark:text-gray-300 cursor-pointer list-none flex justify-between items-center group-open:text-violet-600 dark:group-open:text-violet-400">
                <div className="flex items-center gap-2 flex-grow">
                    <span className="text-violet-500 dark:text-violet-400 transform transition-transform duration-200 group-open:rotate-90">&#9656;</span>
                     {isEditing ? ( <input ref={inputRef} type="text" value={name} onChange={(e) => setName(e.target.value)} onBlur={handleSave} onKeyDown={(e) => e.key === 'Enter' && handleSave()} className="text-lg font-semibold bg-white dark:bg-gray-700 border border-violet-300 dark:border-violet-600 rounded px-2 py-1" /> ) : ( <span className="font-bold">{archive.name}</span> )}
                    <button onClick={() => setIsEditing(!isEditing)} className="text-gray-400 hover:text-violet-600 dark:text-gray-500 dark:hover:text-violet-400"><EditIcon /></button>
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-normal ml-2">({archive.date})</span>
                </div>
                <button onClick={(e) => { e.preventDefault(); mealPlanStore.restorePlanFromArchive(archive.id); }} className="bg-violet-100 dark:bg-violet-900/50 text-violet-700 dark:text-violet-300 font-semibold px-3 py-1 rounded-full hover:bg-violet-200 dark:hover:bg-violet-800/50 transition-colors text-sm flex items-center flex-shrink-0" title={t('restorePlanTitle')}>
                    <RestoreIcon/><span className="ml-2 hidden sm:inline">{t('restore')}</span>
                </button>
            </summary>
            <div className="mt-4 border-t dark:border-gray-700 pt-4"> <MealPlanView plan={archive.plan} isArchiveView={true} /> </div>
        </details>
    );
});

export default ArchivedPlanItem;