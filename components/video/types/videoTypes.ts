export type VideoStatus = "Draft" | "Processing" | "Completed";

export interface Video {
  id: string;
  title: string;
  status: VideoStatus;
  createdAt: string;
  thumbnail: string;
  url: string;
  duration?: string;
  ratio?: string;
  language?: string;
}
