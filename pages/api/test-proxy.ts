import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const apiBase = process.env.NEXT_PUBLIC_API_VIDEO;
  
  res.json({
    message: "Proxy test endpoint",
    method: req.method,
    apiBase,
    nodeEnv: process.env.NODE_ENV,
    headers: req.headers,
    body: req.body,
  });
}