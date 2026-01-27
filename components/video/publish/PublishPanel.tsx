import React, { useState, useEffect } from 'react';
import { 
  ArrowDownTrayIcon, 
  LinkIcon, 
  ClipboardDocumentIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  GlobeAltIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../../contexts/LanguageContext';
import { useCapabilityCheck } from '../../common/CapabilityGuard';
import { Video } from '../types/videoTypes';
import { PublishManager, PublishRegion, PublishMetadata } from '../../../lib/publishSystem';
import { handleError } from '../../../lib/globalErrorHandler';
import { showToast } from '../../common/Toast';

interface PublishPanelProps {
  video: Video;
  onClose?: () => void;
}

export function PublishPanel({ video, onClose }: PublishPanelProps) {
  const { t } = useLanguage();
  const { canDownloadVideo } = useCapabilityCheck();
  
  // State
  const [selectedRegion, setSelectedRegion] = useState<PublishRegion>('EN');
  const [publishMetadata, setPublishMetadata] = useState<PublishMetadata | null>(null);
  const [copiedItems, setCopiedItems] = useState<Record<string, boolean>>({});
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [videoValidation, setVideoValidation] = useState<{ valid: boolean; error?: string } | null>(null);

  // Generate metadata when region changes
  useEffect(() => {
    if (video.videoUrl) {
      const metadata = PublishManager.generateMetadata(
        video.title || 'Untitled Video',
        video.prompt || '',
        video.videoUrl,
        selectedRegion
      );
      setPublishMetadata(metadata);
    }
  }, [selectedRegion, video]);

  // Validate video URL on mount
  useEffect(() => {
    if (video.videoUrl) {
      PublishManager.validateVideoUrl(video.videoUrl)
        .then(result => setVideoValidation(result))
        .catch(error => {
          setVideoValidation({ 
            valid: false, 
            error: error.message || 'Validation failed' 
          });
        });
    }
  }, [video.videoUrl]);

  // Copy helper function
  const copyToClipboard = async (text: string, key: string) => {
    try {
      const success = await PublishManager.copyToClipboard(text);
      if (success) {
        setCopiedItems(prev => ({ ...prev, [key]: true }));
        showToast(t('success.copied'), 'success', 1500);
        setTimeout(() => {
          setCopiedItems(prev => ({ ...prev, [key]: false }));
        }, 2000);
      } else {
        showToast('Failed to copy to clipboard', 'error');
      }
    } catch (err) {
      console.error('Copy failed:', err);
      showToast('Failed to copy to clipboard', 'error');
    }
  };

  // Download video
  const handleDownload = async () => {
    if (!video.videoUrl || !canDownloadVideo) {
      showToast('Download not available', 'error');
      return;
    }

    setDownloading(true);
    setDownloadProgress(0);

    try {
      const filename = `${video.title || 'video'}-${video.id}.mp4`;
      const result = await PublishManager.downloadVideo(
        video.videoUrl,
        filename,
        (progress) => setDownloadProgress(progress)
      );

      if (result.success) {
        showToast(t('success.downloadStarted'), 'success');
      } else {
        const errorInfo = handleError(new Error(result.error), 'PublishPanel.download');
        showToast(errorInfo.message, 'error');
      }
    } catch (error: any) {
      const errorInfo = handleError(error, 'PublishPanel.download');
      showToast(errorInfo.message, 'error');
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  // Copy shareable link
  const handleCopyLink = async () => {
    const shareLink = PublishManager.generateShareableLink(video.id, selectedRegion);
    await copyToClipboard(shareLink, 'shareLink');
  };

  if (!publishMetadata) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 text-gray-600">
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading publish options...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GlobeAltIcon className="w-6 h-6 text-blue-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{t('publish.title')}</h3>
              <p className="text-sm text-gray-600">{t('publish.description')}</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Video Status & Validation */}
        {videoValidation && !videoValidation.valid && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-red-900">Video Access Issue</h4>
                <p className="text-sm text-red-700 mt-1">{videoValidation.error}</p>
                {video.debug?.requestId && (
                  <p className="text-xs text-red-600 mt-2 font-mono">
                    Request ID: {video.debug.requestId}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Region Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            {t('publish.regionSelector')}
          </label>
          <div className="grid grid-cols-3 gap-3">
            {PublishManager.getAvailableRegions().map((region) => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`p-3 rounded-lg border-2 transition-all ${
                  selectedRegion === region
                    ? 'border-blue-500 bg-blue-50 text-blue-900'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="text-center">
                  <div className="font-medium">{region}</div>
                  <div className="text-xs mt-1">
                    {PublishManager.getRegionDisplayName(region)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Generated Metadata */}
        <div className="space-y-4">
          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Title Template</label>
              <button
                onClick={() => copyToClipboard(publishMetadata.title, 'title')}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                {copiedItems.title ? (
                  <>
                    <CheckIcon className="w-3 h-3 text-green-600" />
                    <span className="text-green-600">Copied</span>
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-3 h-3 text-gray-600" />
                    <span className="text-gray-600">Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-900 font-medium">{publishMetadata.title}</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Description Template</label>
              <button
                onClick={() => copyToClipboard(publishMetadata.description, 'description')}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                {copiedItems.description ? (
                  <>
                    <CheckIcon className="w-3 h-3 text-green-600" />
                    <span className="text-green-600">Copied</span>
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-3 h-3 text-gray-600" />
                    <span className="text-gray-600">Copy</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-900 whitespace-pre-line">{publishMetadata.description}</p>
            </div>
          </div>

          {/* Hashtags */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">
                Recommended Hashtags ({publishMetadata.hashtags.length})
              </label>
              <button
                onClick={() => copyToClipboard(publishMetadata.hashtags.join(' '), 'hashtags')}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
              >
                {copiedItems.hashtags ? (
                  <>
                    <CheckIcon className="w-3 h-3 text-green-600" />
                    <span className="text-green-600">Copied</span>
                  </>
                ) : (
                  <>
                    <ClipboardDocumentIcon className="w-3 h-3 text-gray-600" />
                    <span className="text-gray-600">Copy All</span>
                  </>
                )}
              </button>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <div className="flex flex-wrap gap-2">
                {publishMetadata.hashtags.map((hashtag, index) => (
                  <span
                    key={index}
                    className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full cursor-pointer hover:bg-blue-200 transition-colors"
                    onClick={() => copyToClipboard(hashtag, `hashtag-${index}`)}
                    title="Click to copy"
                  >
                    {hashtag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={!canDownloadVideo || downloading || !videoValidation?.valid}
            className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              canDownloadVideo && videoValidation?.valid
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Downloading... {Math.round(downloadProgress)}%</span>
              </>
            ) : (
              <>
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>Download Final Film</span>
              </>
            )}
          </button>

          {/* Copy Link Button */}
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
          >
            <LinkIcon className="w-4 h-4" />
            <span>Copy Share Link</span>
          </button>
        </div>

        {/* Compliance Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <InformationCircleIcon className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 mb-1">Final Film Output Only</p>
              <p className="text-blue-700">
                This download provides the final rendered video file only. No raw assets, 
                project files, or source materials are included. The video is ready for 
                direct upload to social platforms.
              </p>
            </div>
          </div>
        </div>

        {/* Capability Warnings */}
        {!canDownloadVideo && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-yellow-900 mb-1">Download Disabled</p>
                <p className="text-yellow-700">
                  Video downloads are currently disabled. You can still copy the share link 
                  and metadata templates for manual use.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}