// Mock API endpoint for listing user assets
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { limit = '50', cursor } = req.query;
    const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;

    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        message: 'Invalid limit. Must be between 1 and 100.',
        requestId
      });
    }

    // Mock assets list
    const mockAssets = Array.from({ length: Math.min(limitNum, 10) }, (_, i) => ({
      id: `asset-${Date.now()}-${i}`,
      filename: `mock-file-${i + 1}.jpg`,
      originalName: `uploaded-file-${i + 1}.jpg`,
      size: Math.floor(Math.random() * 10000000) + 1000000, // 1MB to 10MB
      type: Math.random() > 0.5 ? 'image/jpeg' : 'video/mp4',
      url: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/assets/asset-${Date.now()}-${i}/download`,
      thumbnailUrl: `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000'}/api/assets/asset-${Date.now()}-${i}/thumbnail`,
      status: 'completed' as const,
      progress: 100,
      createdAt: new Date(Date.now() - i * 60000).toISOString() // Stagger creation times
    }));

    const response = {
      assets: mockAssets,
      nextCursor: mockAssets.length === limitNum ? `cursor-${Date.now()}` : undefined
    };

    // Simulate network delay
    setTimeout(() => {
      res.status(200).json(response);
    }, 100);

  } catch (error) {
    console.error('Error in assets list API:', error);
    const requestId = req.headers['x-request-id'] || `req-${Date.now()}`;
    res.status(500).json({
      message: 'Internal server error',
      requestId
    });
  }
}