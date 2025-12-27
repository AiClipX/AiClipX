import { useRouter } from "next/router";
import { useState } from "react";
import { Video, VIDEO_STATUS_CONFIG } from "../../types/videoTypes";
import { useVideoListContext } from "../hooks/VideoListContext";

interface Props {
  video: Video;
}

export function VideoListItem({ video }: Props) {
  const router = useRouter();
  const { page, status, sort, search } = useVideoListContext();
  const [hovered, setHovered] = useState(false);
  const statusConfig = VIDEO_STATUS_CONFIG[video.status];

  const handleClick = () => {
    if (video.status === "Failed") return;

    if (video.status === "Processing" || video.status === "Pending") {
      alert(
        `Video is still ${video.status}. It will be available to play when completed.`
      );
      return;
    }

    if (video.status === "Completed" && !video.url) {
      alert(`Cannot play video "${video.title}" - URL not found`);
      return;
    }
    sessionStorage.setItem(
      "videoListState",
      JSON.stringify({ page, status, sort, search })
    );

    router.push(`/dashboard/videos/${video.id}`);
  };

  const handleViewDetails = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (video.status === "Failed") {
      alert(
        ` Video "${video.title}" has failed with: ${
          video.errorMessage || "Unknown error"
        }.`
      );
      return;
    }
    router.push(`/dashboard/videos/${video.id}`);
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    alert(`Retry logic for video "${video.title}" not implemented yet.`);
  };

  return (
    <div
      className={`bg-neutral-900 rounded-lg overflow-hidden group cursor-pointer transition hover:scale-[1.03] ${
        video.status === "Failed" ? "opacity-80 cursor-not-allowed" : ""
      }`}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative aspect-video bg-black">
        {video.status === "Failed" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 text-red-500 text-sm p-2 text-center">
            <span>{video.errorMessage || "Video generation failed"}</span>
            <div className="flex gap-2 mt-2">
              <button
                className="underline text-blue-400 cursor-pointer"
                onClick={handleRetry}
              >
                Retry
              </button>
              <button
                className="underline text-blue-400 cursor-pointer"
                onClick={handleViewDetails}
              >
                View Details
              </button>
            </div>
          </div>
        )}

        {video.status !== "Failed" && (
          <>
            {!hovered && (
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover"
              />
            )}

            {hovered && video.status === "Completed" && video.url && (
              <video
                src={video.url}
                muted
                autoPlay
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            )}

            {(video.status === "Processing" || video.status === "Pending") &&
              !hovered && (
                <div
                  className={`absolute inset-0 flex items-center justify-center text-lg font-semibold
          ${
            video.status === "Processing"
              ? "text-yellow-400 bg-black bg-opacity-50"
              : ""
          }
          ${
            video.status === "Pending"
              ? "text-gray-400 bg-black bg-opacity-40"
              : ""
          }
        `}
                >
                  {statusConfig.label}
                </div>
              )}
          </>
        )}
      </div>

      <div className="p-2">
        <div className="block font-medium text-sm truncate">{video.title}</div>
        <div className="flex justify-between mt-1 text-xs">
          <span className="text-neutral-400">
            {new Date(video.createdAt).toLocaleDateString()}
          </span>
          <span className={`text-xs font-semibold ${statusConfig.className}`}>
            {statusConfig.label}
          </span>
        </div>
      </div>
    </div>
  );
}
