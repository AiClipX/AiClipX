// Mock API endpoint for capabilities
import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Mock capabilities - in production this would come from your backend
    const capabilities = {
      authRequired: true,
      engineRunwayEnabled: false, // Test disabled state
      signedUrlEnabled: false, // Test disabled state  
      cancelEnabled: true,
      publishEnabled: true,
      version: '1.0.0',
      buildId: process.env.NEXT_PUBLIC_BUILD_ID || `dev-${Date.now()}`,
    };

    // Simulate network delay (reduced for faster loading)
    setTimeout(() => {
      res.status(200).json(capabilities);
    }, 50);
  } catch (error) {
    console.error('Error in capabilities API:', error);
    res.status(500).json({ 
      message: 'Internal server error',
      requestId: `cap-${Date.now()}`
    });
  }
}