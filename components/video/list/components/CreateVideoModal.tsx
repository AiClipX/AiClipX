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

type DebugInfo = {
  endpoint: string;
  method: string;
  status: number | null;
  requestId: string | null;
  idempotencyKey: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  timestamp: string;
};

export function CreateVideoModal({ open, onClose, onCreated }: Props) {
  const router = useRouter();
  const { mutate, isPending } = useCreateVideo();
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [engine, setEngine] = useState("mock");
  const [durationSec, setDurationSec] = useState(5);
  const [ratio, setRatio] = useState("16:9");

  // Debug panel state
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

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

    // Generate idempotency key (already in videoService, but we track it here for debug)
    const idempotencyKey = `create_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const apiBase = process.env.NEXT_PUBLIC_API_VIDEO || "";
    const endpoint = `${apiBase}/api/video-tasks`;

    mutate(payload, {
      onSuccess: (newVideo: Video) => {
        showToast(`Video task created: ${newVideo.id}`, "success", 2000);
        onCreated?.(newVideo);

        // Reset form
        setTitle("");
        setPrompt("");
        setEngine("mock");
        setDurationSec(5);
        setRatio("16:9");
        
        // Clear debug panel on success
        setDebugInfo(null);
        setShowDebug(false);

        // Navigate to detail page after a short delay
        setTimeout(() => {
          onClose();
          router.push(`/dashboard/videos/${newVideo.id}`);
        }, 1000);
      },
      onError: (error: any) => {
        // Extract error details
        const requestId = error?.requestId || 
                         error?.response?.data?.requestId || 
                         error?.response?.headers?.["x-request-id"] ||
                         "unknown";
        
        const status = error?.response?.status || error?.status || null;
        const errorCode = error?.response?.data?.code || error?.code || null;
        const errorMessage = error?.message || error?.response?.data?.message || "Unknown error";

        // Show debug info only on error
        setDebugInfo({
          endpoint,
          method: "POST",
          status,
          requestId,
          idempotencyKey,
          errorCode,
          errorMessage,
          timestamp: new Date().toISOString(),
        });
        setShowDebug(true);

        // Show user-friendly error
        showToast(
          `Failed to create video\n${errorMessage}${requestId !== "unknown" ? `\nRequest ID: ${requestId}` : ""}`,
          "error",
          5000
        );
      },
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-lg p-6 w-full max-w-2xl text-white max-h-[90vh] overflow-y-auto">
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

          {/* Request Debug Panel */}
          {debugInfo && (
            <div className="border border-neutral-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="w-full px-4 py-2 bg-neutral-800 hover:bg-neutral-750 flex items-center justify-between text-sm font-medium transition-colors"
              >
                <span>🔍 Request Debug</span>
                <span>{showDebug ? "▼" : "▶"}</span>
              </button>
              
              {showDebug && (
                <div className="p-4 bg-neutral-850 space-y-2 text-xs font-mono">
                  <div className="grid grid-cols-[120px_1fr] gap-2">
                    <span className="text-neutral-400">Endpoint:</span>
                    <span className="text-blue-400 break-all">{debugInfo.endpoint}</span>
                    
                    <span className="text-neutral-400">Method:</span>
                    <span className="text-white">{debugInfo.method}</span>
                    
                    <span className="text-neutral-400">Status:</span>
                    <span className={debugInfo.status === 201 ? "text-green-400" : debugInfo.status ? "text-red-400" : "text-yellow-400"}>
                      {debugInfo.status || "Pending..."}
                    </span>
                    
                    <span className="text-neutral-400">Request ID:</span>
                    <span className="text-white">{debugInfo.requestId || "N/A"}</span>
                    
                    <span className="text-neutral-400">Idempotency Key:</span>
                    <span className="text-white break-all">{debugInfo.idempotencyKey}</span>
                    
                    <span className="text-neutral-400">Timestamp:</span>
                    <span className="text-white">{new Date(debugInfo.timestamp).toLocaleString()}</span>
                    
                    {debugInfo.errorCode && (
                      <>
                        <span className="text-neutral-400">Error Code:</span>
                        <span className="text-red-400">{debugInfo.errorCode}</span>
                      </>
                    )}
                    
                    {debugInfo.errorMessage && (
                      <>
                        <span className="text-neutral-400">Error Message:</span>
                        <span className="text-red-400">{debugInfo.errorMessage}</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
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
