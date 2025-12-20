import React, { useState } from "react";
import { Video } from "./types/videoTypes";

const statusColorMap: Record<string, string> = {
  Draft: "text-red-500",
  Processing: "text-yellow-400",
  Completed: "text-green-500",
};

interface VideoListItemProps {
  video: Video;
  onEdit: (video: Video) => void;
  onDelete: (video: Video) => void;
}

export const VideoListItem: React.FC<VideoListItemProps> = ({
  video,
  onEdit,
  onDelete,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(video.title);

  const handleEditSubmit = () => {
    if (editValue.trim()) {
      onEdit({ ...video, title: editValue });
      setEditing(false);
    }
  };

  return (
    <div className="bg-neutral-800 rounded overflow-hidden hover:scale-[1.03] transition relative group">
      {/* Loading skeleton */}
      {!loaded && (
        <div className="absolute inset-0 bg-neutral-700 animate-pulse" />
      )}

      {/* Thumbnail */}
      <img
        src={video.thumbnail}
        alt={video.title}
        className={`w-full h-36 object-cover transition-opacity duration-500 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        onLoad={() => setLoaded(true)}
      />

      {/* 3-dot menu */}
      <div className="absolute top-2 right-2">
        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="p-1 rounded hover:bg-neutral-700"
        >
          ⋮
        </button>

        {menuOpen && (
          <div className="absolute right-0 mt-2 w-24 bg-neutral-900 rounded shadow-lg z-10">
            {/* <button
              className="w-full text-left px-3 py-1 hover:bg-neutral-700"
              onClick={() => setEditing(true)} // 🔹 bật edit mode
            >
              Edit
            </button> */}
            <button
              className="w-full text-left px-3 py-1 hover:bg-red-600"
              onClick={() => onDelete(video)}
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {/* Inline Edit Input */}
      {editing && (
        <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-20">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="px-3 py-2 rounded w-48"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleEditSubmit();
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <button
              onClick={handleEditSubmit}
              className="bg-blue-600 px-3 py-2 rounded hover:bg-blue-700"
            >
              Save
            </button>
            <button
              onClick={() => setEditing(false)}
              className="bg-gray-600 px-3 py-2 rounded hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Info */}
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
