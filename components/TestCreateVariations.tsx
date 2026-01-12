import { useState } from "react";
import axios from "../lib/apiClient";

export default function TestCreateVariations() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testVariations = async () => {
    setLoading(true);
    setResults([]);

    const variations = [
      // Variation 1: API Spec compliant - Mock engine
      {
        name: "API Spec - Mock",
        payload: {
          title: "Test Video Mock",
          prompt: "A beautiful sunset over the ocean",
          engine: "mock",
          params: {
            durationSec: 5,
            ratio: "16:9"
          }
        }
      },
      // Variation 2: API Spec compliant - Runway engine  
      {
        name: "API Spec - Runway",
        payload: {
          title: "Test Video Runway",
          prompt: "A beautiful sunset over the ocean",
          engine: "runway",
          params: {
            durationSec: 5,
            ratio: "16:9"
          }
        }
      },
      // Variation 3: Minimal - Mock (no params)
      {
        name: "Minimal - Mock",
        payload: {
          title: "Test Video Minimal",
          prompt: "A beautiful sunset",
          engine: "mock"
        }
      },
      // Variation 4: With source image
      {
        name: "With Source Image",
        payload: {
          title: "Test Video with Image",
          prompt: "A beautiful sunset",
          sourceImageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800",
          engine: "mock",
          params: {
            durationSec: 5,
            ratio: "16:9"
          }
        }
      },
      // Variation 5: Different ratios
      {
        name: "Portrait Ratio",
        payload: {
          title: "Test Video Portrait",
          prompt: "A beautiful sunset",
          engine: "mock",
          params: {
            durationSec: 3,
            ratio: "9:16"
          }
        }
      }
    ];

    for (const variation of variations) {
      try {
        console.log(`Testing ${variation.name}:`, variation.payload);
        const res = await axios.post("/api/video-tasks", variation.payload);
        setResults(prev => [...prev, {
          name: variation.name,
          success: true,
          status: res.status,
          data: res.data
        }]);
      } catch (error: any) {
        console.error(`${variation.name} failed:`, error);
        setResults(prev => [...prev, {
          name: variation.name,
          success: false,
          status: error?.response?.status,
          error: error?.response?.data || error.message
        }]);
      }
    }

    setLoading(false);
  };

  return (
    <div className="p-4 border rounded bg-white">
      <h3 className="font-bold mb-2">Test Create Video Variations</h3>
      
      <button
        onClick={testVariations}
        disabled={loading}
        className="px-4 py-2 bg-purple-600 text-white rounded disabled:opacity-50 mb-4"
      >
        {loading ? "Testing..." : "Test All Variations"}
      </button>

      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((result, index) => (
            <div key={index} className={`p-2 rounded text-xs ${
              result.success ? "bg-green-100" : "bg-red-100"
            }`}>
              <div className="font-semibold">
                {result.name}: {result.success ? "✅ SUCCESS" : "❌ FAILED"} ({result.status})
              </div>
              <pre className="mt-1 text-xs overflow-auto max-h-32">
                {JSON.stringify(result.success ? result.data : result.error, null, 2)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}