import { Video } from "../../types/videoTypes";

interface Props {
  video: Video;
}

export function VideoPlayer({ video }: Props) {
  // Show different states based on video status
  if (video.status === "failed") {
    return (
      <div className="aspect-video bg-neutral-900 mb-4 flex items-center justify-center text-sm">
        <div className="p-6 text-center">
          <div className="text-red-400 text-lg font-semibold mb-2">Video Generation Failed</div>
          <div className="text-neutral-300 mb-4">
            {video.errorMessage || "An error occurred during video generation"}
          </div>
          <div className="text-xs text-neutral-500">
            Task ID: {video.id}
          </div>
        </div>
      </div>
    );
  }

  if (video.status === "processing" || video.status === "queued") {
    return (
      <div className="aspect-video bg-neutral-900 mb-4 flex items-center justify-center text-sm">
        <div className="p-6 text-center">
          <div className="text-blue-400 text-lg font-semibold mb-2">
            {video.status === "processing" ? "Processing Video..." : "Video Queued"}
          </div>
          <div className="text-neutral-300 mb-4">
            {video.status === "processing" 
              ? `Progress: ${video.progress}%` 
              : "Your video is in the queue and will be processed soon"
            }
          </div>
          {video.status === "processing" && (
            <div className="w-full bg-neutral-700 rounded-full h-2 mb-4">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${video.progress}%` }}
              ></div>
            </div>
          )}
          <div className="text-xs text-neutral-500">
            Task ID: {video.id}
          </div>
        </div>
      </div>
    );
  }

  if (!video.videoUrl) {
    return (
      <div className="aspect-video bg-neutral-900 mb-4 flex items-center justify-center text-sm text-neutral-300">
        <div className="p-4 text-center">
          <div className="mb-2">Video completed but URL not available</div>
          <div className="text-neutral-500">Please contact support if this persists.</div>
          <div className="text-xs text-neutral-500 mt-2">
            Task ID: {video.id}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="aspect-video bg-black mb-4 rounded-lg overflow-hidden">
      <video
        src={video.videoUrl}
        controls
        className="w-full h-full"
        poster={video.sourceImageUrl || undefined}
        onError={() =>
          console.error(`Cannot play video "${video.title}" - URL invalid or file missing`)
        }
      />
    </div>
  );
}
