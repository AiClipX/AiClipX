import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { path = [] } = req.query as { path: string[] };
    const apiBase = process.env.NEXT_PUBLIC_API_VIDEO;
    
    if (!apiBase) {
      return res.status(500).json({ error: "NEXT_PUBLIC_API_VIDEO not configured" });
    }

    const targetPath = path.join("/");
    const query = req.url && req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
    const url = `${apiBase}/${targetPath}${query}`;

    console.log(`[PROXY] ${req.method} ${url}`);

    // Build headers
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };

    if (req.headers.authorization) {
      headers['authorization'] = req.headers.authorization as string;
    }
    if (req.headers['x-request-id']) {
      headers['x-request-id'] = req.headers['x-request-id'] as string;
    }
    if (req.headers['idempotency-key']) {
      headers['idempotency-key'] = req.headers['idempotency-key'] as string;
    }

    console.log('[PROXY] Headers:', headers);

    // Build fetch options
    const options: RequestInit = {
      method: req.method,
      headers,
    };

    // Add body for POST/PUT/PATCH
    if (req.method && ['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      options.body = JSON.stringify(req.body);
      console.log('[PROXY] Body:', options.body);
    }

    // Make request
    const response = await fetch(url, options);
    console.log('[PROXY] Response status:', response.status);
    
    const data = await response.text();
    console.log('[PROXY] Response data:', data);

    // Forward response
    res.status(response.status);
    const contentType = response.headers.get('content-type');
    if (contentType) {
      res.setHeader('content-type', contentType);
    }
    res.send(data);

  } catch (error: any) {
    console.error('[PROXY ERROR]', error);
    res.status(500).json({ error: 'Proxy error', message: error.message });
  }
}
