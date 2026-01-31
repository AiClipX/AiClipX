import React from 'react';

interface TemplateCardSkeletonProps {
  className?: string;
}

export function TemplateCardSkeleton({ className = '' }: TemplateCardSkeletonProps) {
  return (
    <div className={`bg-neutral-800 rounded-lg p-6 animate-pulse ${className}`}>
      {/* Header with icon and title */}
      <div className="flex items-start gap-3 mb-4">
        <div className="w-8 h-8 bg-neutral-700 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-neutral-700 rounded w-3/4" />
          <div className="h-4 bg-neutral-700 rounded w-1/2" />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-2 mb-4">
        <div className="h-4 bg-neutral-700 rounded w-full" />
        <div className="h-4 bg-neutral-700 rounded w-5/6" />
        <div className="h-4 bg-neutral-700 rounded w-2/3" />
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="h-6 bg-neutral-700 rounded-full w-16" />
        <div className="h-6 bg-neutral-700 rounded-full w-20" />
        <div className="h-6 bg-neutral-700 rounded-full w-14" />
      </div>

      {/* Use case */}
      <div className="mb-6">
        <div className="h-4 bg-neutral-700 rounded w-1/3 mb-2" />
        <div className="h-4 bg-neutral-700 rounded w-4/5" />
      </div>

      {/* Button */}
      <div className="h-10 bg-neutral-700 rounded-lg w-full" />
    </div>
  );
}

export default TemplateCardSkeleton;