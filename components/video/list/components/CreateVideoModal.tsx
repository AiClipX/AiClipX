import { useState } from "react";
import { showToast } from "../../../common/Toast";
import { useCreateVideo } from "../hooks/useCreateVideo";
import { Video } from "../../types/videoTypes";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (newVideo: Video) => void;
};

export function CreateVideoModal({ open, onClose, onCreated }: Props) {
  const { mutate, isPending } = useCreateVideo();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");

  if (!open) return null;

  const handleSubmit = () => {
    // toast ngay khi submit
    showToast("Video is being created, please wait…", "success", 1500);

    mutate(
      { title: title || undefined, prompt: prompt || undefined },
      {
        onSuccess: (newVideo: Video) => {
          onCreated?.(newVideo);

          // reset form
          setTitle("");
          setPrompt("");

          onClose();
        },
        onError: () => {
          showToast("Create video failed", "error", 1500);
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-neutral-900 rounded-lg p-4 w-full max-w-md text-white">
        <h2 className="text-lg font-semibold mb-3">Create new video</h2>

        <input
          className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm w-full mb-2"
          placeholder="Video title (optional)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={isPending}
        />

        <textarea
          className="px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm w-full"
          rows={4}
          placeholder="Prompt (optional)"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isPending}
        />

        <div className="flex justify-end gap-2 mt-4">
          <button
            className="px-3 py-1 bg-neutral-700 rounded"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>

          <button
            className="px-3 py-1 bg-blue-600 rounded disabled:opacity-50"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? "Creating..." : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
