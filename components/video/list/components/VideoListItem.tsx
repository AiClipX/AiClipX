import { useRouter } from "next/router";
import { useState } from "react";
import { Video, VIDEO_STATUS_CONFIG } from "../../types/videoTypes";
import { useVideoListContext } from "../hooks/VideoListContext";
import { deleteVideoTask } from "../../services/videoService";
import { ConfirmDeleteModal } from "../../../common/ConfirmDeleteModal";
import { NotificationModal } from "../../../common/NotificationModal";
import { showToast } from "../../../common/Toast";
import { useLanguage } from "../../../../contexts/LanguageContext";
import { EyeIcon, ArrowPathIcon, TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';

interface Props {
  video: Video;
  removeVideo: (id: string) => void;
}

export function VideoListItem({ video, removeVideo }: Props) {
  const router = useRouter();
  const { status, sort, search } = useVideoListContext();
  const { t } = useLanguage();

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
  const canRetry = video.status === "failed";

  const handleClick = () => {
    // Save current list state
    sessionStorage.setItem(
      "videoListState",
      JSON.stringify({ status, sort, search })
    );

    router.push(`/dashboard/videos/${video.id}`);
  };

  const handleViewDetail = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleClick();
  };

  const handleRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    // For now, show coming soon tooltip - backend support needed
    showToast(t('videoList.retryComingSoon'), "warning", 2000);
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteVideoTask(video.id);
      showToast(t('success.videoDeleted'), "success", 1500);

      // Optimistic update - remove from list immediately
      removeVideo(video.id);
      setOpenDelete(false);
    } catch (error: any) {
      console.error("Delete failed:", error);
      
      // Don't show error if it's 401 (already handled by redirect)
      if (error?.message?.includes("401")) {
        return;
      }
      
      const errorMsg = error?.message || t('error.deleteFailed');
      showToast(errorMsg, "error", 2000);
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();

    if (!video.videoUrl) {
      showToast(t('error.videoUrlNotAvailable'), "error");
      return;
    }

    try {
      showToast(t('success.downloadStarting'), "success", 1500);

      // Fetch video with proper error handling
      const response = await fetch(video.videoUrl, {
        method: 'GET',
        headers: {
          'Accept': 'video/mp4,video/*',
        },
      });

      if (!response.ok) {
        throw new Error(t('error.downloadFailed') + `: ${response.status}`);
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

      showToast(t('success.downloadStarted'), "success");
    } catch (error: any) {
      console.error("Download failed:", error);
      
      // Show specific error message
      if (error.message?.includes("Failed to fetch")) {
        showToast(t('error.downloadNetworkError'), "error", 3000);
      } else if (error.message?.includes("403")) {
        showToast(t('error.downloadAccessDenied'), "error", 3000);
      } else if (error.message?.includes("404")) {
        showToast(t('error.downloadNotFound'), "error", 3000);
      } else {
        showToast(t('error.downloadFailed') + `: ${error.message || t('error.unknown')}`, "error", 3000);
      }
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
                {t(`status.${video.status}`)}
              </div>
              {video.status === "processing" && typeof video.progress === 'number' && (
                <div className="text-sm mt-1">{Math.round(video.progress)}%</div>
              )}
            </div>
          )}

          {/* Error overlay for failed */}
          {video.status === "failed" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-red-400 text-sm p-4 text-center z-10">
              <div className="font-semibold mb-2">{t('status.failed')}</div>
              <div className="text-xs text-red-300 line-clamp-3">
                {video.errorMessage || t('error.videoGenerationFailed')}
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

          {/* Quick Actions Overlay */}
          {hovered && (
            <div className="absolute top-2 right-2 flex gap-1 z-20">
              <button
                onClick={handleViewDetail}
                className="p-1.5 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors"
                title={t('videoList.openDetail')}
              >
                <EyeIcon className="w-4 h-4" />
              </button>
              
              {canRetry && (
                <button
                  onClick={handleRetry}
                  className="p-1.5 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors"
                  title={t('videoList.retryComingSoon')}
                >
                  <ArrowPathIcon className="w-4 h-4" />
                </button>
              )}

              {video.status === "completed" && video.videoUrl && (
                <button
                  onClick={handleDownload}
                  className="p-1.5 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors"
                  title={t('action.download')}
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (isDeleteDisabled) {
                    showToast(t('error.cannotDeleteProcessing'), "warning");
                    return;
                  }
                  setOpenDelete(true);
                }}
                className={`p-1.5 bg-black/70 hover:bg-black/90 rounded-full transition-colors ${
                  isDeleteDisabled
                    ? "text-neutral-500 cursor-not-allowed"
                    : "text-red-400 hover:text-red-300"
                }`}
                title={isDeleteDisabled ? t('error.cannotDeleteProcessing') : t('action.delete')}
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className="p-3">
          <div className="font-medium text-sm text-white truncate mb-2">
            {video.title}
          </div>

          <div className="flex justify-between items-center text-xs mb-2">
            <span className="text-neutral-400">
              {new Date(video.createdAt).toLocaleDateString()}
            </span>
            <span className={`font-semibold ${statusConfig?.className}`}>
              {t(`status.${video.status}`)}
            </span>
          </div>

          <div className="flex justify-between items-center text-xs">
            <span className="text-neutral-500 capitalize">
              {t('videoList.engine')}: {video.engine}
            </span>
            <span className="text-neutral-600">
              ID: {video.id.slice(-6)}
            </span>
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

