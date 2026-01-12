export type VideoStatus =
  | "draft"
  | "queued"
  | "processing"
  | "completed"
  | "failed";

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
    className: "text-gray-600",
  },
  queued: {
    label: "Queued",
    className: "text-yellow-500",
  },
  processing: {
    label: "Processing",
    className: "text-blue-500",
  },
  completed: {
    label: "Completed",
    className: "text-green-500",
  },
  failed: {
    label: "Failed",
    className: "text-red-500",
  },
};
