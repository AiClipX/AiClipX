import React, { useState } from "react";
import axios from "../lib/apiClient";
import { useRouter } from "next/router";
import { useAuth } from "../contexts/AuthContext";
import { MOCK_MODE, setMockAuth } from "../lib/mockAuth";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const auth = useAuth();

  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // POST credentials to /api/auth/me (your request) which returns user and token
      const res = await axios.post(`/api/auth/me`, { email, password });

      // Try to obtain token from response body or Authorization header
      const body = res?.data || {};
      let token = body?.access_token || body?.token || body?.accessToken;
      if (!token) {
        const hdr = res?.headers?.authorization || res?.headers?.Authorization;
        if (hdr && typeof hdr === 'string') {
          const parts = hdr.split(" ");
          if (parts.length === 2) token = parts[1];
        }
      }

      if (!token) {
        throw new Error("No token returned from /api/auth/me");
      }

      await auth.login(token);
      // Navigate to test page for verification
      router.push('/dashboard/test-video-list');
    } catch (err) {
      console.error(err);
      setError(err?.response?.data?.message || err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  // Mock login for development
  async function handleMockLogin() {
    try {
      setLoading(true);
      setMockAuth();
      // Simulate successful login
      await auth.login("mock-token");
      router.push('/dashboard/test-video-list');
    } catch (err) {
      console.error("Mock login failed:", err);
      setError("Mock login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded shadow">
        <h1 className="text-2xl font-bold mb-4">Login</h1>
        
        {/* Development Mock Login */}
        {MOCK_MODE && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <h3 className="text-sm font-semibold text-yellow-800 mb-2">Development Mode</h3>
            <button
              onClick={handleMockLogin}
              className="w-full bg-yellow-600 text-white p-2 rounded hover:bg-yellow-700"
              disabled={loading}
            >
              {loading ? "Logging in..." : "🔧 Mock Login (Dev Only)"}
            </button>
            <p className="text-xs text-yellow-600 mt-2">
              This bypasses real authentication for frontend testing
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label className="block mb-2">
            <div className="text-sm">Email</div>
            <input
              className="w-full border p-2 rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </label>
          <label className="block mb-4">
            <div className="text-sm">Password</div>
            <input
              className="w-full border p-2 rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </label>
          {error && <div className="text-red-600 mb-2">{error}</div>}
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-2 rounded"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
