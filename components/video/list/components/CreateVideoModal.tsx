import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/router";
import { showToast } from "../../../common/Toast";
import { useCreateVideo } from "../hooks/useCreateVideo";
import { Video } from "../../types/videoTypes";
import { useAuth } from "../../../../contexts/AuthContext";
import { useLanguage } from "../../../../contexts/LanguageContext";

// Generate UUID v4
const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

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
  idempotencyKeyShort: string | null;
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

// Validation constants
const MAX_TITLE_LENGTH = 200;
const MAX_PROMPT_LENGTH = 2000;

export function CreateVideoModal({ open, onClose, onCreated }: Props) {
  const router = useRouter();
  const { mutate, isPending } = useCreateVideo();
  const { token } = useAuth();
  const { t } = useLanguage();
  
  // Double-submit prevention with ref
  const isSubmittingRef = useRef(false);
  const currentIdempotencyKeyRef = useRef<string | null>(null);
  
  // Form fields
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [engine, setEngine] = useState("mock");
  const [paramsJson, setParamsJson] = useState('{\n  "durationSec": 5,\n  "ratio": "16:9"\n}');

  // Validation state
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [isValidatingParams, setIsValidatingParams] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Debug panel state
  const [showDebug, setShowDebug] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      // Reset everything when opening
      setTitle("");
      setPrompt("");
      setEngine("mock");
      setParamsJson('{\n  "durationSec": 5,\n  "ratio": "16:9"\n}');
      setValidationErrors({});
      setHasAttemptedSubmit(false);
      setShowDebug(false);
      setDebugInfo(null);
      isSubmittingRef.current = false;
      currentIdempotencyKeyRef.current = null;
    }
  }, [open]);

  // Enhanced client-side validation
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Title validation
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      errors.title = t('create.form.titleRequired');
    } else if (trimmedTitle.length > MAX_TITLE_LENGTH) {
      errors.title = t('create.form.titleMaxLength', { max: MAX_TITLE_LENGTH });
    }

    // Prompt validation
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      errors.prompt = t('create.form.promptRequired');
    } else if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
      errors.prompt = t('create.form.promptMaxLength', { max: MAX_PROMPT_LENGTH });
    }

    // JSON params validation
    if (paramsJson.trim()) {
      try {
        const parsed = JSON.parse(paramsJson);
        // Additional validation for params structure
        if (typeof parsed !== 'object' || Array.isArray(parsed)) {
          errors.params = t('create.form.paramsInvalid');
        }
      } catch (e) {
        errors.params = t('create.form.paramsInvalid');
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Real-time validation for individual fields
  const validateField = (field: keyof ValidationErrors, value: string) => {
    const errors = { ...validationErrors };
    
    switch (field) {
      case 'title':
        const trimmedTitle = value.trim();
        if (!trimmedTitle && hasAttemptedSubmit) {
          errors.title = t('create.form.titleRequired');
        } else if (trimmedTitle.length > MAX_TITLE_LENGTH) {
          errors.title = t('create.form.titleMaxLength', { max: MAX_TITLE_LENGTH });
        } else {
          delete errors.title;
        }
        break;
        
      case 'prompt':
        const trimmedPrompt = value.trim();
        if (!trimmedPrompt && hasAttemptedSubmit) {
          errors.prompt = t('create.form.promptRequired');
        } else if (trimmedPrompt.length > MAX_PROMPT_LENGTH) {
          errors.prompt = t('create.form.promptMaxLength', { max: MAX_PROMPT_LENGTH });
        } else {
          delete errors.prompt;
        }
        break;
    }
    
    setValidationErrors(errors);
  };

  // Real-time JSON validation with debounce
  const handleParamsChange = (value: string) => {
    setParamsJson(value);
    setIsValidatingParams(true);
    
    // Debounced validation
    setTimeout(() => {
      const errors = { ...validationErrors };
      
      if (value.trim()) {
        try {
          const parsed = JSON.parse(value);
          if (typeof parsed !== 'object' || Array.isArray(parsed)) {
            errors.params = "Parameters must be a valid JSON object";
          } else {
            delete errors.params;
          }
        } catch (e) {
          errors.params = "Invalid JSON format";
        }
      } else {
        delete errors.params;
      }
      
      setValidationErrors(errors);
      setIsValidatingParams(false);
    }, 300);
  };

  // Retry with same idempotency key
  const handleRetry = () => {
    if (!currentIdempotencyKeyRef.current) {
      console.warn('No idempotency key available for retry');
      return;
    }
    
    console.log('Retrying with same idempotency key:', currentIdempotencyKeyRef.current);
    handleSubmit(true); // Pass retry flag
  };

  // Get friendly error message based on status code
  const getFriendlyErrorMessage = (status: number | null, errorMessage: string, requestId: string): string => {
    switch (status) {
      case 422:
        return `Invalid data: ${errorMessage}${requestId !== "unknown" ? ` (ID: ${requestId})` : ""}`;
      case 429:
        return `Too many requests, please try again later${requestId !== "unknown" ? ` (ID: ${requestId})` : ""}`;
      case 500:
        return `Server error, please try again${requestId !== "unknown" ? ` (ID: ${requestId})` : ""}`;
      case 401:
        return `Session expired, please login again${requestId !== "unknown" ? ` (ID: ${requestId})` : ""}`;
      case 403:
        return `Access denied${requestId !== "unknown" ? ` (ID: ${requestId})` : ""}`;
      default:
        return `Failed to create video: ${errorMessage}${requestId !== "unknown" ? ` (ID: ${requestId})` : ""}`;
    }
  };

  const handleSubmit = (isRetry: boolean = false) => {
    // Set attempted submit flag for validation
    setHasAttemptedSubmit(true);
    
    // Double-submit prevention
    if (isSubmittingRef.current || isPending) {
      console.log('Submit blocked: already in progress');
      return;
    }

    // Client-side validation
    if (!validateForm()) {
      showToast(t('create.form.fixErrors'), "error", 3000);
      return;
    }

    // Parse params
    let params = {};
    if (paramsJson.trim()) {
      try {
        params = JSON.parse(paramsJson);
      } catch (e) {
        showToast(t('create.form.paramsInvalid'), "error", 3000);
        return;
      }
    }

    // Set submitting flag
    isSubmittingRef.current = true;

    // Generate or reuse idempotency key
    let idempotencyKey: string;
    if (isRetry && currentIdempotencyKeyRef.current) {
      idempotencyKey = currentIdempotencyKeyRef.current;
      console.log('Reusing idempotency key for retry:', idempotencyKey);
    } else {
      idempotencyKey = generateUUID();
      currentIdempotencyKeyRef.current = idempotencyKey;
      console.log('Generated new idempotency key:', idempotencyKey);
    }

    // Create payload
    const payload: any = {
      title: title.trim(),
      prompt: prompt.trim(),
      engine,
      params,
    };

    const idempotencyKeyShort = `${idempotencyKey.substring(0, 8)}...${idempotencyKey.substring(idempotencyKey.length - 8)}`;
    const endpoint = "/api/video-tasks";

    // Prepare debug info with masked token
    const maskedToken = token ? `${token.substring(0, 8)}...${token.substring(token.length - 4)}` : "***MASKED***";
    const headers = {
      "Authorization": `Bearer ${maskedToken}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKeyShort,
      "X-Request-Id": "auto-generated",
    };

    mutate({ payload, idempotencyKey }, {
      onSuccess: (newVideo: Video) => {
        // Reset submitting flag
        isSubmittingRef.current = false;
        
        showToast(t('success.videoCreated') + `: ${newVideo.id}`, "success", 2000);
        onCreated?.(newVideo);

        // Reset form
        setTitle("");
        setPrompt("");
        setEngine("mock");
        setParamsJson('{\n  "durationSec": 5,\n  "ratio": "16:9"\n}');
        setValidationErrors({});
        setHasAttemptedSubmit(false);
        currentIdempotencyKeyRef.current = null;
        
        // Show success debug info
        setDebugInfo({
          endpoint,
          method: "POST",
          status: 201,
          requestId: "success",
          idempotencyKey,
          idempotencyKeyShort,
          errorCode: null,
          errorMessage: null,
          timestamp: new Date().toISOString(),
          headers,
        });
        setShowDebug(true);

        // Auto-navigate to detail page on success
        setTimeout(() => {
          onClose();
          router.push(`/dashboard/videos/${newVideo.id}`);
        }, 1500);
      },
      onError: (error: any) => {
        // Reset submitting flag
        isSubmittingRef.current = false;
        
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
          idempotencyKeyShort,
          errorCode,
          errorMessage,
          timestamp: new Date().toISOString(),
          headers,
        });
        setShowDebug(true);

        // Show friendly error message based on status code
        const friendlyMessage = getFriendlyErrorMessage(status, errorMessage, requestId);
        showToast(friendlyMessage, "error", 5000);
      },
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 rounded-lg p-6 w-full max-w-2xl text-white max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">{t('create.createFilm')}</h2>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('create.form.title')} <span className="text-red-400">*</span>
              <span className="text-neutral-400 text-xs ml-2">
                {t('create.form.characterCount', { current: title.length, max: MAX_TITLE_LENGTH })}
              </span>
            </label>
            <input
              className={`w-full px-3 py-2 rounded bg-neutral-800 border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.title 
                  ? 'border-red-500 bg-red-900/20' 
                  : 'border-neutral-700'
              }`}
              placeholder={t('create.form.titlePlaceholder')}
              value={title}
              maxLength={MAX_TITLE_LENGTH}
              onChange={(e) => {
                setTitle(e.target.value);
                validateField('title', e.target.value);
              }}
              disabled={isPending || isSubmittingRef.current}
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
              {t('create.form.prompt')} <span className="text-red-400">*</span>
              <span className="text-neutral-400 text-xs ml-2">
                {t('create.form.characterCount', { current: prompt.length, max: MAX_PROMPT_LENGTH })}
              </span>
            </label>
            <textarea
              className={`w-full px-3 py-2 rounded bg-neutral-800 border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                validationErrors.prompt 
                  ? 'border-red-500 bg-red-900/20' 
                  : 'border-neutral-700'
              }`}
              rows={3}
              placeholder={t('create.form.promptPlaceholder')}
              value={prompt}
              maxLength={MAX_PROMPT_LENGTH}
              onChange={(e) => {
                setPrompt(e.target.value);
                validateField('prompt', e.target.value);
              }}
              disabled={isPending || isSubmittingRef.current}
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
            <label className="block text-sm font-medium mb-1">{t('create.form.engine')}</label>
            <select
              className="w-full px-3 py-2 rounded bg-neutral-800 border border-neutral-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              disabled={isPending || isSubmittingRef.current}
            >
              <option value="mock">{t('create.form.mockEngine')}</option>
              <option value="runway">{t('create.form.runwayEngine')}</option>
            </select>
          </div>

          {/* Params JSON */}
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('create.form.params')} <span className="text-neutral-400">- {t('create.form.paramsOptional')}</span>
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
              disabled={isPending || isSubmittingRef.current}
            />
            {validationErrors.params && (
              <div className="flex items-center gap-1 mt-1 text-red-400 text-sm">
                <span>⚠</span>
                <span>{validationErrors.params}</span>
              </div>
            )}
            {isValidatingParams && (
              <div className="mt-1 text-blue-400 text-sm">{t('create.form.validatingJson')}</div>
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
                  🔍 {t('debug.panel')}
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
                    <span className="text-neutral-400 font-semibold">{t('debug.endpoint')}</span>
                    <span className="text-blue-400 break-all">{debugInfo.endpoint}</span>
                    
                    <span className="text-neutral-400 font-semibold">{t('debug.method')}</span>
                    <span className="text-white">{debugInfo.method}</span>
                    
                    <span className="text-neutral-400 font-semibold">{t('debug.status')}</span>
                    <span className={debugInfo.status === 201 ? "text-green-400" : debugInfo.status ? "text-red-400" : "text-yellow-400"}>
                      {debugInfo.status || t('debug.pending')}
                    </span>
                    
                    <span className="text-neutral-400 font-semibold">{t('debug.requestId')}</span>
                    <span className="text-white break-all">{debugInfo.requestId || t('debug.na')}</span>
                    
                    <span className="text-neutral-400 font-semibold">{t('debug.idempotency')}</span>
                    <span className="text-white break-all" title={debugInfo.idempotencyKey || t('debug.na')}>
                      {debugInfo.idempotencyKeyShort || t('debug.na')}
                    </span>
                    
                    <span className="text-neutral-400 font-semibold">{t('debug.timestamp')}</span>
                    <span className="text-white">{new Date(debugInfo.timestamp).toLocaleString()}</span>
                  </div>

                  {/* Headers */}
                  <div className="border-t border-neutral-700 pt-3">
                    <h4 className="font-semibold text-neutral-300 mb-2">{t('debug.headers')}</h4>
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
                      <h4 className="font-semibold text-red-400 mb-2">{t('debug.errorDetails')}</h4>
                      <div className="bg-red-900/20 p-2 rounded space-y-1">
                        {debugInfo.errorCode && (
                          <div className="font-mono text-xs">
                            <span className="text-red-400 font-semibold">{t('debug.code')}</span>
                            <span className="text-red-300 ml-2">{debugInfo.errorCode}</span>
                          </div>
                        )}
                        {debugInfo.errorMessage && (
                          <div className="font-mono text-xs">
                            <span className="text-red-400 font-semibold">{t('debug.message')}</span>
                            <span className="text-red-300 ml-2">{debugInfo.errorMessage}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Retry button for network errors */}
                      {debugInfo.status && debugInfo.status >= 500 && currentIdempotencyKeyRef.current && (
                        <div className="mt-3">
                          <button
                            onClick={handleRetry}
                            disabled={isPending || isSubmittingRef.current}
                            className="flex items-center gap-2 px-3 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white rounded text-sm transition-colors"
                          >
                            {(isPending || isSubmittingRef.current) && (
                              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            )}
                            {t('debug.retryWithSameKey')}
                          </button>
                          <p className="text-xs text-neutral-400 mt-1">
                            {t('debug.retryDescription')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            className="px-4 py-2 bg-neutral-700 rounded hover:bg-neutral-600 transition-colors disabled:opacity-50"
            onClick={onClose}
            disabled={isPending || isSubmittingRef.current}
          >
            {t('action.cancel')}
          </button>

          <button
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[140px] justify-center"
            onClick={() => handleSubmit(false)}
            disabled={
              isPending || 
              isSubmittingRef.current || 
              !title.trim() || 
              !prompt.trim() || 
              !!validationErrors.params ||
              title.length > MAX_TITLE_LENGTH ||
              prompt.length > MAX_PROMPT_LENGTH
            }
          >
            {(isPending || isSubmittingRef.current) && (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            {(isPending || isSubmittingRef.current) ? t('create.form.creating') : t('create.form.createAndView')}
          </button>
        </div>
      </div>
    </div>
  );
}
