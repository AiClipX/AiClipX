export type VideoStatus = "Draft" | "Processing" | "Completed";

export interface Video {
  id: string;
  title: string;
  status: VideoStatus;
  thumbnail: string;
  url: string;
  createdAt: string;
}
