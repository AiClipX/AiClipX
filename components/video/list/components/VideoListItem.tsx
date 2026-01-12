import { useRouter } from "next/router";
import { useState } from "react";
import { Video, VIDEO_STATUS_CONFIG } from "../../types/videoTypes";
import { useVideoListContext } from "../hooks/VideoListContext";
import { deleteVideoTask } from "../../services/videoService";
import { ConfirmDeleteModal } from "../../../common/ConfirmDeleteModal";
import { NotificationModal } from "../../../common/NotificationModal";
import { showToast } from "../../../common/Toast";

interface Props {
  video: Video;
}

export function VideoListItem({ video }: Props) {
  const router = useRouter();
  const { status, sort, search } = useVideoListContext();

  const [hovered, setHovered] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const statusConfig = VIDEO_STATUS_CONFIG[video.status];

  const [notify, setNotify] = useState<{
    open: boolean;
    type: "success" | "error";
    title: string;
    message?: string;
  }>({
    open: false,
    type: "success",
    title: "",
  });

  const isDeleteDisabled = video.status === "processing" || video.status === "queued";

  const handleClick = () => {
    if (video.status === "failed") {
      // Still allow viewing failed videos to see error details
    }

    if (video.status === "processing" || video.status === "queued") {
      // Allow viewing to see progress
    }

    // Save current list state
    sessionStorage.setItem(
      "videoListState",
      JSON.stringify({ status, sort, search })
    );

    router.push(`/dashboard/videos/${video.id}`);
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteVideoTask(video.id);
      showToast("Video deleted successfully", "success", 1500);

      setTimeout(() => {
        window.location.reload(); // MVP - refresh to update list
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

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();

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

  // Get thumbnail - use sourceImageUrl or fallback
  const thumbnailUrl = video.sourceImageUrl || video.thumbnail || `https://picsum.photos/400/225?random=${video.id}`;

  return (
    <>
      <div
        className={`bg-neutral-900 rounded-lg overflow-hidden group cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
          video.status === "failed" ? "opacity-90" : ""
        }`}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="relative aspect-video bg-black">
          {/* Status overlay for processing/queued */}
          {(video.status === "processing" || video.status === "queued") && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-white z-10">
              <div className={`font-semibold ${statusConfig.className}`}>
                {statusConfig.label}
              </div>
              {video.status === "processing" && (
                <div className="text-sm mt-1">{video.progress}%</div>
              )}
            </div>
          )}

          {/* Error overlay for failed */}
          {video.status === "failed" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-red-400 text-sm p-4 text-center z-10">
              <div className="font-semibold mb-2">Failed</div>
              <div className="text-xs text-red-300 line-clamp-3">
                {video.errorMessage || "Video generation failed"}
              </div>
            </div>
          )}

          {/* Thumbnail/Video preview */}
          {!hovered && (
            <img
              src={thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to placeholder if image fails to load
                (e.target as HTMLImageElement).src = `https://picsum.photos/400/225?random=${video.id}`;
              }}
            />
          )}

          {/* Video preview on hover for completed videos */}
          {hovered && video.status === "completed" && video.videoUrl && (
            <video
              src={video.videoUrl}
              muted
              autoPlay
              loop
              playsInline
              className="w-full h-full object-cover"
              onError={() => {
                // Fallback to thumbnail if video fails
                setHovered(false);
              }}
            />
          )}

          {/* Show thumbnail on hover for non-completed videos */}
          {hovered && (video.status !== "completed" || !video.videoUrl) && (
            <img
              src={thumbnailUrl}
              alt={video.title}
              className="w-full h-full object-cover"
            />
          )}
        </div>

        <div className="p-3">
          <div className="font-medium text-sm text-white truncate mb-1">
            {video.title}
          </div>

          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-neutral-400">
              {new Date(video.createdAt).toLocaleDateString()}
            </span>
            <span className={`font-semibold ${statusConfig?.className}`}>
              {statusConfig?.label}
            </span>
          </div>

          <div className="flex justify-between items-center">
            {/* Download button for completed videos */}
            {video.status === "completed" && video.videoUrl && (
              <button
                onClick={handleDownload}
                className="text-xs underline text-blue-400 hover:text-blue-300 transition-colors"
              >
                Download
              </button>
            )}

            {/* Engine info */}
            <span className="text-xs text-neutral-500 capitalize">
              {video.engine}
            </span>

            {/* Delete button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isDeleteDisabled) {
                  showToast("Cannot delete while video is processing", "warning");
                  return;
                }
                setOpenDelete(true);
              }}
              className={`text-xs underline transition-colors ${
                isDeleteDisabled
                  ? "text-neutral-600 cursor-not-allowed"
                  : "text-red-400 hover:text-red-300"
              }`}
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      <ConfirmDeleteModal
        open={openDelete}
        loading={deleting}
        onCancel={() => setOpenDelete(false)}
        onConfirm={handleDelete}
      />
      
      <NotificationModal
        open={notify.open}
        type={notify.type}
        title={notify.title}
        message={notify.message}
        onClose={() => setNotify((n) => ({ ...n, open: false }))}
      />
    </>
  );
}
