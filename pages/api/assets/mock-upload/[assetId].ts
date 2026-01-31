// Mock API endpoint for simulating file upload to signed URL
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(`[MOCK UPLOAD] ${req.method} request to ${req.url}`);
  console.log(`[MOCK UPLOAD] Asset ID: ${req.query.assetId}`);

  if (req.method !== 'PUT') {
    console.log(`[MOCK UPLOAD] Method not allowed: ${req.method}`);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { assetId } = req.query;

    if (!assetId || typeof assetId !== 'string') {
      console.log(`[MOCK UPLOAD] Invalid asset ID: ${assetId}`);
      return res.status(400).json({ message: 'Invalid asset ID' });
    }

    console.log(`[MOCK UPLOAD] Processing upload for asset: ${assetId}`);

    // Simulate upload processing time
    const uploadDelay = Math.random() * 1000 + 200; // 200ms to 1.2s

    setTimeout(() => {
      console.log(`[MOCK UPLOAD] Upload completed for asset: ${assetId}`);
      // Mock successful upload
      res.status(200).json({
        message: 'Upload successful',
        assetId
      });
    }, uploadDelay);

  } catch (error) {
    console.error('[MOCK UPLOAD] Error:', error);
    res.status(500).json({
      message: 'Upload failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Increase body size limit for file uploads and disable body parser for raw file data
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};