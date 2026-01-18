import React from 'react';
import { useRouter } from 'next/router';
import { useVideoDetail } from "./hooks/useVideoDetail";
import { useAuth } from "../../../contexts/AuthContext";
import StatusBadge from "./components/StatusBadge";
import VideoPlayer from "./components/VideoPlayer";
import ErrorDisplay from "./components/ErrorDisplay";
import NotFound from "./components/NotFound";
import { VideoMeta } from "./components/VideoMeta";
import { VideoActions } from "./components/VideoActions";
import { BackButton } from "./components/BackButton";
import { VideoDetailSkeleton } from "./components/VideoDetailSkeleton";
import { ArrowPathIcon } from '@heroicons/react/24/outline';

interface Props {
  id: string;
}

export function VideoDetailContainer({ id }: Props) {
  const router = useRouter();
  const { video, loading, notFound, error, refetch } = useVideoDetail(id);
  const { logout, user } = useAuth();

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
          {user && (
            <span className="text-sm text-gray-600">
              {user.email || user.name}
            </span>
          )}
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-white text-sm font-medium transition"
          >
            Logout
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
            title={video.title}
            thumbnail={video.thumbnail}
          />
        )}

        {/* Completed but no video URL */}
        {video.status === 'completed' && !video.videoUrl && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-yellow-900 mb-2">
              Video Completed but URL Missing
            </h3>
            <p className="text-yellow-700">
              The video generation completed but the video file is not available yet.
              Please try refreshing the page or contact support.
            </p>
          </div>
        )}

        {/* Processing: Show progress */}
        {video.status === 'processing' && (
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
            <div className="flex items-center gap-4">
              <ArrowPathIcon className="w-8 h-8 text-blue-500 animate-spin" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">
                  Generating Your Video...
                </h3>
                <p className="text-blue-700 mb-3">
                  Your video is being processed. This may take a few minutes.
                </p>
                {video.progress !== undefined && (
                  <div className="w-full bg-blue-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${video.progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Queued: Show waiting message */}
        {video.status === 'queued' && (
          <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Video Queued
            </h3>
            <p className="text-gray-700">
              Your video is in the queue and will start processing soon.
            </p>
          </div>
        )}

        {/* Failed: Show error */}
        {video.status === 'failed' && (
          <ErrorDisplay
            errorMessage={video.errorMessage || 'Video generation failed'}
            requestId={video.debug?.requestId}
          />
        )}

        {/* Video Metadata */}
        <VideoMeta video={video} />

        {/* Video Actions */}
        <VideoActions video={video} />
      </div>
    </div>
  );
}
