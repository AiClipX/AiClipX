import React from 'react';
import { useRouter } from 'next/router';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useVideoDetail } from '../../../../components/video/detail/hooks/useVideoDetail';
import { useAuth } from '../../../../contexts/AuthContext';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { CapabilityGuard } from '../../../../components/common/CapabilityGuard';
import { PublishPanel } from '../../../../components/video/publish/PublishPanel';
import { VideoDetailSkeleton } from '../../../../components/video/detail/components/VideoDetailSkeleton';
import { NotFound } from '../../../../components/video/detail/components/NotFound';
import { LanguageSelector } from '../../../../components/common/LanguageSelector';

export default function PublishPage() {
  const router = useRouter();
  const { id } = router.query;
  const { video, loading, notFound, error } = useVideoDetail(id as string);
  const { logout, user } = useAuth();
  const { t } = useLanguage();

  // Loading state
  if (loading) {
    return (
      <CapabilityGuard>
        <div className="min-h-screen bg-gray-50">
          <VideoDetailSkeleton />
        </div>
      </CapabilityGuard>
    );
  }

  // Not found state
  if (notFound || !video) {
    return (
      <CapabilityGuard>
        <div className="min-h-screen bg-gray-50">
          <NotFound videoId={id as string} />
        </div>
      </CapabilityGuard>
    );
  }

  // Error state
  if (error) {
    return (
      <CapabilityGuard>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-red-900 mb-2">
                Failed to Load Video
              </h2>
              <p className="text-red-700 mb-4">{error}</p>
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Go Back</span>
              </button>
            </div>
          </div>
        </div>
      </CapabilityGuard>
    );
  }

  // Only show publish page for completed videos
  if (video.status !== 'completed') {
    return (
      <CapabilityGuard>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => router.push(`/dashboard/videos/${video.id}`)}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeftIcon className="w-5 h-5" />
                <span>Back to Video</span>
              </button>
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

            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
              <h2 className="text-xl font-bold text-yellow-900 mb-2">
                Video Not Ready for Publishing
              </h2>
              <p className="text-yellow-700 mb-4">
                This video is currently <strong>{video.status}</strong> and cannot be published yet. 
                Please wait for the video to complete processing.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/dashboard/videos/${video.id}`)}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors"
                >
                  <ArrowLeftIcon className="w-5 h-5" />
                  <span>View Video Details</span>
                </button>
                <button
                  onClick={() => router.push('/dashboard')}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </CapabilityGuard>
    );
  }

  return (
    <CapabilityGuard>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto p-8">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <button
              onClick={() => router.push(`/dashboard/videos/${video.id}`)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5" />
              <span>Back to Video</span>
            </button>
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

          {/* Video Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-start gap-4">
              {video.thumbnail && (
                <img
                  src={video.thumbnail}
                  alt={video.title}
                  className="w-24 h-14 object-cover rounded-lg flex-shrink-0"
                />
              )}
              <div className="flex-1">
                <h1 className="text-xl font-bold text-gray-900 mb-2">
                  {video.title || 'Untitled Video'}
                </h1>
                <p className="text-sm text-gray-600 mb-2">
                  {video.prompt && video.prompt.length > 100 
                    ? `${video.prompt.substring(0, 100)}...` 
                    : video.prompt}
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>ID: {video.id}</span>
                  <span>Created: {new Date(video.createdAt).toLocaleDateString()}</span>
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full">
                    {video.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Publish Panel */}
          <PublishPanel video={video} />
        </div>
      </div>
    </CapabilityGuard>
  );
}