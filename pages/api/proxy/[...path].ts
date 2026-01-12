import type { NextApiRequest, NextApiResponse } from "next";

// Simple proxy: forwards incoming requests to the external API base defined
// by NEXT_PUBLIC_API_VIDEO. It preserves method, headers (including
// Authorization), query and body.

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path = [] } = req.query as { path: string[] };

  const apiBase = process.env.NEXT_PUBLIC_API_VIDEO;
  if (!apiBase) {
    return res.status(500).json({ error: "NEXT_PUBLIC_API_VIDEO not configured" });
  }

  // Rebuild target URL with query string preserved
  const targetPath = path.join("/");
  const query = req.url && req.url.includes("?") ? req.url.substring(req.url.indexOf("?")) : "";
  const url = `${apiBase}/${targetPath}${query}`;

  try {
    const forwardHeaders: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (!v || typeof v !== "string") continue;
      // Skip host header - set by fetch
      if (k.toLowerCase() === "host") continue;
      // Forward important headers
      if (["authorization", "content-type", "x-request-id", "idempotency-key"].includes(k.toLowerCase())) {
        forwardHeaders[k] = v;
      }
    }

    // Prepare request body
    let body: string | undefined = undefined;
    if (!["GET", "HEAD"].includes((req.method || "GET").toUpperCase())) {
      if (req.body) {
        // If body is already a string, use it directly
        // If it's an object, stringify it
        body = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
      }
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers: {
        ...forwardHeaders,
        // Always set Content-Type for POST/PUT/PATCH with body
        ...(body && {
          "Content-Type": "application/json",
        }),
      },
      body,
    };

    console.log(`[PROXY] ${req.method} ${url}`);
    console.log(`[PROXY] Request Headers:`, fetchOptions.headers);
    console.log(`[PROXY] Request Body:`, body);
    
    const r = await fetch(url, fetchOptions);
    
    console.log(`[PROXY] Response Status:`, r.status);
    console.log(`[PROXY] Response Headers:`, Object.fromEntries(r.headers.entries()));

    res.status(r.status);

    // Only forward a minimal set of safe response headers to avoid
    // double-compression or encoding mismatches in the browser (ERR_CONTENT_DECODING_FAILED).
    const contentType = r.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);

    const buffer = await r.arrayBuffer();
    const responseText = new TextDecoder().decode(buffer);
    console.log(`[PROXY] Response Body:`, responseText);
    
    res.send(Buffer.from(buffer));
  } catch (err: any) {
    console.error(`[PROXY ERROR] ${req.method} ${url}:`, err);
    res.status(502).json({ error: "Bad gateway", details: String(err?.message || err) });
  }
}
