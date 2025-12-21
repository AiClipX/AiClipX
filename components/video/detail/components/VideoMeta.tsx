import { Video } from "../../types/videoTypes";
import { VideoStatusBadge } from "./VideoStatusBadge";

export function VideoMeta({ video }: { video: Video }) {
  return (
    <div className="mb-2">
      <h1 className="text-2xl font-semibold mb-2">{video.title}</h1>

      <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-400">
        <VideoStatusBadge status={video.status} />
        <span>⏱ {video.duration ?? "3:20"}</span>
        <span>🌐 {video.language ?? "EN"}</span>
        <span>📐 16:9</span>
        <span>📅 {new Date(video.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
