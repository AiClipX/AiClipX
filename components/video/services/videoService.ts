import { Video, VideoStatus } from "../types/videoTypes";
import { config, safeLog } from "../../../lib/config";
import { handleAuthError, getSafeErrorMessage, generateRequestId, isAuthError } from "../../../lib/authErrorHandler";
import { apiCallTracker, extractRequestId } from "../../../lib/apiCallTracker";

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
  const token = typeof window !== "undefined" ? localStorage.getItem("aiclipx_token") : null;
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  const queryParams = new URLSearchParams(buildCursorParams(params) as any);
  const endpoint = `${config.apiBaseUrl}/api/video-tasks?${queryParams}`;
  
  try {
    const response = await fetch(endpoint, {
      headers: {
        "Authorization": token ? `Bearer ${token}` : "",
        "X-Request-Id": requestId,
      },
    });

    const duration = Date.now() - startTime;
    const responseRequestId = response.headers.get('X-Request-Id') || requestId;

    if (!response.ok) {
      // Track failed call
      apiCallTracker.addCall({
        method: 'GET',
        endpoint,
        status: response.status,
        requestId: responseRequestId,
        duration,
        error: `Failed to fetch videos: ${response.status}`,
      });

      // Handle auth errors consistently
      if (response.status === 401 || response.status === 403) {
        handleAuthError({
          status: response.status as 401 | 403,
          message: "Authentication failed",
          requestId: responseRequestId
        });
      }
      throw new Error(`Failed to fetch videos: ${response.status}`);
    }

    // Track successful call
    apiCallTracker.addCall({
      method: 'GET',
      endpoint,
      status: response.status,
      requestId: responseRequestId,
      duration,
    });

    const data = await response.json();
    return {
      data: data.data.map(parseVideo),
      nextCursor: data.nextCursor,
    };
  } catch (error: any) {
    // Track error if not already tracked
    if (!error.message?.includes('Failed to fetch videos')) {
      apiCallTracker.addCall({
        method: 'GET',
        endpoint,
        status: null,
        requestId,
        duration: Date.now() - startTime,
        error: error.message,
      });
    }
    throw error;
  }
}

export async function getVideoById(id: string): Promise<Video | null> {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("aiclipx_token") : null;
    const requestId = generateRequestId();
    
    const response = await fetch(`${config.apiBaseUrl}/api/video-tasks/${id}`, {
      headers: {
        "Authorization": token ? `Bearer ${token}` : "",
        "X-Request-Id": requestId,
      },
    });
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      // Handle auth errors consistently
      if (response.status === 401 || response.status === 403) {
        handleAuthError({
          status: response.status as 401 | 403,
          message: "Authentication failed",
          requestId
        });
      }
      throw new Error(`Failed to fetch video: ${response.status}`);
    }
    
    const data = await response.json();
    return parseVideo(data);
  } catch (err: any) {
    if (err?.message?.includes("Failed to fetch video")) {
      throw err;
    }
    return null;
  }
}

export async function createVideoTask(payload: {
  title: string;
  prompt: string;
  engine: string;
  params?: any;
}): Promise<Video> {
  const requestId = generateRequestId();
  const idempotencyKey = `create_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("aiclipx_token") : null;
    
    const response = await fetch(`${config.apiBaseUrl}/api/video-tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token ? `Bearer ${token}` : "",
        "X-Request-Id": requestId,
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // Handle auth errors consistently
      if (response.status === 401 || response.status === 403) {
        handleAuthError({
          status: response.status as 401 | 403,
          message: errorData.message || "Authentication failed",
          requestId
        });
      }
      
      // Create safe error with requestId
      const error = new Error(getSafeErrorMessage(errorData, requestId));
      (error as any).requestId = requestId;
      throw error;
    }
    
    const data = await response.json();
    return parseVideo(data);
  } catch (error: any) {
    safeLog("Create video error (no sensitive data)", { hasError: !!error, requestId });
    throw error;
  }
}

export async function deleteVideoTask(id: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("aiclipx_token") : null;
  const requestId = generateRequestId();
  
  const response = await fetch(`${config.apiBaseUrl}/api/video-tasks/${id}`, {
    method: "DELETE",
    headers: {
      "Authorization": token ? `Bearer ${token}` : "",
      "X-Request-Id": requestId,
    },
  });

  if (!response.ok) {
    // Handle auth errors consistently
    if (response.status === 401 || response.status === 403) {
      handleAuthError({
        status: response.status as 401 | 403,
        message: "Authentication failed",
        requestId
      });
    }
    throw new Error(`Failed to delete video: ${response.status}`);
  }
}
