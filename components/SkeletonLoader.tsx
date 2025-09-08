import React from 'react';

const SkeletonLoader: React.FC<{ className?: string }> = ({ className = 'bg-gray-200 dark:bg-gray-700 rounded' }) => {
    return <div className={`animate-pulse ${className}`} />;
};

export default SkeletonLoader;
