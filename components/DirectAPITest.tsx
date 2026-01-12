import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function DirectAPITest() {
  const { token } = useAuth();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testDirectAPI = async () => {
    if (!token) {
      setResult({ error: "No token available" });
      return;
    }

    setLoading(true);
    
    // Test payload matching API spec exactly
    const payload = {
      title: "Direct API Test",
      prompt: "Testing direct API call with proper format",
      engine: "mock",
      params: {
        durationSec: 5,
        ratio: "16:9"
      }
    };

    try {
      console.log("=== DIRECT API TEST ===");
      console.log("Token:", token);
      console.log("Payload:", payload);

      const apiBase = process.env.NEXT_PUBLIC_API_VIDEO;
      console.log("API Base:", apiBase);

      // Generate request ID for tracking
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const response = await fetch(`${apiBase}/api/video-tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-Request-Id": requestId,
          // Optional: Add idempotency key
          "Idempotency-Key": `create_${Date.now()}`,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      console.log("Response Status:", response.status);
      console.log("Response Headers:", Object.fromEntries(response.headers.entries()));
      console.log("Response Body:", responseText);

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch {
        parsedResponse = responseText;
      }

      setResult({
        success: response.ok,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: parsedResponse,
        rawBody: responseText,
        requestId,
      });

    } catch (error: any) {
      console.error("Direct API test failed:", error);
      setResult({
        success: false,
        error: error.message,
        stack: error.stack,
      });
    } finally {
      setLoading(false);
    }
  };

  const testHealthCheck = async () => {
    setLoading(true);
    
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_VIDEO;
      const response = await fetch(`${apiBase}/health`);
      const responseText = await response.text();
      
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch {
        parsedResponse = responseText;
      }

      setResult({
        success: response.ok,
        status: response.status,
        body: parsedResponse,
        type: "health_check"
      });

    } catch (error: any) {
      setResult({
        success: false,
        error: error.message,
        type: "health_check"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded bg-white">
      <h3 className="font-bold mb-2">Direct API Test (Bypass Proxy)</h3>
      
      <div className="mb-2 text-sm">
        <div>Token: {token ? "✅ Available" : "❌ Missing"}</div>
        <div>API Base: {process.env.NEXT_PUBLIC_API_VIDEO}</div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={testHealthCheck}
          disabled={loading}
          className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50 text-sm"
        >
          {loading ? "Testing..." : "Test Health"}
        </button>
        
        <button
          onClick={testDirectAPI}
          disabled={loading || !token}
          className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50 text-sm"
        >
          {loading ? "Testing..." : "Test Create Video"}
        </button>
      </div>

      {result && (
        <div className="mt-4">
          <h4 className="font-semibold">Result:</h4>
          <div className={`p-2 rounded text-xs ${
            result.success ? "bg-green-100" : "bg-red-100"
          }`}>
            <div className="font-semibold mb-2">
              {result.success ? "✅ SUCCESS" : "❌ FAILED"} 
              {result.status && ` (${result.status})`}
              {result.type && ` - ${result.type}`}
            </div>
            <pre className="overflow-auto max-h-96 whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}