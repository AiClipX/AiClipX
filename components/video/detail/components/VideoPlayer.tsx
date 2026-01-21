import React, { useState } from 'react';
import { PlayIcon, ArrowPathIcon, XCircleIcon } from '@heroicons/react/24/solid';

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  thumbnail?: string;
  onRetry?: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl, title, thumbnail, onRetry }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
    setRetryCount(0); // Reset retry count on successful load
  };

  const handleError = (e: any) => {
    console.error('Video load error:', e);
    setIsLoading(false);
    setHasError(true);
  };

  const handleRetryVideo = () => {
    setRetryCount(prev => prev + 1);
    setHasError(false);
    setIsLoading(true);
    
    // Force video reload by updating src
    const video = document.querySelector('video') as HTMLVideoElement;
    if (video) {
      video.load();
    }
  };

  const handleRefreshPage = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  if (hasError) {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-center text-white p-8 max-w-md">
          <XCircleIcon className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h3 className="text-xl font-semibold mb-2">Video Not Playable</h3>
          <p className="text-gray-400 mb-6">
            The video file could not be loaded. This might be a temporary issue.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={handleRetryVideo}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <ArrowPathIcon className="w-5 h-5" />
              <span>Retry Video {retryCount > 0 && `(${retryCount})`}</span>
            </button>
            
            <button
              onClick={handleRefreshPage}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <ArrowPathIcon className="w-5 h-5" />
              <span>Refresh Page</span>
            </button>
            
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full px-4 py-2 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 rounded-lg transition-colors text-center"
            >
              Open in New Tab
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
          <div className="text-center text-white">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading video...</p>
            {retryCount > 0 && (
              <p className="text-gray-500 text-sm mt-2">Retry attempt {retryCount}</p>
            )}
          </div>
        </div>
      )}
      
      <video
        key={`${videoUrl}-${retryCount}`} // Force re-render on retry
        className="w-full h-full"
        controls
        preload="metadata"
        poster={thumbnail}
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onError={handleError}
        onLoadedData={() => setIsLoading(false)}
      >
        <source src={videoUrl} type="video/mp4" />
        <source src={videoUrl} type="video/webm" />
        <source src={videoUrl} type="video/quicktime" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoPlayer;