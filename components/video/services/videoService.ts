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
  const token = typeof window !== "undefined" ? localStorage.getItem("aiclipx_token") : null;
  const apiBase = process.env.NEXT_PUBLIC_API_VIDEO || "";
  
  const queryParams = new URLSearchParams(buildCursorParams(params) as any);
  const response = await fetch(`${apiBase}/api/video-tasks?${queryParams}`, {
    headers: {
      "Authorization": token ? `Bearer ${token}` : "",
    },
  });

  if (!response.ok) {
    // Only logout on actual 401, not network errors
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("aiclipx_token");
      window.location.href = "/login";
    }
    throw new Error(`Failed to fetch videos: ${response.status}`);
  }

  const data = await response.json();
  return {
    data: data.data.map(parseVideo),
    nextCursor: data.nextCursor,
  };
}

export async function getVideoById(id: string): Promise<Video | null> {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("aiclipx_token") : null;
    const apiBase = process.env.NEXT_PUBLIC_API_VIDEO || "";
    
    const response = await fetch(`${apiBase}/api/video-tasks/${id}`, {
      headers: {
        "Authorization": token ? `Bearer ${token}` : "",
      },
    });
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      // Only logout on actual 401
      if (response.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("aiclipx_token");
        window.location.href = "/login";
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
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const idempotencyKey = `create_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("aiclipx_token") : null;
    const apiBase = process.env.NEXT_PUBLIC_API_VIDEO || "";
    
    const response = await fetch(`${apiBase}/api/video-tasks`, {
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
      const errorData = await response.json();
      
      // Only logout on actual 401
      if (response.status === 401 && typeof window !== "undefined") {
        localStorage.removeItem("aiclipx_token");
        window.location.href = "/login";
      }
      
      const error = new Error(errorData.message || "Failed to create video");
      (error as any).requestId = requestId;
      throw error;
    }
    
    const data = await response.json();
    return parseVideo(data);
  } catch (error: any) {
    console.error("Create video error:", error);
    throw error;
  }
}

export async function deleteVideoTask(id: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("aiclipx_token") : null;
  const apiBase = process.env.NEXT_PUBLIC_API_VIDEO || "";
  
  const response = await fetch(`${apiBase}/api/video-tasks/${id}`, {
    method: "DELETE",
    headers: {
      "Authorization": token ? `Bearer ${token}` : "",
    },
  });

  if (!response.ok) {
    // Only logout on actual 401
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("aiclipx_token");
      window.location.href = "/login";
    }
    throw new Error(`Failed to delete video: ${response.status}`);
  }
}
