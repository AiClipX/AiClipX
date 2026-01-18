import React, { useState } from 'react';
import { PlayIcon } from '@heroicons/react/24/solid';

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  thumbnail?: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl, title, thumbnail }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleCanPlay = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (hasError) {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-center text-white p-8">
          <XCircleIcon className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h3 className="text-xl font-semibold mb-2">Failed to Load Video</h3>
          <p className="text-gray-400 mb-4">The video file could not be loaded.</p>
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 underline"
          >
            Try opening in new tab
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center text-white">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">Loading video...</p>
          </div>
        </div>
      )}
      
      <video
        className="w-full h-full"
        controls
        preload="metadata"
        poster={thumbnail}
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onError={handleError}
      >
        <source src={videoUrl} type="video/mp4" />
        <source src={videoUrl} type="video/webm" />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

// Import XCircleIcon
import { XCircleIcon } from '@heroicons/react/24/solid';

export default VideoPlayer;