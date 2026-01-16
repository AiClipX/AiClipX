import { VideoStatus, VIDEO_STATUS_CONFIG } from "../../types/videoTypes";

export function VideoStatusBadge({ status }: { status: VideoStatus | string }) {
  const config = VIDEO_STATUS_CONFIG[status as VideoStatus];
  
  // Map status to background and text colors
  const colorMap: Record<string, string> = {
    draft: "bg-gray-500/20 text-gray-400",
    queued: "bg-gray-500/20 text-gray-400", // Waiting - màu xám
    processing: "bg-yellow-500/20 text-yellow-400", // Processing - màu vàng
    completed: "bg-green-500/20 text-green-400", // Completed - màu xanh
    failed: "bg-red-500/20 text-red-400",
  };

  const colorClass = colorMap[status] || "bg-neutral-700 text-neutral-400";
  const label = config?.label || status;

  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}
    >
      {label}
    </span>
  );
}
