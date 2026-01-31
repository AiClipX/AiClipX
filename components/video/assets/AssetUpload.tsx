import { useState, useRef, useCallback, useEffect } from 'react';
import { useLanguage } from '../../../contexts/LanguageContext';
import { showToast } from '../../common/Toast';
import { useAssetUpload } from './hooks/useAssetUpload';
import { Asset } from '../services/assetService';
import { 
  PhotoIcon, 
  VideoCameraIcon, 
  XMarkIcon, 
  ArrowUpTrayIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PlayIcon
} from '@heroicons/react/24/outline';

export interface AssetFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
  preview?: string;
  uploadStatus: 'pending' | 'uploading' | 'completed' | 'failed';
  uploadProgress: number;
  uploadError?: string;
  assetId?: string; // Backend asset ID after successful upload
  assetRecord?: Asset; // Complete asset record from backend
}

interface AssetUploadProps {
  onAssetsChange: (assets: AssetFile[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
  disabled?: boolean;
  autoUpload?: boolean; // Auto-upload files when selected
}

const DEFAULT_MAX_FILES = 10;
const DEFAULT_MAX_FILE_SIZE = 100; // 100MB
const DEFAULT_ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png', 
  'image/gif',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/avi'
];

export function AssetUpload({
  onAssetsChange,
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  acceptedTypes = DEFAULT_ACCEPTED_TYPES,
  disabled = false,
  autoUpload = true
}: AssetUploadProps) {
  const { t } = useLanguage();
  const [assets, setAssets] = useState<AssetFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadAssets, isUploading } = useAssetUpload();

  const updateAssets = useCallback((newAssets: AssetFile[]) => {
    setAssets(newAssets);
    onAssetsChange(newAssets);
  }, [onAssetsChange]);

  // Auto-upload when new assets are added
  useEffect(() => {
    if (!autoUpload) return;
    
    const pendingAssets = assets.filter(asset => asset.uploadStatus === 'pending');
    if (pendingAssets.length === 0) return;

    // Mark pending assets as uploading
    const updatedAssets = assets.map(asset => 
      asset.uploadStatus === 'pending' 
        ? { ...asset, uploadStatus: 'uploading' as const }
        : asset
    );
    setAssets(updatedAssets);
    onAssetsChange(updatedAssets);

    // Start uploads
    uploadAssets(
      pendingAssets,
      // onProgress
      (assetId, progress) => {
        setAssets(prev => prev.map(asset => 
          asset.id === assetId 
            ? { ...asset, uploadProgress: progress }
            : asset
        ));
      },
      // onComplete
      (assetId, assetRecord) => {
        setAssets(prev => {
          const updated = prev.map(asset => 
            asset.id === assetId 
              ? { 
                  ...asset, 
                  uploadStatus: 'completed' as const, 
                  uploadProgress: 100,
                  assetId: assetRecord.id,
                  assetRecord
                }
              : asset
          );
          onAssetsChange(updated);
          return updated;
        });
      },
      // onError
      (assetId, error) => {
        setAssets(prev => {
          const updated = prev.map(asset => 
            asset.id === assetId 
              ? { 
                  ...asset, 
                  uploadStatus: 'failed' as const, 
                  uploadError: error
                }
              : asset
          );
          onAssetsChange(updated);
          return updated;
        });
      }
    );
  }, [assets, autoUpload, uploadAssets, onAssetsChange]);

  const generatePreview = (file: File): Promise<string | undefined> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => resolve(undefined);
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        video.onloadedmetadata = () => {
          canvas.width = 200;
          canvas.height = (video.videoHeight / video.videoWidth) * 200;
          video.currentTime = 1; // Seek to 1 second for thumbnail
        };
        
        video.onseeked = () => {
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL());
          } else {
            resolve(undefined);
          }
        };
        
        video.onerror = () => resolve(undefined);
        video.src = URL.createObjectURL(file);
      } else {
        resolve(undefined);
      }
    });
  };

  const validateFile = (file: File): string | null => {
    // Check file type
    if (!acceptedTypes.includes(file.type)) {
      return t('assets.error.unsupportedType');
    }

    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxFileSize) {
      return t('assets.error.fileTooLarge', { max: maxFileSize.toString() });
    }

    return null;
  };

  const processFiles = async (files: FileList) => {
    if (disabled) return;

    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    // Validate each file
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        errors.push(`${file.name}: ${error}`);
      } else {
        validFiles.push(file);
      }
    }

    // Check total file count
    if (assets.length + validFiles.length > maxFiles) {
      errors.push(t('assets.error.tooManyFiles', { max: maxFiles.toString() }));
      return;
    }

    // Show validation errors
    if (errors.length > 0) {
      showToast(errors.join('\n'), 'error', 5000);
      return;
    }

    // Process valid files
    const newAssets: AssetFile[] = [];
    for (const file of validFiles) {
      const preview = await generatePreview(file);
      const asset: AssetFile = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2)}`,
        file,
        name: file.name,
        size: file.size,
        type: file.type,
        preview,
        uploadStatus: 'pending',
        uploadProgress: 0
      };
      newAssets.push(asset);
    }

    updateAssets([...assets, ...newAssets]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      processFiles(files);
    }
    // Reset input value to allow selecting the same file again
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files) {
      processFiles(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const removeAsset = (id: string) => {
    const newAssets = assets.filter(asset => asset.id !== id);
    updateAssets(newAssets);
  };

  const retryUpload = (id: string) => {
    const newAssets = assets.map(asset => 
      asset.id === id 
        ? { ...asset, uploadStatus: 'pending' as const, uploadProgress: 0, uploadError: undefined }
        : asset
    );
    updateAssets(newAssets);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) {
      return <PhotoIcon className="w-3 h-3" />;
    } else if (type.startsWith('video/')) {
      return <VideoCameraIcon className="w-3 h-3" />;
    }
    return <PhotoIcon className="w-3 h-3" />;
  };

  const renderPreview = (asset: AssetFile) => {
    if (asset.preview) {
      if (asset.type.startsWith('video/')) {
        return (
          <div className="relative w-full h-full">
            <img
              src={asset.preview}
              alt={asset.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <PlayIcon className="w-2 h-2 text-white" />
            </div>
          </div>
        );
      } else {
        return (
          <img
            src={asset.preview}
            alt={asset.name}
            className="w-full h-full object-cover"
          />
        );
      }
    } else {
      return (
        <div className="text-neutral-400">
          {getFileIcon(asset.type)}
        </div>
      );
    }
  };

  const getStatusIcon = (status: AssetFile['uploadStatus']) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="w-3 h-3 text-green-400" />;
      case 'failed':
        return <ExclamationTriangleIcon className="w-3 h-3 text-red-400" />;
      case 'uploading':
        return (
          <svg className="animate-spin w-3 h-3 text-blue-400" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-2 text-center transition-colors ${
          isDragOver
            ? 'border-blue-400 bg-blue-50/10'
            : disabled || isUploading
            ? 'border-neutral-600 bg-neutral-800/50'
            : 'border-neutral-600 hover:border-neutral-500 bg-neutral-800/30'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || isUploading}
        />
        
        <div className="space-y-1">
          <ArrowUpTrayIcon className="w-5 h-5 text-neutral-400 mx-auto" />
          <div>
            <p className="text-white font-medium text-xs">
              {t('assets.upload.title')}
            </p>
          </div>
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isUploading}
            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:opacity-50 text-white text-xs rounded transition-colors"
          >
            {isUploading ? t('assets.status.uploading') : t('assets.upload.selectFiles')}
          </button>
          
          <div className="text-xs text-neutral-500">
            <p>{t('assets.upload.maxFiles', { max: maxFiles.toString() })} • {t('assets.upload.maxSize', { max: maxFileSize.toString() })}</p>
          </div>
        </div>
      </div>

      {/* Asset List */}
      {assets.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-white font-medium text-sm">
            {t('assets.list.title')} ({assets.length}/{maxFiles})
          </h4>
          
          <div className="space-y-1">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center gap-2 p-2 bg-neutral-800 rounded"
              >
                {/* Preview/Icon */}
                <div className="flex-shrink-0 w-8 h-8 bg-neutral-700 rounded flex items-center justify-center overflow-hidden">
                  {renderPreview(asset)}
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-white text-xs font-medium truncate">
                      {asset.name}
                    </p>
                    {getStatusIcon(asset.uploadStatus)}
                  </div>
                  
                  <div className="flex items-center gap-1 text-xs text-neutral-400">
                    <span>{formatFileSize(asset.size)}</span>
                    {asset.uploadStatus === 'uploading' && (
                      <>
                        <span>•</span>
                        <span>{asset.uploadProgress}%</span>
                      </>
                    )}
                  </div>

                  {/* Progress Bar */}
                  {asset.uploadStatus === 'uploading' && (
                    <div className="mt-1 w-full bg-neutral-700 rounded-full h-1">
                      <div
                        className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                        style={{ width: `${asset.uploadProgress}%` }}
                      />
                    </div>
                  )}

                  {/* Error Message */}
                  {asset.uploadStatus === 'failed' && asset.uploadError && (
                    <p className="text-red-400 text-xs mt-1">
                      {asset.uploadError}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {asset.uploadStatus === 'failed' && (
                    <button
                      onClick={() => retryUpload(asset.id)}
                      className="text-blue-400 hover:text-blue-300 text-xs"
                    >
                      {t('action.retry')}
                    </button>
                  )}
                  
                  <button
                    onClick={() => removeAsset(asset.id)}
                    className="text-neutral-400 hover:text-red-400 transition-colors"
                    disabled={asset.uploadStatus === 'uploading'}
                  >
                    <XMarkIcon className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}