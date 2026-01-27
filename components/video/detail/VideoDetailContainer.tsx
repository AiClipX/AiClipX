import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useVideoDetail } from "./hooks/useVideoDetail";
import { useAuth } from "../../../contexts/AuthContext";
import { useLanguage } from "../../../contexts/LanguageContext";
import { useCapabilityCheck } from "../../common/CapabilityGuard";
import StatusBadge from "./components/StatusBadge";
import VideoPlayer from "./components/VideoPlayer";
import ErrorDisplay from "./components/ErrorDisplay";
import NotFound from "./components/NotFound";
import { VideoMeta } from "./components/VideoMeta";
import { VideoActions } from "./components/VideoActions";
import { BackButton } from "./components/BackButton";
import { VideoDetailSkeleton } from "./components/VideoDetailSkeleton";
import { LanguageSelector } from "../../common/LanguageSelector";
import { PublishPanel } from "../publish/PublishPanel";
import { ArrowPathIcon, ClipboardDocumentIcon, CheckIcon, PlayIcon, PauseIcon, ShareIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

interface Props {
  id: string;
}

export function VideoDetailContainer({ id }: Props) {
  const router = useRouter();
  const { video, loading, notFound, error, requestId, refetch, isPolling } = useVideoDetail(id);
  const { logout, user } = useAuth();
  const { t } = useLanguage();
  const { canDownloadVideo, canPublish } = useCapabilityCheck();
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});
  const [showPublishPanel, setShowPublishPanel] = useState(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

  // Auto-refresh for processing/queued videos with smart intervals
  useEffect(() => {
    if (!video || !autoRefreshEnabled) return;
    
    const isProcessing = video.status === 'processing' || video.status === 'queued';
    if (!isProcessing) return;

    // Smart polling intervals based on status
    const getPollingInterval = () => {
      if (video.status === 'queued') return 5000; // 5 seconds for queued
      if (video.status === 'processing') {
        // Adaptive interval based on progress
        if (typeof video.progress === 'number') {
          if (video.progress < 20) return 3000; // 3 seconds early stage
          if (video.progress < 80) return 4000; // 4 seconds mid stage  
          return 2000; // 2 seconds near completion
        }
        return 3000; // Default 3 seconds for processing
      }
      return 10000; // Fallback
    };

    const interval = setInterval(() => {
      refetch();
    }, getPollingInterval());

    return () => clearInterval(interval);
  }, [video?.status, video?.progress, autoRefreshEnabled, refetch]);

  // Stop auto-refresh when video is completed or failed
  useEffect(() => {
    if (video && (video.status === 'completed' || video.status === 'failed')) {
      setAutoRefreshEnabled(false);
    }
  }, [video?.status]);

  // Copy helper function
  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopiedItems(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Status progression component
  const StatusProgression = ({ video }: { video: any }) => {
    const getStepStatus = (step: string) => {
      const statusOrder = ['queued', 'processing', 'completed'];
      const currentIndex = statusOrder.indexOf(video.status);
      const stepIndex = statusOrder.indexOf(step);
      
      if (video.status === 'failed') {
        return stepIndex <= 1 ? 'error' : 'pending';
      }
      
      if (stepIndex < currentIndex) return 'completed';
      if (stepIndex === currentIndex) return 'current';
      return 'pending';
    };

    const getStepIcon = (step: string, status: string) => {
      if (status === 'completed') return '✓';
      if (status === 'current') {
        if (step === 'processing') return <ArrowPathIcon className="w-4 h-4 animate-spin" />;
        return '●';
      }
      if (status === 'error') return '✗';
      return '○';
    };

    const getStepColor = (status: string) => {
      switch (status) {
        case 'completed': return 'text-green-400';
        case 'current': return 'text-blue-400';
        case 'error': return 'text-red-400';
        default: return 'text-neutral-500';
      }
    };

    return (
      <div className="bg-neutral-900 rounded-lg p-4 mb-6">
        <h3 className="text-sm font-medium text-neutral-300 mb-3">{t('detail.progress')}</h3>
        <div className="flex items-center justify-between">
          {['queued', 'processing', 'completed'].map((step, index) => {
            const status = getStepStatus(step);
            const isLast = index === 2;
            
            return (
              <div key={step} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    status === 'completed' ? 'bg-green-400 border-green-400 text-white' :
                    status === 'current' ? 'bg-blue-400 border-blue-400 text-white' :
                    status === 'error' ? 'bg-red-400 border-red-400 text-white' :
                    'border-neutral-600 text-neutral-500'
                  }`}>
                    {getStepIcon(step, status)}
                  </div>
                  <span className={`text-xs mt-1 ${getStepColor(status)}`}>
                    {step === 'queued' ? t('status.queued') : 
                     step === 'processing' ? t('status.processing') : 
                     t('status.completed')}
                  </span>
                </div>
                {!isLast && (
                  <div className={`flex-1 h-0.5 mx-2 ${
                    status === 'completed' ? 'bg-green-400' : 'bg-neutral-700'
                  }`} />
                )}
              </div>
            );
          })}
        </div>
        
        {/* Progress bar for processing */}
        {video.status === 'processing' && typeof video.progress === 'number' && (
          <div className="mt-4">
            <div className="flex justify-between text-sm text-neutral-400 mb-1">
              <span>{t('detail.progress')}</span>
              <span>{Math.round(video.progress)}%</span>
            </div>
            <div className="w-full bg-neutral-700 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, video.progress))}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  };

  // Copy actions component
  const CopyActions = ({ video }: { video: any }) => (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
      <h4 className="font-semibold text-gray-900 text-sm">{t('detail.copyInfo')}</h4>
      
      {/* Task ID */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-600">{t('detail.taskId')}</p>
          <p className="font-mono text-sm text-gray-800 break-all">{video.id}</p>
        </div>
        <button
          onClick={() => copyToClipboard(video.id, 'taskId')}
          className="ml-3 flex items-center gap-1 px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          {copiedItems.taskId ? (
            <>
              <CheckIcon className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600">{t('detail.copied')}</span>
            </>
          ) : (
            <>
              <ClipboardDocumentIcon className="w-4 h-4 text-gray-600" />
              <span className="text-xs text-gray-600">{t('action.copy')}</span>
            </>
          )}
        </button>
      </div>

      {/* Video URL */}
      {video.videoUrl && (
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-600">{t('detail.videoUrl')}</p>
            <p className="font-mono text-sm text-gray-800 break-all truncate">{video.videoUrl}</p>
          </div>
          <button
            onClick={() => copyToClipboard(video.videoUrl, 'videoUrl')}
            className="ml-3 flex items-center gap-1 px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {copiedItems.videoUrl ? (
              <>
                <CheckIcon className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-600">{t('detail.copied')}</span>
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="w-4 h-4 text-gray-600" />
                <span className="text-xs text-gray-600">{t('action.copy')}</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Request ID */}
      {video.debug?.requestId && (
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-xs font-medium text-gray-600">{t('detail.requestId')}</p>
            <p className="font-mono text-sm text-gray-800 break-all">{video.debug.requestId}</p>
          </div>
          <button
            onClick={() => copyToClipboard(video.debug.requestId, 'requestId')}
            className="ml-3 flex items-center gap-1 px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 transition-colors"
          >
            {copiedItems.requestId ? (
              <>
                <CheckIcon className="w-4 h-4 text-green-600" />
                <span className="text-xs text-green-600">{t('detail.copied')}</span>
              </>
            ) : (
              <>
                <ClipboardDocumentIcon className="w-4 h-4 text-gray-600" />
                <span className="text-xs text-gray-600">{t('action.copy')}</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );

  // Loading state
  if (loading) {
    return <VideoDetailSkeleton />;
  }

  // Not found state
  if (notFound || !video) {
    return <NotFound videoId={id} />;
  }

  // API error state (different from video failed status)
  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-bold text-red-900 mb-2">
            {t('error.failedToLoadVideo')}
          </h2>
          <p className="text-red-700 mb-4">{error}</p>
          
          {requestId && (
            <div className="bg-red-100 border border-red-300 rounded p-3 mb-4">
              <p className="text-sm font-medium text-red-800 mb-1">
                {t('error.requestId')}
              </p>
              <p className="text-sm font-mono text-red-700 break-all">
                {requestId}
              </p>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <button
              onClick={refetch}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <ArrowPathIcon className="w-5 h-5" />
              )}
              <span>{t('action.retry')}</span>
            </button>
            
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              {t('action.back')} to Dashboard
            </button>
          </div>
          
          {isPolling && (
            <div className="mt-4 flex items-center gap-2 text-sm text-red-600">
              <div className="w-3 h-3 border border-red-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Retrying automatically...</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <BackButton />
        <div className="flex items-center gap-3">
          <LanguageSelector compact />
          {user && (
            <span className="text-sm text-gray-600">
              {user.email || user.name}
            </span>
          )}
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-white text-sm font-medium transition"
          >
            {t('nav.logout')}
          </button>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-6">
        <StatusBadge 
          status={video.status} 
          progress={video.progress}
        />
      </div>

      {/* Status Progression */}
      <StatusProgression video={video} />

      {/* Auto-refresh toggle for processing videos */}
      {(video.status === 'processing' || video.status === 'queued') && (
        <div className="bg-neutral-900 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-white">{t('detail.autoRefresh')}</h3>
              <p className="text-xs text-neutral-400">{t('detail.autoRefreshDescription')}</p>
            </div>
            <button
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                autoRefreshEnabled 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-neutral-700 text-neutral-300'
              }`}
            >
              {autoRefreshEnabled ? <PlayIcon className="w-4 h-4" /> : <PauseIcon className="w-4 h-4" />}
              {autoRefreshEnabled ? t('action.pause') : t('action.resume')}
            </button>
          </div>
        </div>
      )}

      {/* Video Content based on status */}
      <div className="space-y-6">
        {/* Completed: Show video player */}
        {video.status === 'completed' && video.videoUrl && (
          <VideoPlayer
            videoUrl={video.videoUrl}
            title={video.title || 'Untitled Video'}
            thumbnail={video.thumbnail}
            onRetry={refetch}
          />
        )}

        {/* Completed but no video URL */}
        {video.status === 'completed' && !video.videoUrl && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <ArrowPathIcon className="w-8 h-8 text-yellow-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                  {t('detail.videoNotAvailable')}
                </h3>
                <p className="text-yellow-700 mb-4">
                  {t('detail.videoNotAvailableDescription')}
                </p>
                <button
                  onClick={refetch}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                >
                  <ArrowPathIcon className="w-5 h-5" />
                  <span>{t('action.refresh')}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Processing: Show progress with refresh */}
        {video.status === 'processing' && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-blue-900">
                    {t('detail.generating')}
                  </h3>
                  <button
                    onClick={refetch}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 rounded transition-colors"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    {t('action.refresh')}
                  </button>
                </div>
                <p className="text-blue-700 mb-3">
                  {t('detail.generatingDescription')}
                </p>
                {typeof video.progress === 'number' && video.progress >= 0 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-blue-700">
                      <span>{t('detail.progress')}</span>
                      <span>{Math.round(video.progress)}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, video.progress))}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Queued: Show waiting message with refresh */}
        {video.status === 'queued' && (
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full border-4 border-gray-300 border-t-gray-600 animate-spin"></div>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t('detail.queued')}
                  </h3>
                  <button
                    onClick={refetch}
                    className="flex items-center gap-1 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    {t('action.refresh')}
                  </button>
                </div>
                <p className="text-gray-700">
                  {t('detail.queuedDescription')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Failed: Show error with enhanced display */}
        {video.status === 'failed' && (
          <ErrorDisplay
            errorMessage={video.errorMessage || t('detail.failedUnknownReason')}
            requestId={video.debug?.requestId}
            onRetry={refetch}
          />
        )}

        {/* Copy Actions - Always show */}
        <CopyActions video={video} />

        {/* Video Metadata */}
        <VideoMeta video={video} />

        {/* Video Actions */}
        <VideoActions video={video} onRefresh={refetch} />

        {/* Publish Button - only for completed videos and if capability enabled */}
        {video.status === 'completed' && video.videoUrl && canPublish && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {t('publish.title')}
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => router.push(`/dashboard/videos/${video.id}/publish`)}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                >
                  <ShareIcon className="w-4 h-4" />
                  <span>Full Page</span>
                </button>
                <button
                  onClick={() => setShowPublishPanel(!showPublishPanel)}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  <GlobeAltIcon className="w-5 h-5" />
                  <span>{showPublishPanel ? 'Hide' : 'Show'} Panel</span>
                </button>
              </div>
            </div>
            
            {showPublishPanel && (
              <div className="animate-in slide-in-from-top-2 duration-300">
                <PublishPanel 
                  video={video} 
                  onClose={() => setShowPublishPanel(false)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
