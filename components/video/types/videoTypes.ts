export type VideoStatus =
  | "Draft"
  | "Processing"
  | "Completed"
  | "Failed"
  | "Pending";

export interface Video {
  id: string;
  title: string;
  status: VideoStatus;
  createdAt: string;
  thumbnail: string;
  url: string | null;
  duration?: string;
  ratio?: string;
  language?: string;
  prompt: string;
  errorMessage?: string | null;
}

export const VIDEO_STATUS_CONFIG: Record<
  VideoStatus,
  { label: string; className: string }
> = {
  Draft: {
    label: "Draft",
    className: "text-gray-600",
  },
  Pending: {
    label: "Waiting",
    className: "text-gray-400",
  },
  Processing: {
    label: "Processing…",
    className: "text-yellow-400",
  },
  Completed: {
    label: "Completed",
    className: "text-green-400",
  },
  Failed: {
    label: "Failed",
    className: "text-red-500",
  },
};
