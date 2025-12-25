import { useState } from "react";
import { useCreateVideo } from "../hooks/useCreateVideo";

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateVideoModal({ open, onClose, onCreated }: Props) {
  const { mutate, isPending } = useCreateVideo();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");

  if (!open) return null;

  const handleSubmit = () => {
    if (!title.trim()) {
      alert("Title is required");
      return;
    }

    mutate(
      { title, prompt },
      {
        onSuccess: () => {
          setTitle("");
          setPrompt("");
          onClose();
          onCreated?.();
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-neutral-900 rounded-lg p-4 w-full max-w-md text-white">
        <h2 className="text-lg font-semibold mb-3">Create new video</h2>

        <div className="flex flex-col gap-2">
          <input
            className="px-2 py-1 rounded text-black"
            placeholder="Video title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            className="px-2 py-1 rounded text-black"
            placeholder="Prompt (optional)"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <button
            className="px-3 py-1 bg-neutral-700 rounded"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>

          <button
            className="px-3 py-1 bg-blue-600 rounded"
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
