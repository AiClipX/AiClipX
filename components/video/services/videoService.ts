import { mockVideos } from "../mocks/videoMock";
import { Video } from "../types/videoTypes";

interface FetchVideosParams {
  status?: string;
  sort?: "newest" | "oldest";
  search?: string;
  page?: number;
  pageSize?: number;
}

export const fetchVideos = async ({
  status,
  sort = "newest",
  search,
  page = 1,
  pageSize = 12,
}: FetchVideosParams): Promise<{ data: Video[]; total: number }> => {
  let filtered = [...mockVideos];

  if (status && status !== "All")
    filtered = filtered.filter((v) => v.status === status);
  if (search)
    filtered = filtered.filter((v) =>
      v.title.toLowerCase().includes(search.toLowerCase())
    );

  filtered.sort((a, b) =>
    sort === "newest"
      ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);

  return new Promise((resolve) =>
    setTimeout(() => resolve({ data, total }), 300)
  );
};

export const getVideoById = async (id: string): Promise<Video | null> => {
  const found = mockVideos.find((v) => v.id === id);
  return new Promise((resolve) =>
    setTimeout(() => resolve(found || null), 300)
  );
};
