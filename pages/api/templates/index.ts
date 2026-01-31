import type { NextApiRequest, NextApiResponse } from 'next';
import { getFilteredTemplates } from '../../../components/video/templates/data/mockTemplates';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only GET requests are supported',
      requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
    });
  }

  try {
    const { q, tags, limit, offset } = req.query;
    
    // Parse query parameters
    const searchQuery = typeof q === 'string' ? q : undefined;
    const tagArray = typeof tags === 'string' ? tags.split(',').map(t => t.trim()) : undefined;
    const limitNum = typeof limit === 'string' ? parseInt(limit, 10) : undefined;
    const offsetNum = typeof offset === 'string' ? parseInt(offset, 10) : undefined;

    // Get filtered templates from mock data
    const result = getFilteredTemplates(searchQuery, tagArray, limitNum, offsetNum);

    // Add request metadata
    const response = {
      ...result,
      requestId: `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      timestamp: new Date().toISOString(),
      query: {
        q: searchQuery,
        tags: tagArray,
        limit: limitNum,
        offset: offsetNum
      }
    };

    // Set cache headers for templates (5 minutes)
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    
    res.status(200).json(response);
  } catch (error: any) {
    console.error('[Templates API] Error:', error);
    
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch templates',
      requestId,
      timestamp: new Date().toISOString()
    });
  }
}