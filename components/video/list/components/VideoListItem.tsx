import { Video } from "../../types/videoTypes";
import { useRouter } from "next/router";
import { useVideoListContext } from "../hooks/VideoListContext";
import { useState } from "react";

interface Props {
  video: Video;
}

export function VideoListItem({ video }: Props) {
  const router = useRouter();
  const { page, status, sort, search } = useVideoListContext();
  const [hovered, setHovered] = useState(false);

  const handleClick = () => {
    if (video.status === "Failed") return; // không cho click
    if (video.status === "Processing") {
      alert(
        "Video is still processing. It will be available to play when completed."
      );
      return;
    }

    // Completed
    sessionStorage.setItem(
      "videoListState",
      JSON.stringify({ page, status, sort, search })
    );

    router.push(`/dashboard/videos/${video.id}`);
  };

  return (
    <div
      className={`bg-neutral-900 rounded-lg overflow-hidden group cursor-pointer transition hover:scale-[1.03] ${
        video.status === "Failed" ? "opacity-50 cursor-not-allowed" : ""
      }`}
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative aspect-video bg-black">
        {video.status === "Failed" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 text-red-500 text-sm p-2 text-center">
            <span>{video.errorMessage || "Video generation failed"}</span>
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
