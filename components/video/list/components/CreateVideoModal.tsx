import { useState } from "react";
import { useCreateVideo } from "../hooks/useCreateVideo";
import { NotificationModal } from "../../../common/NotificationModal";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateVideoModal({ open, onClose, onCreated }: Props) {
  const { mutate, isPending } = useCreateVideo();

  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");

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

  if (!open) return null;

  const handleSubmit = () => {
    if (isPending) return;

    mutate(
      {
        title: title || undefined,
        prompt: prompt || undefined,
      },
      {
        onSuccess: () => {
          setNotify({
            open: true,
            type: "success",
            title: "Video created",
            message: "Your video task has been created successfully.",
          });

          onCreated?.();
        },
        onError: (error: any) => {
          setNotify({
            open: true,
            type: "error",
            title: "Create failed",
            message:
              error?.response?.data?.message ||
              "Failed to create video. Please try again.",
          });
        },
      }
    );
  };

  const handleCloseAll = () => {
    setTitle("");
    setPrompt("");
    setNotify({ ...notify, open: false });
    onClose();
  };

  return (
    <>
      {/* Create modal */}
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-neutral-900 rounded-lg p-4 w-full max-w-md text-white">
          <h2 className="text-lg font-semibold mb-3">Create new video</h2>

          <div className="flex flex-col gap-2">
            <input
              className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm"
              placeholder="Video title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending}
            />

            <textarea
              className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm resize-none"
              rows={4}
              placeholder="Prompt / description (optional)"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isPending}
            />
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button
              className="px-3 py-1 bg-neutral-700 rounded hover:bg-neutral-600 transition"
              onClick={onClose}
              disabled={isPending}
            >
              Cancel
            </button>

            <button
              className="px-3 py-1 bg-blue-600 rounded hover:bg-blue-500 transition disabled:opacity-50"
              onClick={handleSubmit}
              disabled={isPending}
            >
              {isPending ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      </div>

      {/* Notification modal */}
      {notify.open && (
        <NotificationModal
          open={notify.open}
          type={notify.type}
          title={notify.title}
          message={notify.message}
          onClose={handleCloseAll}
        />
      )}
    </>
  );
}
