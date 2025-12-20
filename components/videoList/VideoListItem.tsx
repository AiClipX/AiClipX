import React, { useState } from "react";
import { Video } from "./types/videoTypes";
import { VideoModal } from "./VideoModal";

const statusColorMap: Record<string, string> = {
  Draft: "text-red-500",
  Processing: "text-yellow-400",
  Completed: "text-green-500",
};

interface Props {
  video: Video;
}

export const VideoListItem: React.FC<Props> = ({ video }) => {
  const [hover, setHover] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [openModal, setOpenModal] = useState(false);

  return (
    <>
      <div
        className="bg-neutral-800 rounded overflow-hidden relative group cursor-pointer"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {/* Loading skeleton */}
        {!loaded && (
          <div className="absolute inset-0 bg-neutral-700 animate-pulse flex items-center justify-center text-white">
            Loading...
          </div>
        )}

        {/* Hover preview video */}
        {hover ? (
          <video
            src={video.url}
            className="w-full h-36 object-cover"
            autoPlay
            muted
            loop
            playsInline
            onLoadedData={() => setLoaded(true)}
          />
        ) : (
          <img
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-36 object-cover"
            onLoad={() => setLoaded(true)}
          />
        )}

        {/* Play overlay button */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // prevent triggering parent click
            setOpenModal(true);
          }}
          className="absolute inset-0 flex items-center justify-center text-white text-3xl bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition"
        >
          ▶
        </button>

        {/* Video info */}
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

      {/* Modal */}
      {openModal && (
        <VideoModal video={video} onClose={() => setOpenModal(false)} />
      )}
    </>
  );
};
