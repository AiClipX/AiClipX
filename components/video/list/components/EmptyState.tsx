import { useVideoListContext } from "../hooks/VideoListContext";

interface Props {
  onCreateClick?: () => void;
}

export function EmptyState({ onCreateClick }: Props) {
  const { status, search, setStatus, setSearch } = useVideoListContext();
  
  const hasFilters = status !== "All" || search.trim() !== "";

  const handleReset = () => {
    setStatus("All");
    setSearch("");
  };

  if (hasFilters) {
    // Empty search/filter results
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-16 w-16 mb-4 text-neutral-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        <p className="text-lg font-medium">No videos found</p>
        <p className="text-sm text-neutral-500 mt-1 mb-4">
          No videos match your current filters or search.
        </p>
        
        <button
          onClick={handleReset}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm font-medium transition"
        >
          Clear Filters
        </button>
      </div>
    );
  }

  // No tasks at all
  return (
    <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-16 w-16 mb-4 text-neutral-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
        />
      </svg>

      <p className="text-lg font-medium">No video tasks yet</p>
      <p className="text-sm text-neutral-500 mt-1 mb-4">
        Get started by creating your first video task.
      </p>
      
      {onCreateClick && (
        <button
          onClick={onCreateClick}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium transition"
        >
          Create Your First Task
        </button>
      )}
    </div>
  );
}
