export type VideoStatus =
  | "draft"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

export interface Video {
  id: string;
  title: string;
  status: VideoStatus; // dùng chữ thường
  createdAt: string;
  thumbnail: string;
  url: string | null;
  duration?: string;
  ratio?: string;
  language?: string;
  prompt: string;
  errorMessage?: string | null;
}

// Config hiển thị
export const VIDEO_STATUS_CONFIG: Record<
  VideoStatus,
  { label: string; className: string }
> = {
  draft: {
    label: "Draft",
    className: "text-gray-600",
  },
  queued: {
    label: "Waiting",
    className: "text-gray-400",
  },
  processing: {
    label: "Processing",
    className: "text-yellow-400",
  },
  completed: {
    label: "Completed",
    className: "text-green-400",
  },
  failed: {
    label: "Failed",
    className: "text-red-500",
  },
};
