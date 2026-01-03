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
  const isDeleteDisabled =
    video.status === "processing" || video.status === "queued";

  const handleClick = () => {
    if (video.status === "failed") return;

    if (video.status === "processing" || video.status === "queued") {
      alert(
        `Video is still ${video.status}. It will be available when completed.`
      );
      return;
    }

    if (video.status === "completed" && !video.url) {
      alert(`Cannot play video "${video.title}" - URL not found`);
      return;
    }

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
      showToast("Video is being created, please wait…", "success", 1000);

      setTimeout(() => {
        window.location.reload(); // MVP
      }, 1500);
    } catch {
      showToast("Create video failed", "error", 1500);
    } finally {
      setDeleting(false);
      setOpenDelete(false);
    }
  };

  return (
    <>
      <div
        className={`bg-neutral-900 rounded-lg overflow-hidden group cursor-pointer transition hover:scale-[1.03] ${
          video.status === "failed" ? "opacity-80 cursor-not-allowed" : ""
        }`}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="relative aspect-video bg-black">
          {video.status === "failed" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 text-red-500 text-sm p-2 text-center">
              <span>{video.errorMessage || "Video generation failed"}</span>
            </div>
          )}

          {video.status !== "failed" && (
            <>
              {!hovered && (
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover"
                />
              )}

              {hovered && video.status === "completed" && video.url && (
                <video
                  src={video.url}
                  muted
                  autoPlay
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />
              )}

              {(video.status === "processing" || video.status === "queued") && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-yellow-400 font-semibold">
                  {statusConfig.label}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-2">
          <div className="font-medium text-sm truncate">{video.title}</div>

          <div className="flex justify-between items-center mt-1 text-xs">
            <span className="text-neutral-400">
              {new Date(video.createdAt).toLocaleDateString()}
            </span>

            <span className={`font-semibold ${statusConfig?.className}`}>
              {statusConfig?.label}
            </span>
          </div>

          <div className="flex justify-end mt-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (isDeleteDisabled) {
                  alert("Cannot delete while video is processing");
                  return;
                }
                setOpenDelete(true);
              }}
              className={`text-xs underline ${
                isDeleteDisabled
                  ? "text-neutral-500 cursor-not-allowed"
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
