import React from 'react';
import { allUnits } from '../utils/units';
import { t } from '../i18n';

interface UnitPickerProps {
    value: string;
    onChange: (value: string) => void;
}

const UnitPicker: React.FC<UnitPickerProps> = ({ value, onChange }) => {
    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="p-1 rounded bg-white dark:bg-gray-700 border border-violet-300 dark:border-violet-500"
            aria-label={t('quantityUnitLabel')}
        >
            {allUnits.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
            ))}
        </select>
    );
};

export default UnitPicker;
