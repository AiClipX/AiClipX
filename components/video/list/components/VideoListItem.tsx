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
    // Save current list state to sessionStorage
    const state = {
      page,
      status,
      sort,
      search,
    };
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
        {!hovered && (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        )}
        {hovered && (
          <video
            src={video.url}
            muted
            autoPlay
            loop
            playsInline
            className="w-full h-full object-cover"
          />
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
                ? "text-red-400"
                : video.status === "Processing"
                ? "text-yellow-400"
                : "text-green-400"
            }`}
          >
            {video.status}
          </span>
        </div>
      </div>
    </div>
  );
}
