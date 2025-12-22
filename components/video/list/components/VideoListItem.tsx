// components/video/list/components/VideoListItem.tsx
import { Video } from "../../types/videoTypes";
import { useRouter } from "next/router";
import { useVideoListContext } from "../hooks/VideoListContext";
import { useState } from "react";

interface Props {
  video: Video;
}

export function VideoListItem({ video }: Props) {
  const router = useRouter();
  const { page, sort, status, search } = useVideoListContext();
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    if (video.status === "Failed") return; // không vào detail nếu failed

    // Save current list state to sessionStorage
    const state = { page, status, sort, search };
    sessionStorage.setItem("videoListState", JSON.stringify(state));

    router.push(`/dashboard/videos/${video.id}`);
  };

  return (
    <div
      className="bg-neutral-900 rounded-lg overflow-hidden group cursor-pointer transition hover:scale-[1.03]"
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative aspect-video bg-black">
        {video.status === "Failed" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 text-red-500 text-sm p-2 text-center">
            <span>{video.errorMessage || "Video generation failed"}</span>
            <div className="flex gap-2 mt-2">
              <button className="underline text-blue-400 cursor-pointer">
                Retry
              </button>
              <button
                className="underline text-blue-400 cursor-pointer"
                onClick={() => router.push(`/dashboard/videos/${video.id}`)}
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
            {hovered && video.status === "Completed" && (
              <video
                src={video.url || ""}
                muted
                autoPlay
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            )}

            {(video.status === "Draft" || video.status === "Processing") && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center text-white text-lg font-semibold">
                {video.status}
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
          <span
            className={`text-xs font-semibold ${
              video.status === "Draft"
                ? "text-gray-600"
                : video.status === "Processing"
                ? "text-yellow-400"
                : video.status === "Completed"
                ? "text-green-400"
                : "text-red-500"
            }`}
          >
            {video.status}
          </span>
        </div>
      </div>
    </div>
  );
}
