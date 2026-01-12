import type { NextApiRequest, NextApiResponse } from "next";

// Mock auth endpoints for development
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;
  
  if (method === "POST" && req.url?.includes("/login")) {
    // Mock login
    return res.status(200).json({
      access_token: "mock-jwt-token-12345",
      user: {
        id: "mock-user-id",
        email: "dev@example.com",
        name: "Dev User"
      }
    });
  }
  
  if (method === "GET" && req.url?.includes("/me")) {
    // Mock user info
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    return res.status(200).json({
      id: "mock-user-id",
      email: "dev@example.com", 
      name: "Dev User",
      createdAt: new Date().toISOString()
    });
  }
  
  res.status(404).json({ error: "Not found" });
}