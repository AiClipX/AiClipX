import React, { useState, useRef, useEffect } from 'react';
import { PlayIcon, ArrowPathIcon, XCircleIcon, SpeakerWaveIcon, SpeakerXMarkIcon } from '@heroicons/react/24/solid';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { handleError } from '../../../../lib/globalErrorHandler';

interface VideoPlayerProps {
  videoUrl: string;
  title: string;
  thumbnail?: string;
  onRetry?: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl, title, thumbnail, onRetry }) => {
  const { t } = useLanguage();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto-hide controls after 3 seconds of inactivity
  useEffect(() => {
    const resetControlsTimeout = () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      setShowControls(true);
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [isPlaying]);

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
  };

  const handleCanPlay = () => {
    setIsLoading(false);
    setRetryCount(0); // Reset retry count on successful load
  };

  const handleError = (e: any) => {
    console.error('Video load error:', e);
    setIsLoading(false);
    setHasError(true);
    
    // Determine error type
    const video = e.target as HTMLVideoElement;
    const error = video.error;
    
    let message = t('detail.videoNotPlayable');
    if (error) {
      switch (error.code) {
        case MediaError.MEDIA_ERR_ABORTED:
          message = 'Video loading was aborted';
          break;
        case MediaError.MEDIA_ERR_NETWORK:
          message = 'Network error while loading video';
          break;
        case MediaError.MEDIA_ERR_DECODE:
          message = 'Video format not supported';
          break;
        case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
          message = 'Video source not supported';
          break;
        default:
          message = t('detail.videoNotPlayable');
      }
    }
    
    setErrorMessage(message);
  };

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
    setShowControls(true);
  };

  const handleRetryVideo = () => {
    setRetryCount(prev => prev + 1);
    setHasError(false);
    setIsLoading(true);
    setErrorMessage('');
    
    // Force video reload by updating src
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  const handleRefreshPage = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleReplay = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  if (hasError) {
    return (
      <div className="w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-center text-white p-8 max-w-md">
          <XCircleIcon className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h3 className="text-xl font-semibold mb-2">{t('detail.videoNotPlayable')}</h3>
          <p className="text-gray-400 mb-2">
            {errorMessage}
          </p>
          <p className="text-gray-500 text-sm mb-6">
            {t('detail.videoNotAvailableDescription')}
          </p>
          
          <div className="space-y-3">
            <button
              onClick={handleRetryVideo}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <ArrowPathIcon className="w-5 h-5" />
              <span>{t('detail.retryVideo')} {retryCount > 0 && `(${retryCount})`}</span>
            </button>
            
            <button
              onClick={handleRefreshPage}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <ArrowPathIcon className="w-5 h-5" />
              <span>{t('detail.refreshPage')}</span>
            </button>
            
            <a
              href={videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full px-4 py-2 border border-gray-600 text-gray-300 hover:text-white hover:border-gray-500 rounded-lg transition-colors text-center"
            >
              {t('detail.openNewTab')}
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden group"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-20">
          <div className="text-center text-white">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-400">{t('loading.video')}</p>
            {retryCount > 0 && (
              <p className="text-gray-500 text-sm mt-2">Retry attempt {retryCount}</p>
            )}
          </div>
        </div>
      )}
      
      {/* Custom overlay controls */}
      <div className={`absolute inset-0 z-10 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
        {/* Top gradient */}
        <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-black/50 to-transparent" />
        
        {/* Bottom gradient */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
        
        {/* Title overlay */}
        <div className="absolute top-4 left-4 right-4">
          <h3 className="text-white font-medium text-sm truncate">{title}</h3>
        </div>
        
        {/* Bottom controls */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? (
              <SpeakerXMarkIcon className="w-5 h-5" />
            ) : (
              <SpeakerWaveIcon className="w-5 h-5" />
            )}
          </button>
          
          <button
            onClick={handleReplay}
            className="p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            title="Replay"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      <video
        ref={videoRef}
        key={`${videoUrl}-${retryCount}`} // Force re-render on retry
        className="w-full h-full"
        controls
        preload="metadata"
        poster={thumbnail}
        onLoadStart={handleLoadStart}
        onCanPlay={handleCanPlay}
        onError={handleError}
        onLoadedData={() => setIsLoading(false)}
        onPlay={handlePlay}
        onPause={handlePause}
        onVolumeChange={(e) => setIsMuted((e.target as HTMLVideoElement).muted)}
      >
        <source src={videoUrl} type="video/mp4" />
        <source src={videoUrl} type="video/webm" />
        <source src={videoUrl} type="video/quicktime" />
        {t('detail.videoNotPlayable')}
      </video>
    </div>
  );
};

export default VideoPlayer;