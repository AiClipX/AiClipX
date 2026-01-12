import { useRouter } from "next/router";
import { useState } from "react";

import { Video } from "../../types/videoTypes";
import { deleteVideoTask } from "../../services/videoService";
import { ConfirmDeleteModal } from "../../../common/ConfirmDeleteModal";
import { showToast } from "../../../common/Toast";

interface Props {
  video: Video;
}

export function VideoActions({ video }: Props) {
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
      const errorMsg = error?.response?.data?.message || "Delete failed";
      showToast(errorMsg, "error", 2000);
    } finally {
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
      showToast("Preparing download…", "success", 2000);

      const res = await fetch(video.videoUrl);
      if (!res.ok) throw new Error("Download failed");

      const blob = await res.blob();

      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${video.title || "video"}-${video.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(a.href);
      showToast("Download started", "success");
    } catch (error) {
      console.error("Download failed:", error);
      showToast("Download failed", "error");
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

      {/* Retry - only for failed videos */}
      {video.status === "failed" && (
        <button className="px-4 py-2 rounded border border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-white transition-colors">
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
