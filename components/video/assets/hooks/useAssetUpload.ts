import { useState, useCallback } from 'react';
import { assetService, Asset } from '../../services/assetService';
import { AssetFile } from '../AssetUpload';
import { showToast } from '../../../common/Toast';
import { useLanguage } from '../../../../contexts/LanguageContext';

export function useAssetUpload() {
  const { t } = useLanguage();
  const [isUploading, setIsUploading] = useState(false);

  const uploadSingleAsset = useCallback(async (
    assetFile: AssetFile,
    onProgress: (assetId: string, progress: number) => void,
    onComplete: (assetId: string, assetRecord: Asset) => void,
    onError: (assetId: string, error: string) => void
  ) => {
    try {
      const assetRecord = await assetService.uploadAsset(
        assetFile.file,
        (progress) => onProgress(assetFile.id, progress)
      );
      
      onComplete(assetFile.id, assetRecord);
      showToast(t('assets.success.uploaded'), 'success', 2000);
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || error?.message || t('assets.error.uploadFailed');
      onError(assetFile.id, errorMessage);
      showToast(`${assetFile.name}: ${errorMessage}`, 'error', 5000);
    }
  }, [t]);

  const uploadAssets = useCallback(async (
    assets: AssetFile[],
    onProgress: (assetId: string, progress: number) => void,
    onComplete: (assetId: string, assetRecord: Asset) => void,
    onError: (assetId: string, error: string) => void
  ) => {
    setIsUploading(true);
    
    try {
      // Upload assets in parallel with concurrency limit
      const CONCURRENT_UPLOADS = 3;
      const pendingAssets = assets.filter(asset => asset.uploadStatus === 'pending');
      
      for (let i = 0; i < pendingAssets.length; i += CONCURRENT_UPLOADS) {
        const batch = pendingAssets.slice(i, i + CONCURRENT_UPLOADS);
        
        await Promise.allSettled(
          batch.map(asset => 
            uploadSingleAsset(asset, onProgress, onComplete, onError)
          )
        );
      }
    } finally {
      setIsUploading(false);
    }
  }, [uploadSingleAsset]);

  return {
    uploadAssets,
    uploadSingleAsset,
    isUploading
  };
}