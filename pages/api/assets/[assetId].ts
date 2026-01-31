import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { assetId } = req.query;
  const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;

  if (!assetId || typeof assetId !== 'string') {
    return res.status(400).json({ 
      message: 'Invalid asset ID',
      requestId 
    });
  }

  try {
    if (req.method === 'GET') {
      // Get asset by ID
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

      res.status(200).json(asset);
    } else if (req.method === 'DELETE') {
      // Delete asset
      console.log(`[MOCK] Deleted asset ${assetId}`);
      res.status(204).end();
    } else {
      res.status(405).json({ message: 'Method not allowed' });
    }
  } catch (error: any) {
    console.error('[ASSET ERROR]', error);
    res.status(500).json({ 
      message: 'Asset operation failed',
      requestId,
      error: error.message 
    });
  }
}