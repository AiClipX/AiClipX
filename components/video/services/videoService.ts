import axios from "../../../lib/apiClient";
import { Video, VideoStatus } from "../types/videoTypes";

/* =====================
   Helpers
===================== */

function getPlaceholderThumbnail(video: any): string {
  // Use sourceImageUrl if available, otherwise generate placeholder
  if (video.sourceImageUrl) return video.sourceImageUrl;
  return `https://picsum.photos/400/225?random=${video.id}`;
}

function parseVideo(raw: any): Video {
  // Defensive parsing: never pretend a completed task has a video URL.
  if (raw.status === "completed" && !raw.videoUrl) {
    console.warn(`Video ${raw.id} reported as 'completed' but missing videoUrl`);
  }

  return {
    id: raw.id,
    title: raw.title,
    status: raw.status,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    videoUrl: raw.videoUrl,
    errorMessage: raw.errorMessage,
    progress: raw.progress || 0,
    sourceImageUrl: raw.sourceImageUrl,
    engine: raw.engine,
    params: raw.params,
    debug: raw.debug,
    prompt: raw.prompt || "",
    // Computed fields for backward compatibility
    thumbnail: getPlaceholderThumbnail(raw),
    url: raw.videoUrl,
  };
}

/* =====================
   Cursor param sanitizer (FIX 422)
===================== */

function buildCursorParams(params: {
  limit: number;
  cursor?: string;
  sort: "createdAt_desc" | "createdAt_asc";
  q?: string;
  status?: string;
}) {
  const clean: Record<string, any> = {
    limit: params.limit,
    sort: params.sort,
  };

  // Only send cursor when it exists
  if (params.cursor) {
    clean.cursor = params.cursor;
  }

  // Only send search query when it exists
  if (params.q && params.q.trim()) {
    clean.q = params.q.trim();
  }

  // Only send status filter when it exists and not "All"
  if (params.status && params.status !== "All") {
    clean.status = params.status;
  }

  return clean;
}

/* =====================
   API Functions
===================== */
export async function fetchVideosCursor(params: {
  limit: number;
  cursor?: string;
  sort: "createdAt_desc" | "createdAt_asc";
  q?: string;
  status?: string;
}): Promise<{ data: Video[]; nextCursor?: string }> {
  const res = await axios.get(`/api/video-tasks`, {
    params: buildCursorParams(params),
  });

  return {
    data: res.data.data.map(parseVideo),
    nextCursor: res.data.nextCursor,
  };
}

export async function getVideoById(id: string): Promise<Video | null> {
  try {
    const res = await axios.get(`/api/video-tasks/${id}`);
    return parseVideo(res.data);
  } catch (err: any) {
    if (err?.response?.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function createVideoTask(payload: {
  title: string;
  prompt: string;
  engine: string;
  params?: any;
}): Promise<Video> {
  console.log("=== CREATE VIDEO API CALL ===");
  console.log("Request payload:", payload);

  // Generate request ID and idempotency key
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const idempotencyKey = `create_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const res = await axios.post(`/api/video-tasks`, payload, {
    headers: {
      "X-Request-Id": requestId,
      "Idempotency-Key": idempotencyKey,
    },
  });
  
  console.log("API Response:", res.data);
  return parseVideo(res.data);
}

export async function deleteVideoTask(id: string) {
  return axios.delete(`/api/video-tasks/${id}`);
}
