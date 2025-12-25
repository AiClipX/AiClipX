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
