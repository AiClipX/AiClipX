import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { useVideoDetail } from "./hooks/useVideoDetail";
import { useAuth } from "../../../contexts/AuthContext";
import { useLanguage } from "../../../contexts/LanguageContext";
import StatusBadge from "./components/StatusBadge";
import VideoPlayer from "./components/VideoPlayer";
import ErrorDisplay from "./components/ErrorDisplay";
import NotFound from "./components/NotFound";
import { VideoMeta } from "./components/VideoMeta";
import { VideoActions } from "./components/VideoActions";
import { BackButton } from "./components/BackButton";
import { VideoDetailSkeleton } from "./components/VideoDetailSkeleton";
import { LanguageSelector } from "../../common/LanguageSelector";
import { ArrowPathIcon, ClipboardDocumentIcon, CheckIcon } from '@heroicons/react/24/outline';

interface Props {
  id: string;
}

export function VideoDetailContainer({ id }: Props) {
  const router = useRouter();
  const { video, loading, notFound, error, refetch } = useVideoDetail(id);
  const { logout, user } = useAuth();
  const { t } = useLanguage();
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});

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
            Failed to Load Video Details
          </h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={refetch}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            <ArrowPathIcon className="w-5 h-5" />
            <span>Try Again</span>
          </button>
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
                  The video generation completed but the video file is not available yet.
                  This might be a temporary issue.
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
                  Your video is being processed. This may take a few minutes.
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
                  Your video is in the queue and will start processing soon.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Failed: Show error with enhanced display */}
        {video.status === 'failed' && (
          <ErrorDisplay
            errorMessage={video.errorMessage || 'Video generation failed for unknown reason'}
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
      </div>
    </div>
  );
}
