export function VideoCardSkeleton() {
  return (
    <div className="bg-neutral-900 rounded-lg overflow-hidden animate-pulse">
      {/* Thumbnail skeleton */}
      <div className="aspect-video bg-neutral-800" />
      
      {/* Content skeleton */}
      <div className="p-3 space-y-2">
        {/* Title */}
        <div className="h-4 bg-neutral-800 rounded w-3/4" />
        
        {/* Metadata row */}
        <div className="flex justify-between items-center">
          <div className="h-3 bg-neutral-800 rounded w-1/4" />
          <div className="h-3 bg-neutral-800 rounded w-1/5" />
        </div>
        
        {/* Actions row */}
        <div className="flex justify-between items-center pt-1">
          <div className="h-3 bg-neutral-800 rounded w-1/6" />
          <div className="h-3 bg-neutral-800 rounded w-1/5" />
          <div className="h-3 bg-neutral-800 rounded w-1/6" />
        </div>
      </div>
    </div>
  );
}
