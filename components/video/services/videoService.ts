import axios from "axios";
import { Video, VideoStatus } from "../types/videoTypes";

const API_URL = `${process.env.NEXT_PUBLIC_API_VIDEO}/api/video-tasks`;

/* =====================
   Helpers
===================== */

function parseStatus(status: string): VideoStatus {
  switch (status.toLowerCase()) {
    case "pending":
      return "Pending";
    case "processing":
      return "Processing";
    case "completed":
      return "Completed";
    case "failed":
      return "Failed";
    case "draft":
      return "Draft";
    default:
      return "Processing";
  }
}

function getPlaceholderThumbnail(status: VideoStatus): string {
  switch (status) {
    case "Completed":
      return "https://picsum.photos/400/225?random=3";
    case "Processing":
      return "https://picsum.photos/400/225?random=2";
    case "Failed":
      return "https://picsum.photos/400/225?random=4";
    default:
      return "https://picsum.photos/400/225?random=1";
  }
}

// mock video url for completed videos because the API does not provide real video URLs
function resolveVideoUrl(status: VideoStatus): string | null {
  if (status === "Completed") {
    return "/mock/sample.mp4";
  }
  return null;
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
    prompt: "",
    errorMessage: raw.errorMessage || null,
  };
}

/* =====================
   API
===================== */

export const fetchVideos = async (): Promise<{ data: Video[] }> => {
  const res = await axios.get(API_URL);

  return {
    data: res.data.data.map(parseVideo),
  };
};

export const getVideoById = async (id: string): Promise<Video | null> => {
  try {
    const res = await axios.get(`${API_URL}/${id}`);
    return parseVideo(res.data);
  } catch {
    return null;
  }
};
