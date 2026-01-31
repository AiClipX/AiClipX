// Mock API endpoint for confirming asset upload completion
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(`[CONFIRM UPLOAD] ${req.method} request for asset: ${req.query.assetId}`);

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { assetId } = req.query;
    const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;

    console.log(`[CONFIRM UPLOAD] Request ID: ${requestId}`);

    if (!assetId || typeof assetId !== 'string') {
      console.log(`[CONFIRM UPLOAD] Invalid asset ID: ${assetId}`);
      return res.status(400).json({
        message: 'Invalid asset ID',
        requestId
      });
    }

    // Mock asset record
    const asset = {
      id: assetId,
      filename: `mock-file-${Date.now()}.jpg`,
      originalName: 'uploaded-file.jpg',
      size: Math.floor(Math.random() * 10000000) + 1000000, // 1MB to 10MB
      type: 'image/jpeg',
      url: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/assets/${assetId}/download`,
      thumbnailUrl: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/assets/${assetId}/thumbnail`,
      status: 'completed' as const,
      progress: 100,
      createdAt: new Date().toISOString()
    };

    console.log(`[CONFIRM UPLOAD] Confirming asset: ${assetId}`);

    // Simulate processing delay
    setTimeout(() => {
      console.log(`[CONFIRM UPLOAD] Asset confirmed: ${assetId}`);
      res.status(200).json(asset);
    }, 200);

  } catch (error) {
    console.error('[CONFIRM UPLOAD] Error:', error);
    const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
    res.status(500).json({
      message: 'Internal server error',
      requestId
    });
  }
}