// Asset upload service with signed URL flow
import axios from 'axios';
import { handleError } from '../../../lib/globalErrorHandler';
import { generateRequestId } from '../../../lib/authErrorHandler';

export interface Asset {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  type: string;
  url?: string;
  thumbnailUrl?: string;
  status: 'uploading' | 'completed' | 'failed' | 'pending';
  progress: number;
  error?: string;
  requestId?: string;
  createdAt: string;
}

export interface SignedUploadResponse {
  uploadUrl: string;
  assetId: string;
  fields?: Record<string, string>;
}

export interface UploadProgressCallback {
  (progress: number): void;
}

class AssetService {
  // Request signed upload URL from backend
  async requestSignedUpload(
    filename: string,
    fileType: string,
    fileSize: number
  ): Promise<SignedUploadResponse> {
    const requestId = generateRequestId();
    
    console.log(`[ASSET SERVICE] Requesting signed upload for: ${filename}`);
    console.log(`[ASSET SERVICE] File type: ${fileType}, Size: ${fileSize}`);
    
    try {
      const response = await axios.post('/api/assets/signed-upload', {
        filename,
        contentType: fileType,
        size: fileSize,
      }, {
        headers: {
          'X-Request-Id': requestId,
        },
      });

      console.log(`[ASSET SERVICE] Signed upload response:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`[ASSET SERVICE] Signed upload error:`, error);
      const errorInfo = handleError(error, 'AssetService.requestSignedUpload');
      throw new Error(errorInfo.message);
    }
  }

  // Upload file to signed URL
  async uploadToSignedUrl(
    file: File,
    signedUploadData: SignedUploadResponse,
    onProgress?: UploadProgressCallback
  ): Promise<void> {
    console.log(`[ASSET SERVICE] Uploading to signed URL: ${signedUploadData.uploadUrl}`);
    console.log(`[ASSET SERVICE] Asset ID: ${signedUploadData.assetId}`);
    
    try {
      const formData = new FormData();
      
      // Add any required fields from signed URL response
      if (signedUploadData.fields) {
        Object.entries(signedUploadData.fields).forEach(([key, value]) => {
          formData.append(key, value);
        });
      }
      
      // Add the file last (required by some storage providers)
      formData.append('file', file);

      console.log(`[ASSET SERVICE] FormData prepared, making PUT request`);

      await axios.put(signedUploadData.uploadUrl, formData, {
        headers: {
          // Don't set Content-Type, let browser set it with boundary for multipart/form-data
        },
        onUploadProgress: (progressEvent) => {
          if (onProgress && progressEvent.total) {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            console.log(`[ASSET SERVICE] Upload progress: ${progress}%`);
            onProgress(progress);
          }
        },
      });

      console.log(`[ASSET SERVICE] Upload completed successfully`);
    } catch (error: any) {
      console.error(`[ASSET SERVICE] Upload error:`, error);
      const errorInfo = handleError(error, 'AssetService.uploadToSignedUrl');
      throw new Error(errorInfo.message);
    }
  }

  // Confirm upload completion with backend
  async confirmUpload(assetId: string): Promise<Asset> {
    const requestId = generateRequestId();
    
    console.log(`[ASSET SERVICE] Confirming upload for asset: ${assetId}`);
    
    try {
      const response = await axios.post(`/api/assets/${assetId}/confirm`, {}, {
        headers: {
          'X-Request-Id': requestId,
        },
      });

      console.log(`[ASSET SERVICE] Confirm response:`, response.data);
      return response.data;
    } catch (error: any) {
      console.error(`[ASSET SERVICE] Confirm error:`, error);
      const errorInfo = handleError(error, 'AssetService.confirmUpload');
      throw new Error(errorInfo.message);
    }
  }

  // Complete upload flow: request signed URL, upload file, confirm
  async uploadAsset(
    file: File,
    onProgress?: UploadProgressCallback
  ): Promise<Asset> {
    try {
      // Step 1: Request signed upload URL
      const signedUploadData = await this.requestSignedUpload(
        file.name,
        file.type,
        file.size
      );

      // Step 2: Upload file to signed URL
      await this.uploadToSignedUrl(file, signedUploadData, onProgress);

      // Step 3: Confirm upload with backend
      const asset = await this.confirmUpload(signedUploadData.assetId);

      return asset;
    } catch (error: any) {
      throw error; // Re-throw to be handled by component
    }
  }

  // Get asset by ID
  async getAsset(assetId: string): Promise<Asset> {
    const requestId = generateRequestId();
    
    try {
      const response = await axios.get(`/api/assets/${assetId}`, {
        headers: {
          'X-Request-Id': requestId,
        },
      });

      return response.data;
    } catch (error: any) {
      const errorInfo = handleError(error, 'AssetService.getAsset');
      throw new Error(errorInfo.message);
    }
  }

  // Delete asset
  async deleteAsset(assetId: string): Promise<void> {
    const requestId = generateRequestId();
    
    try {
      await axios.delete(`/api/assets/${assetId}`, {
        headers: {
          'X-Request-Id': requestId,
        },
      });
    } catch (error: any) {
      const errorInfo = handleError(error, 'AssetService.deleteAsset');
      throw new Error(errorInfo.message);
    }
  }

  // List user's assets
  async listAssets(limit = 50, cursor?: string): Promise<{
    assets: Asset[];
    nextCursor?: string;
  }> {
    const requestId = generateRequestId();
    
    try {
      const params = new URLSearchParams({ limit: limit.toString() });
      if (cursor) params.append('cursor', cursor);

      const response = await axios.get(`/api/assets?${params}`, {
        headers: {
          'X-Request-Id': requestId,
        },
      });

      return response.data;
    } catch (error: any) {
      const errorInfo = handleError(error, 'AssetService.listAssets');
      throw new Error(errorInfo.message);
    }
  }

  // Validate file before upload
  validateFile(file: File): { valid: boolean; error?: string } {
    const maxSize = 100 * 1024 * 1024; // 100MB
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/avi',
    ];

    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`,
      };
    }

    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'File type not supported. Please use images (JPEG, PNG, GIF, WebP) or videos (MP4, WebM, MOV, AVI)',
      };
    }

    return { valid: true };
  }

  // Generate thumbnail for preview
  generateThumbnail(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      if (file.type.startsWith('image/')) {
        // For images, create a thumbnail
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Calculate thumbnail size (max 200x200, maintain aspect ratio)
            const maxSize = 200;
            let { width, height } = img;
            
            if (width > height) {
              if (width > maxSize) {
                height = (height * maxSize) / width;
                width = maxSize;
              }
            } else {
              if (height > maxSize) {
                width = (width * maxSize) / height;
                height = maxSize;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            ctx?.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
          };
          img.onerror = reject;
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      } else if (file.type.startsWith('video/')) {
        // For videos, create a video thumbnail
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          video.currentTime = Math.min(1, video.duration / 4); // Seek to 25% or 1 second
        };
        video.onseeked = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          canvas.width = Math.min(200, video.videoWidth);
          canvas.height = Math.min(200, video.videoHeight);
          
          ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.8));
        };
        video.onerror = reject;
        video.src = URL.createObjectURL(file);
      } else {
        reject(new Error('Unsupported file type for thumbnail generation'));
      }
    });
  }
}

export const assetService = new AssetService();