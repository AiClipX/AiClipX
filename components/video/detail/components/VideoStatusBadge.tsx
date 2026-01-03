const map: Record<string, string> = {
  Draft: "bg-red-500/20 text-red-400",
  Processing: "bg-yellow-500/20 text-yellow-400",
  Completed: "bg-green-500/20 text-green-400",
};

export function VideoStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${
        map[status] ?? "bg-neutral-700"
      }`}
    >
      {status}
    </span>
  );
}
