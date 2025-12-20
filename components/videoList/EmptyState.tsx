export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
      {/* Icon hoặc hình ảnh */}
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
          d="M3 7h18M3 12h18M3 17h18"
        />
      </svg>

      <p className="text-lg font-medium">No videos found</p>
      <p className="text-sm text-neutral-500 mt-1">
        Try changing the filter or check back later.
      </p>
    </div>
  );
}
