// Mock API endpoint for requesting signed upload URLs
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(`[SIGNED UPLOAD] ${req.method} request`);
  console.log(`[SIGNED UPLOAD] Body:`, req.body);

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { filename, contentType, size } = req.body;
    const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;

    console.log(`[SIGNED UPLOAD] Request ID: ${requestId}`);
    console.log(`[SIGNED UPLOAD] File: ${filename}, Type: ${contentType}, Size: ${size}`);

    // Validate input
    if (!filename || !contentType || !size) {
      console.log(`[SIGNED UPLOAD] Missing required fields`);
      return res.status(400).json({
        message: 'Missing required fields: filename, contentType, size',
        requestId
      });
    }

    // Validate file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (size > maxSize) {
      console.log(`[SIGNED UPLOAD] File too large: ${size} bytes`);
      return res.status(400).json({
        message: 'File size exceeds 100MB limit',
        requestId
      });
    }

    // Validate content type
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/avi'
    ];

    if (!allowedTypes.includes(contentType)) {
      console.log(`[SIGNED UPLOAD] Unsupported file type: ${contentType}`);
      return res.status(400).json({
        message: 'Unsupported file type',
        requestId
      });
    }

    // Generate mock asset ID
    const assetId = `asset-${Date.now()}-${Math.random().toString(36).substring(2)}`;

    // Mock signed upload response
    // In production, this would generate a real signed URL to cloud storage
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000');
    
    const uploadUrl = `${baseUrl}/api/assets/mock-upload/${assetId}`;
    
    const response = {
      uploadUrl,
      assetId,
      fields: {
        'Content-Type': contentType,
        'x-amz-meta-filename': filename,
        'x-amz-meta-size': size.toString()
      }
    };

    console.log(`[SIGNED UPLOAD] Generated upload URL: ${uploadUrl}`);
    console.log(`[SIGNED UPLOAD] Asset ID: ${assetId}`);

    // Simulate network delay
    setTimeout(() => {
      res.status(200).json(response);
    }, 100);

  } catch (error) {
    console.error('[SIGNED UPLOAD] Error:', error);
    const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
    res.status(500).json({
      message: 'Internal server error',
      requestId
    });
  }
}