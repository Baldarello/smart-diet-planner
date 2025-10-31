import React, { useState, useRef, useLayoutEffect, useEffect, useMemo } from 'react';
import { PlusIcon, MinusIcon, ChevronLeftIcon, ChevronRightIcon, RefreshIcon } from './Icons';

type ChartType = 'line' | 'bar' | 'area';

interface Dataset {
    label: string;
    data: (number | null | undefined | number[])[];
    color: string;
    unit: string;
}

interface ProgressChartProps {
    type: ChartType;
    labels: string[];
    datasets: Dataset[];
    yAxisMin?: number;
    yAxisMax?: number;
    stacked?: boolean;
}

const ProgressChart: React.FC<ProgressChartProps> = ({ type, labels, datasets, yAxisMin: yAxisMinProp, yAxisMax: yAxisMaxProp, stacked = false }) => {
    const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode; visible: boolean } | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 250 });
    
    const [viewDomain, setViewDomain] = useState({ min: 0, max: labels.length > 1 ? labels.length - 1 : 1 });
    const [isPanning, setIsPanning] = useState(false);
    const panStartRef = useRef({ x: 0, domainMin: 0, domainMax: 0 });

    const padding = { top: 20, right: 30, bottom: 50, left: 60 };

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

    useEffect(() => {
        const svgElement = svgRef.current;
        if (!svgElement) return;

        const handleWheel = (e: WheelEvent) => {
            e.preventDefault();
            const zoomIntensity = 0.1;
            const direction = e.deltaY < 0 ? 1 : -1;

            const svgRect = svgElement.getBoundingClientRect();
            const mouseX = e.clientX - svgRect.left;
            
            setViewDomain(currentViewDomain => {
                const currentDomainWidth = currentViewDomain.max - currentViewDomain.min;
                const mouseRatio = (mouseX - padding.left) / (dimensions.width - padding.left - padding.right);
                
                if (mouseRatio < 0 || mouseRatio > 1) return currentViewDomain;

                const mouseIndex = currentViewDomain.min + mouseRatio * currentDomainWidth;
                let newDomainWidth = currentDomainWidth * (1 - direction * zoomIntensity);

                if (newDomainWidth < 2 && direction > 0) return currentViewDomain;
                if (newDomainWidth > (labels.length - 1) && direction < 0) {
                    return { min: 0, max: labels.length > 1 ? labels.length - 1 : 1 };
                }

                let newMin = mouseIndex - mouseRatio * newDomainWidth;
                let newMax = newMin + newDomainWidth;

                if (newMin < 0) {
                    newMax = newMax - newMin;
                    newMin = 0;
                }
                if (newMax > labels.length - 1) {
                    newMin = newMin - (newMax - (labels.length - 1));
                    newMax = labels.length - 1;
                }
                if (newMin < 0) newMin = 0;
                
                return { min: newMin, max: newMax };
            });
        };

        svgElement.addEventListener('wheel', handleWheel, { passive: false });

        return () => {
            svgElement.removeEventListener('wheel', handleWheel);
        };
    }, [dimensions.width, padding.left, padding.right, labels.length, setViewDomain]);


    const { width, height } = dimensions;

    if (width === 0) return <div ref={containerRef} style={{ height: `${height}px` }} />;

    const startIndex = Math.max(0, Math.floor(viewDomain.min));
    const endIndex = Math.min(labels.length - 1, Math.ceil(viewDomain.max));

    const { yMin, yMax } = useMemo(() => {
        if (yAxisMinProp !== undefined && yAxisMaxProp !== undefined) {
            return { yMin: yAxisMinProp, yMax: yAxisMaxProp };
        }
    
        if (stacked) {
            const sums = new Array(labels.length).fill(0);
            datasets.forEach(dataset => {
                dataset.data.forEach((value, i) => {
                    if (i >= startIndex && i <= endIndex) {
                        const numValue = (typeof value === 'number' && !isNaN(value)) ? value : 0;
                        sums[i] += numValue;
                    }
                });
            });
            let maxY = sums.length > 0 ? Math.max(...sums) : 1;
            const yRange = maxY - 0;
            if (yRange === 0) maxY += 1;
            else maxY += yRange * 0.1;
            return { yMin: 0, yMax: Math.ceil(maxY) };
        } else {
            const visibleData = datasets.flatMap(d => d.data.slice(startIndex, endIndex + 1))
                .filter(d => typeof d === 'number' && !isNaN(d)) as number[];
            
            let minY = visibleData.length > 0 ? Math.min(...visibleData) : 0;
            let maxY = visibleData.length > 0 ? Math.max(...visibleData) : 1;
            
            const isNonNegative = (type === 'bar' || type === 'area') && (visibleData.length === 0 || minY >= 0);
            if (isNonNegative) {
                minY = 0;
            }
    
            const yRange = maxY - minY;
            if (yRange === 0) {
                maxY += 1;
                if (!isNonNegative) minY -= 1;
            } else {
                maxY += yRange * 0.1;
                if (!isNonNegative) minY -= yRange * 0.1;
            }
    
            minY = Math.floor(minY);
            maxY = Math.ceil(maxY);
            
            if (minY === maxY) maxY += 1;
            return { yMin: minY, yMax: maxY };
        }
    }, [datasets, startIndex, endIndex, stacked, yAxisMinProp, yAxisMaxProp, labels.length, type]);


    const x = (i: number): number => {
        const domainWidth = viewDomain.max - viewDomain.min;
        if (domainWidth <= 0) return padding.left;
        const ratio = (i - viewDomain.min) / domainWidth;
        return padding.left + ratio * (width - padding.left - padding.right);
    };

    const y = (value: number): number => {
        const domainHeight = yMax - yMin;
        if (domainHeight <= 0) return height - padding.bottom;
        const ratio = (value - yMin) / domainHeight;
        return height - padding.bottom - ratio * (height - padding.top - padding.bottom);
    };
    
    const handlePanButtons = (direction: 'left' | 'right') => {
        const domainWidth = viewDomain.max - viewDomain.min;
        const shiftAmount = domainWidth * 0.2;
        const shift = direction === 'left' ? -shiftAmount : shiftAmount;

        let newMin = viewDomain.min + shift;
        let newMax = viewDomain.max + shift;

        if (newMin < 0) {
            newMin = 0;
            newMax = domainWidth;
        }
        if (newMax > labels.length - 1) {
            newMax = labels.length - 1;
            newMin = newMax - domainWidth;
        }
        setViewDomain({ min: newMin, max: newMax });
    };

    const handleZoom = (direction: 'in' | 'out') => {
        const zoomFactor = 1.25;
        const domainWidth = viewDomain.max - viewDomain.min;
        const centerIndex = viewDomain.min + domainWidth / 2;

        let newDomainWidth = direction === 'in' ? domainWidth / zoomFactor : domainWidth * zoomFactor;

        if (newDomainWidth < 2 && direction === 'in') return;
        if (newDomainWidth > labels.length - 1 && direction === 'out') {
             handleReset();
             return;
        }

        let newMin = centerIndex - newDomainWidth / 2;
        let newMax = centerIndex + newDomainWidth / 2;

        if (newMin < 0) newMin = 0;
        if (newMax > labels.length - 1) newMax = labels.length - 1;
        
        if (newMax - newMin < newDomainWidth && direction === 'out') {
             if (newMin === 0) newMax = Math.min(newMin + newDomainWidth, labels.length - 1);
             if (newMax === labels.length - 1) newMin = Math.max(newMax - newDomainWidth, 0);
        }

        setViewDomain({ min: newMin, max: newMax });
    };

    const handleReset = () => {
        setViewDomain({ min: 0, max: labels.length > 1 ? labels.length - 1 : 1 });
    };
    
    const handlePanStart = (clientX: number) => {
        setIsPanning(true);
        panStartRef.current = { x: clientX, domainMin: viewDomain.min, domainMax: viewDomain.max };
    };

    const handlePanMove = (clientX: number) => {
        if (!isPanning) return;
        setTooltip(null);
        const dx = clientX - panStartRef.current.x;
        const domainWidth = panStartRef.current.domainMax - panStartRef.current.domainMin;
        const domainDelta = (dx / (width - padding.left - padding.right)) * domainWidth;
        
        let newMin = panStartRef.current.domainMin - domainDelta;
        let newMax = panStartRef.current.domainMax - domainDelta;

        if (newMin < 0) {
            newMin = 0;
            newMax = newMin + domainWidth;
        }
        if (newMax > labels.length - 1) {
            newMax = labels.length - 1;
            newMin = newMax - domainWidth;
        }
        setViewDomain({ min: newMin, max: newMax });
    };
    
    const handlePanEnd = () => {
        setIsPanning(false);
    };

    const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
        e.currentTarget.style.cursor = 'grabbing';
        handlePanStart(e.clientX);
    };
    const handleMouseUp = (e: React.MouseEvent<SVGSVGElement>) => {
        e.currentTarget.style.cursor = 'grab';
        handlePanEnd();
    };
    const handleMouseLeave = (e: React.MouseEvent<SVGSVGElement>) => {
        e.currentTarget.style.cursor = 'grab';
        if (isPanning) handlePanEnd();
        setTooltip(null);
    };
    const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
        if (isPanning) {
            handlePanMove(e.clientX);
            return;
        }
        const svgRect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - svgRect.left;
        const domainWidth = viewDomain.max - viewDomain.min;
        const indexFloat = viewDomain.min + ((mouseX - padding.left) / (width - padding.left - padding.right)) * domainWidth;
        const index = Math.round(indexFloat);

        if (index >= 0 && index < labels.length) {
            const hasDataAtIndex = datasets.some(d => d.data[index] != null && !isNaN(d.data[index] as number));
            if (!hasDataAtIndex) {
                setTooltip(null);
                return;
            }
            const content = (
                <>
                    <div className="font-bold mb-1">{labels[index]}</div>
                    {datasets.map((dataset, i) => {
                        const value = dataset.data[index];
                         if (value == null || isNaN(value as number)) return null;
                         return (
                            <div key={i} className="flex items-center">
                                <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: dataset.color }}></span>
                                <span>{dataset.label}: <strong>{Math.round(value as number * 10) / 10} {dataset.unit}</strong></span>
                            </div>
                        )
                    })}
                </>
            );
            setTooltip({ x: x(index), y: e.clientY - svgRect.top, content, visible: true });
        } else {
            setTooltip(null);
        }
    };

    const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
        if (e.touches.length === 1) handlePanStart(e.touches[0].clientX);
    };
    const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
        if (isPanning && e.touches.length === 1) {
            e.preventDefault();
            handlePanMove(e.touches[0].clientX);
        }
    };
    const handleTouchEnd = () => handlePanEnd();
    
    const renderYAxis = () => {
        const ticks = 5;
        return Array.from({ length: ticks }).map((_, i) => {
            const value = yMin + (i / (ticks - 1)) * (yMax - yMin);
            const yPos = y(value);
            return (
                <g key={i} className="text-xs text-gray-500 dark:text-gray-300">
                    <line x1={padding.left} x2={width - padding.right} y1={yPos} y2={yPos} stroke="currentColor" strokeDasharray="2,2" className="text-gray-200 dark:text-gray-700" />
                    <text x={padding.left - 8} y={yPos + 4} textAnchor="end" fill="currentColor">{Math.round(value)}</text>
                </g>
            );
        });
    };
    
    const renderXAxis = () => {
        const domainWidth = viewDomain.max - viewDomain.min;
        const desiredLabels = Math.floor((width - padding.left - padding.right) / 80);
        const tickStep = Math.max(1, Math.round(domainWidth / desiredLabels));
        
        const labelsToShow = [];
        const firstVisibleLabelIndex = Math.ceil(viewDomain.min);
        
        for (let i = firstVisibleLabelIndex; i <= endIndex; i++) {
            if ((i - firstVisibleLabelIndex) % tickStep === 0) {
                labelsToShow.push(i);
            }
        }

        return labelsToShow.map(i => {
            const xPos = x(i);
            return (
                <text key={i} x={xPos} y={height - padding.bottom + 20} textAnchor="middle" className="text-xs text-gray-500 dark:text-gray-300" fill="currentColor">
                    {labels[i]}
                </text>
            );
        });
    };

    const buildSegmentPath = (segment: {x:number, y0:number, y1:number}[]) => {
        if (segment.length === 0) return '';
        const upperLine = segment.map(p => `L ${p.x},${p.y1}`).join(' ').substring(2);
        const lowerLine = segment.map(p => `L ${p.x},${p.y0}`).reverse().join(' ').substring(2);
        const firstPoint = segment[0];
        const lastPoint = segment[segment.length - 1];
        return `M ${firstPoint.x},${firstPoint.y1} ${upperLine} L ${lastPoint.x},${lastPoint.y0} ${lowerLine} Z`;
    }

    const renderPaths = () => {
        if (type === 'area' && stacked) {
            const yOffsets = new Array(labels.length).fill(0);
    
            return datasets.map((dataset, i) => {
                let pathSegments: string[] = [];
                let currentSegment: {x:number, y0:number, y1:number}[] = [];
    
                for (let j = 0; j < dataset.data.length; j++) {
                    const value = dataset.data[j] as number;
                    if (value != null && !isNaN(value)) {
                        currentSegment.push({
                            x: x(j),
                            y0: y(yOffsets[j]),
                            y1: y(yOffsets[j] + value)
                        });
                    } else {
                        if (currentSegment.length > 0) {
                            pathSegments.push(buildSegmentPath(currentSegment));
                            currentSegment = [];
                        }
                    }
                }
                if (currentSegment.length > 0) {
                    pathSegments.push(buildSegmentPath(currentSegment));
                }
    
                dataset.data.forEach((d, j) => {
                    const value = d as number;
                    if (value != null && !isNaN(value)) {
                        yOffsets[j] += value;
                    }
                });
    
                const color = dataset.color.replace('1)', '0.6)');
    
                return <path key={i} d={pathSegments.join(' ')} fill={color} stroke="none" />;
            }).reverse(); // Draw from top to bottom so borders overlap correctly if drawn
        }

        return datasets.map((dataset, i) => {
             const pathData = dataset.data.reduce((path, d, j) => {
                const value = d as number;
                if (value == null || isNaN(value)) return path; 
                
                const point = `${x(j)},${y(value)}`;
                const prevIsNaN = j > 0 && (dataset.data[j - 1] == null || isNaN(dataset.data[j-1] as number));
                
                return `${path} ${path === '' || prevIsNaN ? 'M' : 'L'} ${point}`;
            }, '');
            
            const clipPathId = `clip-path-${i}`;

            if (type === 'line') {
                return <path key={i} d={pathData} fill="none" stroke={dataset.color} strokeWidth="2" clipPath={`url(#${clipPathId})`} />;
            }
            if (type === 'area') {
                let areaPathData = pathData;
                if(pathData) {
                    const firstPoint = `${x(startIndex)},${height - padding.bottom}`;
                    const lastPoint = `${x(endIndex)},${height - padding.bottom}`;
                    areaPathData = `M ${firstPoint} ${pathData.substring(1)} L ${lastPoint} Z`;
                }

                const color = dataset.color.replace('1)', '0.2)');
                return (
                     <g key={i} clipPath={`url(#${clipPathId})`}>
                        <path d={areaPathData} fill={color} stroke="none" />
                        <path d={pathData} fill="none" stroke={dataset.color} strokeWidth="2" />
                    </g>
                );
            }
            return null;
        });
    };
    
    const renderBars = () => {
        const domainWidth = viewDomain.max - viewDomain.min;
        const totalItems = domainWidth > 0 ? domainWidth : labels.length;
        const barWidth = (width - padding.left - padding.right) / (totalItems + 1) * 0.8;
        const groupWidth = barWidth / datasets.length;

        return Array.from({length: endIndex - startIndex + 1}).map((_, i) => {
             const dataIndex = startIndex + i;
             return (
                 <g key={dataIndex}>
                    {datasets.map((dataset, j) => {
                        const value = dataset.data[dataIndex] as number;
                        if (value == null || isNaN(value)) return null;

                        const xPos = x(dataIndex) - barWidth / 2 + j * groupWidth;
                        const yPos = y(value);
                        const barHeight = Math.max(0, height - padding.bottom - yPos);
                        return (
                            <rect key={`${dataIndex}-${j}`} x={xPos} y={yPos} width={groupWidth} height={barHeight} fill={dataset.color} />
                        );
                    })}
                </g>
             )
        });
    };

    return (
        <div ref={containerRef}>
            <div className="flex justify-end mb-2">
                <div className="inline-flex items-center gap-0.5 p-1 bg-slate-100/80 dark:bg-gray-900/50 backdrop-blur-sm rounded-lg border border-slate-200 dark:border-gray-700">
                    <button onClick={() => handlePanButtons('left')} title="Pan Left" className="p-1.5 rounded text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600"><ChevronLeftIcon /></button>
                    <button onClick={() => handlePanButtons('right')} title="Pan Right" className="p-1.5 rounded text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600"><ChevronRightIcon /></button>
                    <button onClick={() => handleZoom('in')} title="Zoom In" className="p-1.5 rounded text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600"><PlusIcon /></button>
                    <button onClick={() => handleZoom('out')} title="Zoom Out" className="p-1.5 rounded text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600"><MinusIcon /></button>
                    <button onClick={handleReset} title="Reset View" className="p-1.5 rounded text-gray-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-600"><RefreshIcon className="h-5 w-5"/></button>
                </div>
            </div>
            <div className="relative">
                <svg
                    ref={svgRef}
                    width={width}
                    height={height}
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onMouseDown={handleMouseDown}
                    onMouseUp={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    style={{ cursor: 'grab', touchAction: 'none' }}
                    className="select-none"
                >
                    <defs>
                        {datasets.map((_, i) => (
                            <clipPath key={i} id={`clip-path-${i}`}>
                                <rect x={padding.left} y={padding.top} width={width - padding.left - padding.right} height={height - padding.top - padding.bottom} />
                            </clipPath>
                        ))}
                    </defs>

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
                        className="absolute p-2 bg-white dark:bg-gray-900/80 backdrop-blur-sm border dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-md shadow-lg text-sm pointer-events-none"
                        style={{
                            left: `${tooltip.x + 10}px`,
                            top: `${tooltip.y - 10}px`,
                            transform: tooltip.x > width / 1.5 ? `translateX(calc(-100% - 20px))` : 'translateX(0)',
                            opacity: tooltip.visible ? 1 : 0,
                            transition: 'opacity 0.1s ease'
                        }}
                    >
                        {tooltip.content}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProgressChart;
