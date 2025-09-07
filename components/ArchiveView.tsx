import React from 'react';
import { observer } from 'mobx-react-lite';
import { mealPlanStore } from '../stores/MealPlanStore';
import ArchivedPlanItem from './ArchivedPlanItem';

const ArchiveView: React.FC = observer(() => {
    const { archivedPlans } = mealPlanStore;
    if (archivedPlans.length === 0) { return ( <div className="bg-white p-8 rounded-2xl shadow-lg text-center max-w-2xl mx-auto"><h2 className="text-2xl font-bold text-gray-800 mb-2">Archive is Empty</h2><p className="text-gray-500">When you use the 'Change Diet' button, your old plan will be saved here.</p></div> ); }
    return (
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg transition-all duration-300 max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">Archived Diet Plans</h2>
            <div className="space-y-4">
                {archivedPlans.slice().reverse().map((archive) => ( <ArchivedPlanItem key={archive.id} archive={archive}/> ))}
            </div>
        </div>
    );
});

export default ArchiveView;
