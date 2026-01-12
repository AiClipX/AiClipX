import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

export default function ExactAPITest() {
  const { token } = useAuth();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testExactPayload = async () => {
    if (!token) {
      setResult({ error: "No token available" });
      return;
    }

    setLoading(true);
    
    // EXACT payload from your message
    const payload = {
      "title": "123",
      "prompt": "123123123",
      "engine": "mock",
      "params": {
        "durationSec": 5,
        "ratio": "16:9"
      }
    };

    try {
      console.log("🔍 NETWORK DEBUG - Check DevTools Network Tab!");
      console.log("📋 Payload:", payload);
      console.log("📋 Stringified:", JSON.stringify(payload));

      const apiBase = process.env.NEXT_PUBLIC_API_VIDEO;
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log("📤 Making request to:", `${apiBase}/api/video-tasks`);

      const response = await fetch(`${apiBase}/api/video-tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-Request-Id": requestId,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      console.log("📥 Response Status:", response.status);
      console.log("📥 Response Body:", responseText);

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
        payload,
        note: "Check DevTools Network tab for Request Payload details"
      });

    } catch (error: any) {
      console.error("❌ Request failed:", error);
      setResult({
        success: false,
        error: error.message,
        stack: error.stack,
      });
    } finally {
      setLoading(false);
    }
  };

  const testMinimalPayload = async () => {
    if (!token) {
      setResult({ error: "No token available" });
      return;
    }

    setLoading(true);
    
    // Minimal payload
    const payload = {
      "title": "Minimal Test Video",
      "prompt": "A simple test",
      "engine": "mock"
    };

    try {
      console.log("=== MINIMAL PAYLOAD TEST ===");
      console.log("Payload:", payload);

      const apiBase = process.env.NEXT_PUBLIC_API_VIDEO;
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const response = await fetch(`${apiBase}/api/video-tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-Request-Id": requestId,
          "Idempotency-Key": `minimal_test_${Date.now()}`,
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      console.log("=== RESPONSE ===");
      console.log("Status:", response.status);
      console.log("Body:", responseText);

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
        rawBody: responseText,
        requestId,
        payload,
        type: "minimal"
      });

    } catch (error: any) {
      console.error("Minimal API test failed:", error);
      setResult({
        success: false,
        error: error.message,
        type: "minimal"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded bg-white">
      <h3 className="font-bold mb-2">🔍 Network Debug Test</h3>
      
      <div className="text-sm bg-yellow-100 p-2 rounded mb-3">
        <strong>📋 Instructions:</strong> Open DevTools → Network tab, then click test button and screenshot the Request Payload
      </div>
      
      <div className="mb-2 text-sm">
        <div>Token: {token ? "✅ Available" : "❌ Missing"}</div>
        <div>API Base: {process.env.NEXT_PUBLIC_API_VIDEO}</div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={testExactPayload}
          disabled={loading || !token}
          className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-50 text-sm"
        >
          {loading ? "Testing..." : "🔍 Test (Check Network Tab!)"}
        </button>
        
        <button
          onClick={testMinimalPayload}
          disabled={loading || !token}
          className="px-3 py-1 bg-orange-600 text-white rounded disabled:opacity-50 text-sm"
        >
          {loading ? "Testing..." : "Test Minimal"}
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