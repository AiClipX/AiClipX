import { useState } from "react";
import { useRouter } from "next/router";
import { showToast } from "../../../common/Toast";
import { useCreateVideo } from "../hooks/useCreateVideo";
import { Video } from "../../types/videoTypes";

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated?: (newVideo: Video) => void;
};

export function CreateVideoModal({ open, onClose, onCreated }: Props) {
  const router = useRouter();
  const { mutate, isPending } = useCreateVideo();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [engine, setEngine] = useState("mock"); // Changed to "mock" - runway requires sourceImageUrl
  const [durationSec, setDurationSec] = useState(5);
  const [ratio, setRatio] = useState("16:9");

  const handleSubmit = () => {
    if (!title.trim() || !prompt.trim()) {
      showToast("Title and prompt are required.", "error", 1500);
      return;
    }

    // Match backend format exactly
    const payload: any = {
      title: title.trim(),
      prompt: prompt.trim(),
      engine,
      params: {
        durationSec: Number(durationSec),
        ratio,
      },
    };

    console.log("=== SUBMITTING PAYLOAD ===");
    console.log("Payload:", payload);
    console.log("JSON:", JSON.stringify(payload, null, 2));

    mutate(payload, {
      onSuccess: (newVideo: Video) => {
        showToast(`Video task created: ${newVideo.id}`, "success", 2000);
        onCreated?.(newVideo);

        // Reset form
        setTitle("");
        setPrompt("");
        setEngine("mock"); // Changed to "mock"
        setDurationSec(5);
        setRatio("16:9");

        onClose();
        
        // Navigate to detail page immediately
        router.push(`/dashboard/videos/${newVideo.id}`);
      },
      onError: (error: any) => {
        console.error("=== CREATE VIDEO ERROR ===");
        console.error("Full error:", error);
        console.error("Response status:", error?.response?.status);
        console.error("Response headers:", error?.response?.headers);
        console.error("Response data:", error?.response?.data);
        
        // Log requestId if available
        const requestId = error?.response?.data?.requestId || 
                         error?.response?.headers?.["x-request-id"];
        if (requestId) {
          console.error("X-Request-Id:", requestId);
        }
        
        // Parse error message from API spec format
        let errorMsg = "Create video failed. Please try again.";
        if (error?.response?.data) {
          const errorData = error.response.data;
          if (errorData.message) {
            errorMsg = errorData.message;
          }
          if (errorData.code) {
            errorMsg = `${errorData.code}: ${errorMsg}`;
          }
          if (errorData.details) {
            console.error("Error details:", errorData.details);
          }
        }
        
        showToast(errorMsg, "error", 4000);
      },
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-neutral-900 rounded-lg p-6 w-full max-w-md text-white">
        <h2 className="text-xl font-semibold mb-4">Create Video Task</h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm focus:border-blue-500 focus:outline-none"
              placeholder="Enter video title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium mb-1">Prompt *</label>
            <textarea
              className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm focus:border-blue-500 focus:outline-none"
              rows={3}
              placeholder="Describe the video you want to create"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isPending}
            />
          </div>

          {/* Engine */}
          <div>
            <label className="block text-sm font-medium mb-1">Engine</label>
            <select
              className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm focus:border-blue-500 focus:outline-none"
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              disabled={isPending}
            >
              <option value="runway">Runway</option>
              <option value="mock">Mock (for testing)</option>
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium mb-1">Duration (seconds)</label>
            <input
              type="number"
              min="1"
              max="30"
              className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm focus:border-blue-500 focus:outline-none"
              value={durationSec}
              onChange={(e) => setDurationSec(Number(e.target.value))}
              disabled={isPending}
            />
          </div>

          {/* Ratio */}
          <div>
            <label className="block text-sm font-medium mb-1">Aspect Ratio</label>
            <select
              className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm focus:border-blue-500 focus:outline-none"
              value={ratio}
              onChange={(e) => setRatio(e.target.value)}
              disabled={isPending}
            >
              <option value="16:9">16:9 (Landscape)</option>
              <option value="9:16">9:16 (Portrait)</option>
              <option value="1:1">1:1 (Square)</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            className="px-4 py-2 bg-neutral-700 rounded hover:bg-neutral-600 transition-colors"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </button>

          <button
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSubmit}
            disabled={isPending || !title.trim() || !prompt.trim()}
          >
            {isPending ? "Creating..." : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}
