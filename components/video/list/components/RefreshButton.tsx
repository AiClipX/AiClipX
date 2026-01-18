import React, { useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { formatLastUpdated } from '../../../../lib/pollingManager';

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
  lastUpdated: number;
  isPolling?: boolean;
  className?: string;
}

const RefreshButton: React.FC<RefreshButtonProps> = ({ 
  onRefresh, 
  lastUpdated,
  isPolling = false,
  className = '' 
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Last Updated */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <span className="font-medium">Last updated:</span>
        <span className="text-gray-500">{formatLastUpdated(lastUpdated)}</span>
        {isPolling && (
          <span className="flex items-center gap-1 text-blue-600">
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
            <span className="text-xs">Auto-refreshing</span>
          </span>
        )}
      </div>

      {/* Manual Refresh Button */}
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-lg
          text-sm font-medium
          transition-all duration-200
          ${isRefreshing 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-blue-50 text-blue-600 hover:bg-blue-100 active:scale-95'
          }
        `}
        title="Manual refresh"
      >
        <ArrowPathIcon 
          className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} 
        />
        <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
      </button>
    </div>
  );
};

export default RefreshButton;