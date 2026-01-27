import { useRouter } from "next/router";
import { useState } from "react";

import { Video } from "../../types/videoTypes";
import { deleteVideoTask } from "../../services/videoService";
import { ConfirmDeleteModal } from "../../../common/ConfirmDeleteModal";
import { showToast } from "../../../common/Toast";
import { useCapabilityCheck } from "../../../common/CapabilityGuard";
import { DownloadDisabledBanner, CancelDisabledBanner } from "../../../common/CapabilityBanner";
import { useLanguage } from "../../../../contexts/LanguageContext";
import { handleError } from "../../../../lib/globalErrorHandler";

interface Props {
  video: Video;
  onRefresh?: () => void;
}

export function VideoActions({ video, onRefresh }: Props) {
  const router = useRouter();
  const [openDelete, setOpenDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { canDownloadVideo, canCancelAction } = useCapabilityCheck();
  const { t } = useLanguage();

  const isDeleteDisabled = video.status === "processing" || video.status === "queued";

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteVideoTask(video.id);
      showToast(t('success.videoDeleted'), "success", 1500);

      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (error: any) {
      console.error("Delete failed:", error);
      
      // Use global error handler
      const errorInfo = handleError(error, 'VideoActions.delete');
      
      // Don't show error if it's 401 (already handled by redirect)
      if (error?.response?.status === 401) {
        return;
      }
      
      showToast(errorInfo.message, "error", 2000);
      setDeleting(false);
      setOpenDelete(false);
    }
  };

  const handleDownload = async () => {
    if (!video.videoUrl) {
      showToast(t('error.videoUrlNotAvailable'), "error");
      return;
    }

    if (!canDownloadVideo) {
      showToast("Download feature is currently disabled", "warning");
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

      showToast(t('success.downloadStarted'), "success");
    } catch (error: any) {
      console.error("Download failed:", error);
      
      // Use global error handler for consistent error messages
      const errorInfo = handleError(error, 'VideoActions.download');
      showToast(errorInfo.message, "error", 3000);
    }
  };

  const handleOpenInNewTab = () => {
    if (video.videoUrl) {
      window.open(video.videoUrl, "_blank");
    }
  };

  const copyVideoUrl = async () => {
    if (!video.videoUrl) {
      showToast(t('error.videoUrlNotAvailable'), "error");
      return;
    }

    try {
      await navigator.clipboard.writeText(video.videoUrl);
      showToast(t('success.copied'), "success", 1500);
    } catch (error) {
      console.error("Copy failed:", error);
      showToast("Failed to copy URL", "error");
    }
  };

  return (
    <div className="space-y-4">
      {/* Capability Banners */}
      {video.status === "completed" && video.videoUrl && !canDownloadVideo && (
        <DownloadDisabledBanner />
      )}
      
      {!canCancelAction && (isDeleteDisabled || video.status === "processing") && (
        <CancelDisabledBanner />
      )}

      <div className="flex flex-wrap gap-3">
        {/* Download - only for completed videos and if capability enabled */}
        {video.status === "completed" && video.videoUrl && canDownloadVideo && (
          <button 
            onClick={handleDownload}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            {t('action.download')}
          </button>
        )}

        {/* Copy URL - fallback when download is disabled */}
        {video.status === "completed" && video.videoUrl && !canDownloadVideo && (
          <button 
            onClick={copyVideoUrl}
            className="px-4 py-2 rounded bg-gray-600 text-white hover:bg-gray-500 transition-colors"
          >
            {t('action.copy')} URL
          </button>
        )}
        
        {/* Open in New Tab */}
        {video.status === "completed" && video.videoUrl && (
          <button 
            onClick={handleOpenInNewTab}
            className="px-4 py-2 rounded border border-neutral-700 text-white hover:bg-neutral-800 transition-colors"
          >
            {t('detail.openNewTab')}
          </button>
        )}

        {/* Retry - for failed videos */}
        {video.status === "failed" && (
          <button 
            onClick={onRefresh}
            className="px-4 py-2 rounded border border-yellow-600 text-yellow-400 hover:bg-yellow-600 hover:text-white transition-colors"
          >
            {t('action.retry')}
          </button>
        )}

        {/* Delete - only if cancel actions are enabled */}
        {canCancelAction && (
          <button
            disabled={isDeleteDisabled}
            onClick={() => {
              if (isDeleteDisabled) {
                showToast(t('error.cannotDeleteProcessing'), "warning");
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
            {t('action.delete')}
          </button>
        )}

        <ConfirmDeleteModal
          open={openDelete}
          loading={deleting}
          onCancel={() => setOpenDelete(false)}
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
