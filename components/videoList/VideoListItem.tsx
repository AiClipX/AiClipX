import React from "react";
import { Video } from "./types/videoTypes";
interface Props {
  video: Video;
}

export const VideoListItem: React.FC<Props> = ({ video }) => {
  return (
    <div className="bg-neutral-900 rounded-lg overflow-hidden hover:scale-[1.03] transition">
      <div className="relative aspect-video">
        <img
          src={video.thumbnail}
          alt={video.title}
          className="w-full h-full object-cover"
        />

        <span className="absolute top-2 left-2 bg-black/70 text-xs px-2 py-1 rounded">
          {video.status}
        </span>
      </div>

      <div className="p-3">
        <h3 className="text-sm font-medium line-clamp-2">{video.title}</h3>

        <p className="text-xs text-gray-400 mt-1">
          {new Date(video.createdAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};
