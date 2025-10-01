import React, { useState, useRef, useLayoutEffect } from 'react';
import { t } from '../i18n';

type ChartType = 'line' | 'bar' | 'area';

interface Dataset {
    label: string;
    data: number[];
    color: string;
    unit: string;
}

interface ProgressChartProps {
    type: ChartType;
    labels: string[];
    datasets: Dataset[];
}

const ProgressChart: React.FC<ProgressChartProps> = ({ type, labels, datasets }) => {
    const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode; visible: boolean } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 250 });

    useLayoutEffect(() => {
        const updateSize = () => {
            if (containerRef.current) {
                setDimensions({ width: containerRef.current.offsetWidth, height: 250 });
            }
        };
        window.addEventListener('resize', updateSize);
        updateSize();
        return () => window.removeEventListener('resize', updateSize);
    }, []);

    const { width, height } = dimensions;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };

    if (width === 0) return <div ref={containerRef} style={{ height: `${height}px` }} />;

    const allData = datasets.flatMap(d => d.data);
    const yMin = Math.min(...allData) * 0.9;
    const yMax = Math.max(...allData) * 1.1;

    const x = (i: number) => padding.left + (i / (labels.length - 1)) * (width - padding.left - padding.right);
    const y = (value: number) => height - padding.bottom - ((value - yMin) / (yMax - yMin)) * (height - padding.top - padding.bottom);
    
    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        const svgRect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - svgRect.left;
        const index = Math.round(((mouseX - padding.left) / (width - padding.left - padding.right)) * (labels.length - 1));

        if (index >= 0 && index < labels.length) {
            const content = (
                <>
                    <div className="font-bold mb-1">{labels[index]}</div>
                    {datasets.map((dataset, i) => (
                        <div key={i} className="flex items-center">
                            <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: dataset.color }}></span>
                            <span>{dataset.label}: <strong>{dataset.data[index]} {dataset.unit}</strong></span>
                        </div>
                    ))}
                </>
            );
            setTooltip({
                x: x(index),
                y: e.clientY - svgRect.top,
                content,
                visible: true
            });
        }
    };

    const handleMouseLeave = () => {
        setTooltip(null);
    };

    const renderYAxis = () => {
        const ticks = 5;
        return Array.from({ length: ticks }).map((_, i) => {
            const value = yMin + (i / (ticks - 1)) * (yMax - yMin);
            const yPos = y(value);
            return (
                <g key={i} className="text-xs text-gray-500 dark:text-gray-400">
                    <line x1={padding.left} x2={width - padding.right} y1={yPos} y2={yPos} stroke="currentColor" strokeDasharray="2,2" className="text-gray-200 dark:text-gray-700" />
                    <text x={padding.left - 8} y={yPos + 4} textAnchor="end">{Math.round(value)}</text>
                </g>
            );
        });
    };
    
    const renderXAxis = () => {
         const tickCount = Math.min(labels.length, Math.floor(width / 80));
         const tickStep = Math.ceil(labels.length / tickCount);
         
         return labels.map((label, i) => {
            if (i % tickStep !== 0) return null;
            const xPos = x(i);
            return (
                <text key={i} x={xPos} y={height - padding.bottom + 16} textAnchor="middle" className="text-xs text-gray-500 dark:text-gray-400">
                    {label}
                </text>
            );
        });
    };

    const renderPaths = () => {
        return datasets.map((dataset, i) => {
            const pathData = dataset.data.map((d, j) => `${j === 0 ? 'M' : 'L'} ${x(j)} ${y(d)}`).join(' ');
            if (type === 'line') {
                return <path key={i} d={pathData} fill="none" stroke={dataset.color} strokeWidth="2" />;
            }
            if (type === 'area') {
                const areaPathData = `${pathData} V ${height - padding.bottom} H ${padding.left} Z`;
                const color = dataset.color.replace('1)', '0.2)');
                return (
                     <g key={i}>
                        <path d={areaPathData} fill={color} stroke="none" />
                        <path d={pathData} fill="none" stroke={dataset.color} strokeWidth="2" />
                    </g>
                );
            }
            return null;
        });
    };
    
    const renderBars = () => {
        const barWidth = (width - padding.left - padding.right) / labels.length * 0.8;
        const groupWidth = barWidth / datasets.length;

        return labels.map((_, i) => (
             <g key={i}>
                {datasets.map((dataset, j) => {
                    const xPos = x(i) - barWidth / 2 + j * groupWidth;
                    const yPos = y(dataset.data[i]);
                    const barHeight = height - padding.bottom - yPos;
                    return (
                        <rect key={`${i}-${j}`} x={xPos} y={yPos} width={groupWidth} height={barHeight} fill={dataset.color} />
                    );
                })}
            </g>
        ));
    };

    return (
        <div ref={containerRef} className="relative">
            <svg width={width} height={height} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
                {renderYAxis()}
                {renderXAxis()}
                
                { (type === 'line' || type === 'area') && renderPaths() }
                { type === 'bar' && renderBars() }

                {tooltip && tooltip.visible && (
                    <line x1={tooltip.x} y1={padding.top} x2={tooltip.x} y2={height - padding.bottom} stroke="currentColor" className="text-gray-400 dark:text-gray-500" />
                )}
            </svg>
            
            {tooltip && tooltip.visible && (
                <div
                    className="absolute p-2 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-md shadow-lg text-sm pointer-events-none"
                    style={{
                        left: `${tooltip.x + 10}px`,
                        top: `${tooltip.y - 40}px`,
                        transform: tooltip.x > width / 2 ? 'translateX(-100%)' : 'translateX(0)'
                    }}
                >
                    {tooltip.content}
                </div>
            )}
        </div>
    );
};

export default ProgressChart;
