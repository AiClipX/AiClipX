export type VideoStatus =
  | "draft"
  | "queued"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled";

export interface Video {
  id: string;
  title: string;
  status: VideoStatus;
  createdAt: string;
  updatedAt: string;
  videoUrl: string | null;
  errorMessage: string | null;
  progress: number;
  sourceImageUrl: string | null;
  engine: string;
  params: any;
  debug: any;
  prompt: string;
  // Computed fields for UI
  thumbnail?: string;
  url?: string | null;
  duration?: string;
  ratio?: string;
  language?: string;
}

// Config hiển thị
export const VIDEO_STATUS_CONFIG: Record<
  VideoStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "text-gray-400",
  },
  queued: {
    label: "Waiting", // Queued hiển thị là "Waiting"
    className: "text-gray-400", // màu xám
  },
  processing: {
    label: "Processing",
    className: "text-yellow-400", // màu vàng
  },
  completed: {
    label: "Completed",
    className: "text-green-400", // màu xanh
  },
  failed: {
    label: "Failed",
    className: "text-red-400",
  },
  cancelled: {
    label: "Cancelled",
    className: "text-gray-400",
  },
};
