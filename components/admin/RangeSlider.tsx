import React from 'react';

interface RangeSliderProps {
    label: string;
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step: number;
    unit: string;
}

const RangeSlider: React.FC<RangeSliderProps> = ({ label, value, onChange, min, max, step, unit }) => {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {label}
            </label>
            <div className="mt-1 flex items-center gap-4">
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={e => onChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
                <span className="font-semibold text-gray-600 dark:text-gray-400 w-16 text-right">
                    {value.toFixed(step === 1 ? 0 : 1)} {unit}
                </span>
            </div>
        </div>
    );
};

export default RangeSlider;
