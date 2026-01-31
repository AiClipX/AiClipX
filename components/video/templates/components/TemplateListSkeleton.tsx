import React from 'react';
import { TemplateCardSkeleton } from './TemplateCardSkeleton';

interface TemplateListSkeletonProps {
  showRecentSection?: boolean;
  recentCount?: number;
  templateCount?: number;
  className?: string;
}

export function TemplateListSkeleton({ 
  showRecentSection = true,
  recentCount = 3,
  templateCount = 6,
  className = '' 
}: TemplateListSkeletonProps) {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search and filters skeleton */}
      <div className="space-y-4">
        {/* Search bar skeleton */}
        <div className="relative">
          <div className="h-12 bg-neutral-800 rounded-lg animate-pulse" />
        </div>
        
        {/* Filters skeleton */}
        <div className="flex flex-wrap gap-2">
          <div className="h-10 bg-neutral-800 rounded-lg w-24 animate-pulse" />
          <div className="h-10 bg-neutral-800 rounded-lg w-32 animate-pulse" />
          <div className="h-10 bg-neutral-800 rounded-lg w-28 animate-pulse" />
          <div className="h-10 bg-neutral-800 rounded-lg w-20 animate-pulse" />
        </div>
      </div>

      {/* Recent templates section skeleton */}
      {showRecentSection && (
        <div className="space-y-4">
          {/* Section header skeleton */}
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-neutral-700 rounded animate-pulse" />
            <div className="h-6 bg-neutral-700 rounded w-40 animate-pulse" />
            <div className="w-8 h-6 bg-neutral-700 rounded-full animate-pulse" />
          </div>
          
          {/* Recent templates grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: recentCount }).map((_, i) => (
              <TemplateCardSkeleton key={`recent-skeleton-${i}`} />
            ))}
          </div>
        </div>
      )}

      {/* All templates section skeleton */}
      <div className="space-y-4">
        {/* Section header skeleton */}
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-neutral-700 rounded animate-pulse" />
          <div className="h-6 bg-neutral-700 rounded w-32 animate-pulse" />
          <div className="w-8 h-6 bg-neutral-700 rounded-full animate-pulse" />
        </div>
        
        {/* Templates grid skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: templateCount }).map((_, i) => (
            <TemplateCardSkeleton key={`template-skeleton-${i}`} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default TemplateListSkeleton;