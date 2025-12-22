// components/video/services/videoService.ts
import axios from "axios";
import { Video, VideoStatus } from "../types/videoTypes";
import backendMock from "../mocks/videoBackendMock.json";

const API_URL = "/api/videos"; // sau này đổi thành BE thật

function parseStatus(status: string): VideoStatus {
  switch (status.toLowerCase()) {
    case "draft":
      return "Draft";
    case "processing":
      return "Processing";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      throw new Error("Unknown status: " + status);
  }
}

function parseVideo(raw: any): Video {
  return {
    id: raw.id,
    title: raw.title,
    thumbnail: raw.thumbnailUrl,
    url: raw.videoUrl,
    status: parseStatus(raw.status),
    createdAt: raw.createdAt,
    prompt: raw.prompt || "",
    errorMessage: raw.errorMessage || null,
    duration: raw.duration,
    ratio: raw.ratio,
    language: raw.language,
  };
}

// hiện tại dùng mock JSON, sau này chỉ đổi API_URL
export const fetchVideos = async (params: {
  status?: "All" | VideoStatus;
  sort?: "newest" | "oldest";
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ data: Video[]; total: number }> => {
  if (process.env.NODE_ENV === "development") {
    // dùng mock
    let filtered = backendMock.items.map(parseVideo);
    if (params.status && params.status !== "All")
      filtered = filtered.filter((v) => v.status === params.status);
    if (params.search)
      filtered = filtered.filter((v) =>
        v.title.toLowerCase().includes(params.search!.toLowerCase())
      );
    filtered.sort((a, b) =>
      params.sort === "oldest"
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const total = filtered.length;
    const start = ((params.page || 1) - 1) * (params.pageSize || 12);
    const data = filtered.slice(start, start + (params.pageSize || 12));
    return new Promise((resolve) =>
      setTimeout(() => resolve({ data, total }), 200)
    );
  }

  const res = await axios.get(API_URL, { params });
  return {
    data: res.data.items.map(parseVideo),
    total: res.data.pagination.total,
  };
};

export const getVideoById = async (id: string): Promise<Video | null> => {
  if (process.env.NODE_ENV === "development") {
    const raw = backendMock.items.find((v: any) => v.id === id);
    return raw ? parseVideo(raw) : null;
  }
  const res = await axios.get(`${API_URL}/${id}`);
  return parseVideo(res.data);
};
