import { VIDEO_MOCK } from "../mocks/videoMock";
import { Video, VideoStatus } from "../types/videoTypes";

interface FetchParams {
  status?: VideoStatus;
  page: number;
  pageSize: number;
  sort?: "newest" | "oldest";
}

export function fetchVideos({
  status,
  page,
  pageSize,
  sort = "newest",
}: FetchParams): Promise<{
  data: Video[];
  total: number;
}> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let filtered = VIDEO_MOCK;

      if (status) {
        filtered = filtered.filter((v) => v.status === status);
      }

      filtered = [...filtered].sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();

        return sort === "newest" ? timeB - timeA : timeA - timeB;
      });

      const start = (page - 1) * pageSize;
      const end = start + pageSize;

      resolve({
        data: filtered.slice(start, end),
        total: filtered.length,
      });
    }, 500);
  });
}
