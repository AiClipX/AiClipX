import { useRouter } from "next/router";
import { useState } from "react";

import { Video } from "../../types/videoTypes";
import { deleteVideoTask } from "../../services/videoService";
import { ConfirmDeleteModal } from "../../../common/ConfirmDeleteModal";
import { NotificationModal } from "../../../common/NotificationModal";
import { showToast } from "../../../common/Toast";

interface Props {
  video: Video;
}

export function VideoActions({ video }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const disabled = video.status === "processing" || video.status === "queued";
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

  const handleDelete = async () => {
    try {
      setLoading(true);
      await deleteVideoTask(video.id);

      showToast("Delete video successful", "success", 1500);

      setTimeout(() => {
        router.push("/dashboard/test-video-list");
      }, 1500);
    } catch {
      showToast("Delete video failed", "error", 1500);
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div className="flex gap-3">
      <button className="px-4 py-2 rounded border border-neutral-700 hover:bg-neutral-800">
        Edit
      </button>
      <button className="px-4 py-2 rounded border border-neutral-700 hover:bg-neutral-800">
        Regenerate
      </button>
      <button
        disabled={disabled}
        onClick={() => setOpen(true)}
        className="px-3 py-1 bg-red-600 rounded text-white disabled:opacity-50"
      >
        Delete
      </button>

      <ConfirmDeleteModal
        open={open}
        loading={loading}
        onCancel={() => setOpen(false)}
        onConfirm={handleDelete}
      />
      <NotificationModal
        open={notify.open}
        type={notify.type}
        title={notify.title}
        message={notify.message}
        onClose={() => setNotify((n) => ({ ...n, open: false }))}
      />
    </div>
  );
}
