import React, { useState } from "react";
import { Video } from "./types/videoTypes";

const statusColorMap: Record<string, string> = {
  Draft: "text-red-500",
  Processing: "text-yellow-400",
  Completed: "text-green-500",
};

interface VideoListItemProps {
  video: Video;
}

export const VideoListItem: React.FC<VideoListItemProps> = ({ video }) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="bg-neutral-800 rounded overflow-hidden hover:scale-[1.03] transition relative">
      {!loaded && (
        <div className="absolute inset-0 bg-neutral-700 animate-pulse" />
      )}

      <img
        src={video.thumbnail}
        alt={video.title}
        className={`w-full h-36 object-cover transition-opacity duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setLoaded(true)}
      />

      <div className="p-2">
        <h3 className="text-sm font-medium truncate">{video.title}</h3>
        <p className="text-xs text-neutral-400">
          {new Date(video.createdAt).toLocaleDateString()}
        </p>
        <span
          className={`text-xs font-semibold ${statusColorMap[video.status]}`}
        >
          {video.status}
        </span>
      </div>
    </div>
  );
};
