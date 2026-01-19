import { Video, VideoStatus } from "../types/videoTypes";
import { config, safeLog } from "../../../lib/config";
import { getSafeErrorMessage, generateRequestId } from "../../../lib/authErrorHandler";
import axios from "../../../lib/apiClient";

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
    safeLog(`Video ${raw.id} reported as 'completed' but missing videoUrl`);
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
  const queryParams = new URLSearchParams(buildCursorParams(params) as any);
  
  const response = await axios.get(`/api/video-tasks?${queryParams}`);
  
  return {
    data: response.data.data.map(parseVideo),
    nextCursor: response.data.nextCursor,
  };
}

export async function getVideoById(id: string): Promise<Video | null> {
  try {
    const response = await axios.get(`/api/video-tasks/${id}`);
    return parseVideo(response.data);
  } catch (err: any) {
    // 404 is expected - video not found
    if (err?.response?.status === 404) {
      return null;
    }
    // Other errors should be thrown
    throw err;
  }
}

export async function createVideoTask(payload: {
  title: string;
  prompt: string;
  engine: string;
  params?: any;
}, options?: {
  idempotencyKey?: string;
}): Promise<Video> {
  const requestId = generateRequestId();
  const idempotencyKey = options?.idempotencyKey || `create_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    const response = await axios.post('/api/video-tasks', payload, {
      headers: {
        "X-Request-Id": requestId,
        "Idempotency-Key": idempotencyKey,
      },
    });
    
    return parseVideo(response.data);
  } catch (error: any) {
    safeLog("Create video error (no sensitive data)", { hasError: !!error, requestId });
    
    // Attach additional error context for debugging
    const enhancedError = new Error(getSafeErrorMessage(error, requestId));
    (enhancedError as any).requestId = requestId;
    (enhancedError as any).idempotencyKey = idempotencyKey;
    (enhancedError as any).status = error?.response?.status;
    (enhancedError as any).response = error?.response;
    
    throw enhancedError;
  }
}

export async function deleteVideoTask(id: string) {
  const requestId = generateRequestId();
  
  await axios.delete(`/api/video-tasks/${id}`, {
    headers: {
      "X-Request-Id": requestId,
    },
  });
}
