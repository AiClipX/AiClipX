import { useRouter } from "next/router";
import { useState } from "react";

import { Video } from "../../types/videoTypes";
import { deleteVideoTask } from "../../services/videoService";
import { ConfirmDeleteModal } from "../../../common/ConfirmDeleteModal";
import { showToast } from "../../../common/Toast";

interface Props {
  video: Video;
  onRefresh?: () => void;
}

export function VideoActions({ video, onRefresh }: Props) {
  const router = useRouter();
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isDeleteDisabled = video.status === "processing" || video.status === "queued";

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteVideoTask(video.id);
      showToast("Video deleted successfully", "success", 1500);

      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (error: any) {
      console.error("Delete failed:", error);
      
      // Don't show error if it's 401 (already handled by redirect)
      if (error?.message?.includes("401")) {
        return;
      }
      
      const errorMsg = error?.message || "Delete failed";
      showToast(errorMsg, "error", 2000);
      setDeleting(false);
      setOpenDelete(false);
    }
  };

  const handleDownload = async () => {
    if (!video.videoUrl) {
      showToast("Video URL not available", "error");
      return;
    }

    try {
      showToast("Starting download...", "success", 1500);

      // Fetch video with proper error handling
      const response = await fetch(video.videoUrl, {
        method: 'GET',
        headers: {
          'Accept': 'video/mp4,video/*',
        },
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      // Get blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${video.title || "video"}-${video.id}.mp4`;
      
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 100);

      showToast("Download started successfully", "success");
    } catch (error: any) {
      console.error("Download failed:", error);
      
      // Show specific error message
      if (error.message?.includes("Failed to fetch")) {
        showToast("Download failed: Network error or CORS issue", "error", 3000);
      } else if (error.message?.includes("403")) {
        showToast("Download failed: Access denied", "error", 3000);
      } else if (error.message?.includes("404")) {
        showToast("Download failed: Video not found", "error", 3000);
      } else {
        showToast(`Download failed: ${error.message || "Unknown error"}`, "error", 3000);
      }
    }
  };

  const handleOpenInNewTab = () => {
    if (video.videoUrl) {
      window.open(video.videoUrl, "_blank");
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      {/* Download - only for completed videos */}
      {video.status === "completed" && video.videoUrl && (
        <>
          <button 
            onClick={handleDownload}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            Download
          </button>
          
          <button 
            onClick={handleOpenInNewTab}
            className="px-4 py-2 rounded border border-neutral-700 text-white hover:bg-neutral-800 transition-colors"
          >
            Open in New Tab
          </button>
        </>
      )}

      {/* Retry - for failed videos */}
      {video.status === "failed" && (
        <button 
          onClick={onRefresh}
          className="px-4 py-2 rounded border border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-white transition-colors"
        >
          Retry
        </button>
      )}

      {/* Delete */}
      <button
        disabled={isDeleteDisabled}
        onClick={() => {
          if (isDeleteDisabled) {
            showToast("Cannot delete while video is processing", "warning");
            return;
          }
          setOpenDelete(true);
        }}
        className={`px-4 py-2 rounded transition-colors ${
          isDeleteDisabled
            ? "border border-neutral-700 text-neutral-500 cursor-not-allowed"
            : "bg-red-600 text-white hover:bg-red-500"
        }`}
      >
        Delete
      </button>

      <ConfirmDeleteModal
        open={openDelete}
        loading={deleting}
        onCancel={() => setOpenDelete(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
