import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log("=== TEST CREATE REQUEST ===");
  console.log("Method:", req.method);
  console.log("Headers:", req.headers);
  console.log("Body:", req.body);
  console.log("Body type:", typeof req.body);
  console.log("Body JSON:", JSON.stringify(req.body, null, 2));
  console.log("============================");

  // Test the exact same request to real API
  const apiBase = process.env.NEXT_PUBLIC_API_VIDEO;
  if (!apiBase) {
    return res.status(500).json({ error: "API base not configured" });
  }

  try {
    const response = await fetch(`${apiBase}/api/video-tasks`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": req.headers.authorization || "",
      },
      body: JSON.stringify(req.body),
    });

    const responseText = await response.text();
    console.log("=== API RESPONSE ===");
    console.log("Status:", response.status);
    console.log("Headers:", Object.fromEntries(response.headers.entries()));
    console.log("Body:", responseText);
    console.log("===================");

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseText);
    } catch {
      parsedResponse = responseText;
    }

    res.status(response.status).json({
      testRequest: {
        method: req.method,
        headers: req.headers,
        body: req.body,
        bodyType: typeof req.body,
        bodyStringified: JSON.stringify(req.body),
      },
      apiResponse: {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: parsedResponse,
        rawBody: responseText,
      }
    });
  } catch (error: any) {
    console.error("=== TEST API CALL FAILED ===");
    console.error("Error:", error);
    console.error("============================");
    
    res.status(500).json({ 
      error: "Test failed", 
      details: error.message,
      stack: error.stack 
    });
  }
}