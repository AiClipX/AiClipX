import { Video } from "../../types/videoTypes";
import { VideoStatusBadge } from "./VideoStatusBadge";

export function VideoMeta({ video }: { video: Video }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold mb-3 text-white">{video.title}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 text-sm">Status:</span>
            <VideoStatusBadge status={video.status} />
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 text-sm">Engine:</span>
            <span className="text-white text-sm capitalize">{video.engine}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-neutral-400 text-sm">Created:</span>
            <span className="text-white text-sm">
              {new Date(video.createdAt).toLocaleString()}
            </span>
          </div>

          {video.updatedAt !== video.createdAt && (
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 text-sm">Updated:</span>
              <span className="text-white text-sm">
                {new Date(video.updatedAt).toLocaleString()}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-neutral-400 text-sm">Progress:</span>
            <span className="text-white text-sm">{video.progress}%</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-neutral-400 text-sm">Task ID:</span>
            <span className="text-white text-sm font-mono">{video.id}</span>
          </div>

          {video.params && (
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 text-sm">Params:</span>
              <span className="text-white text-sm">
                {video.params.durationSec}s, {video.params.ratio || "16:9"}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <div className="text-neutral-400 text-sm mb-1">Prompt:</div>
        <div className="text-white text-sm bg-neutral-800 p-3 rounded">
          {video.prompt}
        </div>
      </div>

      {video.errorMessage && (
        <div className="mb-4">
          <div className="text-red-400 text-sm mb-1">Error Message:</div>
          <div className="text-red-300 text-sm bg-red-900/20 p-3 rounded border border-red-800">
            {video.errorMessage}
          </div>
        </div>
      )}
    </div>
  );
}
