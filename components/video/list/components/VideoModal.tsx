import { Video } from "../../types/videoTypes";
import React from "react";
interface VideoModalProps {
  video: Video;
  onClose: () => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({ video, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70">
      <div className="relative w-full max-w-3xl">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-white text-2xl z-10"
        >
          ✕
        </button>
        <video
          key={video.id}
          src={video.url}
          controls
          autoPlay
          className="w-full rounded shadow-lg"
        />
      </div>
    </div>
  );
};
