import { Video, VideoStatus } from "../types/videoTypes";

const STATUSES: VideoStatus[] = ["Draft", "Processing", "Completed"];

export const VIDEO_MOCK: Video[] = Array.from({ length: 100 }).map(
  (_, index) => {
    const status = STATUSES[index % STATUSES.length];

    return {
      id: String(index + 1),
      title: `Video ${index + 1}`,
      status,
      createdAt: new Date(Date.now() - index * 86400000).toISOString(),
      thumbnail: `https://picsum.photos/400/225?random=${index + 1}`,
    };
  }
);
