// components/video/mocks/videoMock.ts
import { Video } from "../types/videoTypes";

export const mockVideos: Video[] = Array.from({ length: 100 }).map((_, i) => ({
  id: `video-${i}`,
  title: `Video ${i + 1}`,
  status: ["Draft", "Processing", "Completed", "Failed"][
    i % 4
  ] as Video["status"],
  createdAt: new Date(Date.now() - i * 3600 * 1000).toISOString(),
  thumbnail: `https://picsum.photos/seed/video-${i}/400/225`,
  url: "https://www.w3schools.com/html/mov_bbb.mp4",
  duration: `${3 + (i % 5)}:${(i * 7) % 60}`.padStart(2, "0"),
  ratio: "16:9",
  language: i % 2 === 0 ? "EN" : "VI",
  prompt: `Prompt for video ${i + 1}`,
  errorMessage: i % 4 === 3 ? "Failed due to server error" : null,
}));
