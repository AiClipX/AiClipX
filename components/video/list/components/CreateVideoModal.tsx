import { useState } from "react";
import { useRouter } from "next/router";
import { showToast } from "../../../common/Toast";
import { useCreateVideo } from "../hooks/useCreateVideo";
import { Video } from "../../types/videoTypes";
import { useAuth } from "../../../../contexts/AuthContext";

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
  headers: Record<string, string>;
};

type ValidationErrors = {
  title?: string;
  prompt?: string;
  params?: string;
};

export function CreateVideoModal({ open, onClose, onCreated }: Props) {
  const router = useRouter();
  const { mutate, isPending } = useCreateVideo();
  const { token } = useAuth();
  
  // Form fields
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [engine, setEngine] = useState("mock");
  const [paramsJson, setParamsJson] = useState('{\n  "durationSec": 5,\n  "ratio": "16:9"\n}');

  // Validation state
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isValidatingParams, setIsValidatingParams] = useState(false);

  // Debug panel state
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Title validation
    if (!title.trim()) {
      errors.title = "Title is required";
    }

    // Prompt validation
    if (!prompt.trim()) {
      errors.prompt = "Prompt is required";
    }

    // JSON params validation
    if (paramsJson.trim()) {
      try {
        JSON.parse(paramsJson);
      } catch (e) {
        errors.params = "Invalid JSON format";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Real-time JSON validation
  const handleParamsChange = (value: string) => {
    setParamsJson(value);
    setIsValidatingParams(true);
    
    // Debounced validation
    setTimeout(() => {
      if (value.trim()) {
        try {
          JSON.parse(value);
          setValidationErrors(prev => ({ ...prev, params: undefined }));
        } catch (e) {
          setValidationErrors(prev => ({ ...prev, params: "Invalid JSON format" }));
        }
      } else {
        setValidationErrors(prev => ({ ...prev, params: undefined }));
      }
      setIsValidatingParams(false);
    }, 300);
  };

  const handleSubmit = () => {
    // Client-side validation
    if (!validateForm()) {
      showToast("Please fix the form errors before submitting.", "error", 2000);
      return;
    }

    // Parse params
    let params = {};
    if (paramsJson.trim()) {
      try {
        params = JSON.parse(paramsJson);
      } catch (e) {
        showToast("Invalid JSON in params field.", "error", 2000);
        return;
      }
    }

    // Create payload
    const payload: any = {
      title: title.trim(),
      prompt: prompt.trim(),
      engine,
      params,
    };

    // Generate idempotency key for tracking
    const idempotencyKey = `create_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const endpoint = "/api/video-tasks";

    // Prepare debug info with masked token
    const maskedToken = token ? `${token.substring(0, 8)}...${token.substring(token.length - 4)}` : "***MASKED***";
    const headers = {
      "Authorization": `Bearer ${maskedToken}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
      "X-Request-Id": "auto-generated",
    };

    mutate({ payload, idempotencyKey }, {
      onSuccess: (newVideo: Video) => {
        showToast(`Video task created: ${newVideo.id}`, "success", 2000);
        onCreated?.(newVideo);

        // Reset form
        setTitle("");
        setPrompt("");
        setEngine("mock");
        setParamsJson('{\n  "durationSec": 5,\n  "ratio": "16:9"\n}');
        setValidationErrors({});
        
        // Show success debug info
        setDebugInfo({
          endpoint,
          method: "POST",
          status: 201,
          requestId: "success",
          idempotencyKey,
          errorCode: null,
          errorMessage: null,
          timestamp: new Date().toISOString(),
          headers,
        });
        setShowDebug(true);

        // Navigate to detail page after a short delay
        setTimeout(() => {
          onClose();
          router.push(`/dashboard/videos/${newVideo.id}`);
        }, 1500);
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

        // Show debug info on error
        setDebugInfo({
          endpoint,
          method: "POST",
          status,
          requestId,
          idempotencyKey,
          errorCode,
          errorMessage,
          timestamp: new Date().toISOString(),
          headers,
        });
        setShowDebug(true);

        // Show user-friendly error
        showToast(
          `Failed to create video: ${errorMessage}${requestId !== "unknown" ? ` (ID: ${requestId})` : ""}`,
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
            <label className="block text-sm font-medium mb-1">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              className={`w-full px-3 py-2 rounded bg-neutral-800 border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.title 
                  ? 'border-red-500 bg-red-900/20' 
                  : 'border-neutral-700'
              }`}
              placeholder="Enter video title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (validationErrors.title) {
                  setValidationErrors(prev => ({ ...prev, title: undefined }));
                }
              }}
              disabled={isPending}
            />
            {validationErrors.title && (
              <div className="flex items-center gap-1 mt-1 text-red-400 text-sm">
                <span>⚠</span>
                <span>{validationErrors.title}</span>
              </div>
            )}
          </div>

          {/* Prompt */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Prompt <span className="text-red-400">*</span>
            </label>
            <textarea
              className={`w-full px-3 py-2 rounded bg-neutral-800 border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.prompt 
                  ? 'border-red-500 bg-red-900/20' 
                  : 'border-neutral-700'
              }`}
              rows={3}
              placeholder="Describe the video you want to create"
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                if (validationErrors.prompt) {
                  setValidationErrors(prev => ({ ...prev, prompt: undefined }));
                }
              }}
              disabled={isPending}
            />
            {validationErrors.prompt && (
              <div className="flex items-center gap-1 mt-1 text-red-400 text-sm">
                <span>⚠</span>
                <span>{validationErrors.prompt}</span>
              </div>
            )}
          </div>

          {/* Engine */}
          <div>
            <label className="block text-sm font-medium mb-1">Engine</label>
            <select
              className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              disabled={isPending}
            >
              <option value="mock">Mock (for testing)</option>
              <option value="runway">Runway</option>
            </select>
          </div>

          {/* Params JSON */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Parameters (JSON) <span className="text-neutral-400">- optional</span>
            </label>
            <textarea
              className={`w-full px-3 py-2 rounded bg-neutral-800 border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.params 
                  ? 'border-red-500 bg-red-900/20' 
                  : 'border-neutral-700'
              }`}
              rows={4}
              placeholder='{\n  "durationSec": 5,\n  "ratio": "16:9"\n}'
              value={paramsJson}
              onChange={(e) => handleParamsChange(e.target.value)}
              disabled={isPending}
            />
            {validationErrors.params && (
              <div className="flex items-center gap-1 mt-1 text-red-400 text-sm">
                <span>⚠</span>
                <span>{validationErrors.params}</span>
              </div>
            )}
            {isValidatingParams && (
              <div className="mt-1 text-blue-400 text-sm">Validating JSON...</div>
            )}
          </div>

          {/* Request Debug Panel */}
          {debugInfo && (
            <div className="border border-neutral-600 rounded-lg overflow-hidden bg-neutral-800/50">
              <button
                onClick={() => setShowDebug(!showDebug)}
                className="w-full px-4 py-3 bg-neutral-800 hover:bg-neutral-700 flex items-center justify-between text-sm font-medium transition-colors"
              >
                <span className="flex items-center gap-2">
                  🔍 Request Debug Panel
                  {debugInfo.status && (
                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                      debugInfo.status === 201 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                    }`}>
                      {debugInfo.status}
                    </span>
                  )}
                </span>
                <span>{showDebug ? "▼" : "▶"}</span>
              </button>
              
              {showDebug && (
                <div className="p-4 bg-neutral-850 space-y-3 text-xs">
                  <div className="grid grid-cols-[120px_1fr] gap-2 font-mono">
                    <span className="text-neutral-400 font-semibold">Endpoint:</span>
                    <span className="text-blue-400 break-all">{debugInfo.endpoint}</span>
                    
                    <span className="text-neutral-400 font-semibold">Method:</span>
                    <span className="text-white">{debugInfo.method}</span>
                    
                    <span className="text-neutral-400 font-semibold">Status:</span>
                    <span className={debugInfo.status === 201 ? "text-green-400" : debugInfo.status ? "text-red-400" : "text-yellow-400"}>
                      {debugInfo.status || "Pending..."}
                    </span>
                    
                    <span className="text-neutral-400 font-semibold">Request ID:</span>
                    <span className="text-white break-all">{debugInfo.requestId || "N/A"}</span>
                    
                    <span className="text-neutral-400 font-semibold">Idempotency:</span>
                    <span className="text-white break-all">{debugInfo.idempotencyKey}</span>
                    
                    <span className="text-neutral-400 font-semibold">Timestamp:</span>
                    <span className="text-white">{new Date(debugInfo.timestamp).toLocaleString()}</span>
                  </div>

                  {/* Headers */}
                  <div className="border-t border-neutral-700 pt-3">
                    <h4 className="font-semibold text-neutral-300 mb-2">Request Headers:</h4>
                    <div className="bg-neutral-900 p-2 rounded font-mono text-xs space-y-1">
                      {Object.entries(debugInfo.headers).map(([key, value]) => (
                        <div key={key} className="flex">
                          <span className="text-neutral-400 w-32 flex-shrink-0">{key}:</span>
                          <span className="text-white break-all">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Error Details */}
                  {(debugInfo.errorCode || debugInfo.errorMessage) && (
                    <div className="border-t border-neutral-700 pt-3">
                      <h4 className="font-semibold text-red-400 mb-2">Error Details:</h4>
                      <div className="bg-red-900/20 p-2 rounded space-y-1">
                        {debugInfo.errorCode && (
                          <div className="font-mono text-xs">
                            <span className="text-red-400 font-semibold">Code:</span>
                            <span className="text-red-300 ml-2">{debugInfo.errorCode}</span>
                          </div>
                        )}
                        {debugInfo.errorMessage && (
                          <div className="font-mono text-xs">
                            <span className="text-red-400 font-semibold">Message:</span>
                            <span className="text-red-300 ml-2">{debugInfo.errorMessage}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
            disabled={isPending || !title.trim() || !prompt.trim() || !!validationErrors.params}
          >
            {isPending ? "Creating..." : "Create Task"}
          </button>
        </div>
      </div>
    </div>
  );
}
