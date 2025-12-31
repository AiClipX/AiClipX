import axios from "axios";
import { Video, VideoStatus } from "../types/videoTypes";

const API_URL = `${process.env.NEXT_PUBLIC_API_VIDEO}/api/video-tasks`;

/* =====================
   Helpers
===================== */

function parseStatus(status: string): VideoStatus {
  switch (status?.toLowerCase()) {
    case "pending":
      return "Pending";
    case "processing":
      return "Processing";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    default:
      return "Processing";
  }
}

function getPlaceholderThumbnail(status: VideoStatus): string {
  return `https://picsum.photos/400/225?random=${status}`;
}

function resolveVideoUrl(status: VideoStatus): string | null {
  return status === "Completed" ? "/mock/sample.mp4" : null;
}

function parseVideo(raw: any): Video {
  const status = parseStatus(raw.status);

  return {
    id: raw.id,
    title: raw.title,
    status,
    createdAt: raw.createdAt,
    thumbnail: raw.thumbnail || getPlaceholderThumbnail(status),
    url: raw.videoUrl || resolveVideoUrl(status),
    duration: undefined,
    ratio: undefined,
    language: undefined,
    prompt: raw.prompt || "",
    errorMessage: raw.errorMessage || null,
  };
}

/* =====================
   Cursor param sanitizer (FIX 422)
===================== */

function buildCursorParams(params: {
  limit: number;
  cursor?: string;
  sort: "createdAt_desc" | "createdAt_asc";
}) {
  const clean: Record<string, any> = {
    limit: params.limit,
    sort: params.sort,
  };

  // ⚠️ cursor chỉ gửi khi thật sự tồn tại
  if (params.cursor) {
    clean.cursor = params.cursor;
  }

  return clean;
}

/* =====================
   Cursor API
===================== */
export async function fetchVideosCursor(params: {
  limit: number;
  cursor?: string;
  sort: "createdAt_desc" | "createdAt_asc";
  status?: string; // ✅ THÊM DÒNG NÀY
}): Promise<{ data: Video[]; nextCursor?: string }> {
  const res = await axios.get(API_URL, {
    params: buildCursorParams(params), // ✅ FIX
  });

  return {
    data: res.data.data.map(parseVideo),
    nextCursor: res.data.nextCursor,
  };
}

export async function getVideoById(id: string): Promise<Video | null> {
  try {
    const res = await axios.get(`${API_URL}/${id}`);
    return parseVideo(res.data);
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function deleteVideoTask(id: string) {
  return axios.delete(`${API_URL}/${id}`);
}
