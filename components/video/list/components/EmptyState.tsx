import { useVideoListContext } from "../hooks/VideoListContext";

interface Props {
  onCreateClick?: () => void;
  showFiltersEmpty: boolean;
}

export function EmptyState({ onCreateClick, showFiltersEmpty }: Props) {
  const { setStatus, setSearch } = useVideoListContext();

  const handleReset = () => {
    setStatus("All");
    setSearch("");
  };

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
        {showFiltersEmpty ? (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        ) : (
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        )}
      </svg>

      <p className="text-lg font-medium">
        {showFiltersEmpty ? "No videos found" : "No video tasks yet"}
      </p>
      <p className="text-sm text-neutral-500 mt-1 mb-4">
        {showFiltersEmpty 
          ? "No videos match your current filters or search."
          : "Get started by creating your first video task."
        }
      </p>
      
      {/* Always show a button to maintain consistent layout height */}
      <div className="h-12 flex items-center">
        {showFiltersEmpty ? (
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm font-medium transition"
          >
            Clear Filters
          </button>
        ) : (
          onCreateClick && (
            <button
              onClick={onCreateClick}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium transition"
            >
              Create Your First Task
            </button>
          )
        )}
      </div>
    </div>
  );
}
