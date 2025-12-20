import { VIDEO_MOCK } from "../mocks/videoMock";
import { VideoStatus } from "../types/videoTypes";

export async function fetchVideos({
  status,
  sort,
  page,
  pageSize,
  search,
}: {
  status?: VideoStatus;
  sort: "newest" | "oldest";
  page: number;
  pageSize: number;
  search?: string;
}) {
  await new Promise((r) => setTimeout(r, 200));
  let data = [...VIDEO_MOCK];

  if (status) data = data.filter((v) => v.status === status);
  if (search)
    data = data.filter((v) =>
      v.title.toLowerCase().includes(search.toLowerCase())
    );

  data.sort((a, b) =>
    sort === "newest"
      ? +new Date(b.createdAt) - +new Date(a.createdAt)
      : +new Date(a.createdAt) - +new Date(b.createdAt)
  );

  const total = data.length;
  const start = (page - 1) * pageSize;
  return { data: data.slice(start, start + pageSize), total };
}
