import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import axios from "../lib/apiClient";
import { MOCK_MODE, setMockAuth, clearMockAuth } from "../lib/mockAuth";

export default function AuthDebug() {
  const { user, token, logout, refreshMe } = useAuth();
  const [lastStatus, setLastStatus] = useState<number | null>(null);
  const [me, setMe] = useState<any>(null);
  const [lastApi, setLastApi] = useState<any>(null);

  useEffect(() => {
    async function fetchMe() {
      try {
        const res = await axios.get(`/api/auth/me`);
        setLastStatus(res.status);
        setMe(res.data);
      } catch (err: any) {
        setLastStatus(err?.response?.status || null);
        setMe(null);
      }
    }
    if (token) fetchMe();
  }, [token]);

  async function fetchVideos() {
    try {
      const res = await axios.get(`/api/video-tasks`);
      setLastApi({ method: 'GET', path: '/api/video-tasks', status: res.status, body: res.data });
    } catch (err: any) {
      setLastApi({ method: 'GET', path: '/api/video-tasks', status: err?.response?.status || null, body: err?.response?.data || err.message });
    }
  }

  async function testCreateVideo() {
    try {
      const payload = {
        title: "Test Video",
        prompt: "A beautiful sunset over the ocean",
        engine: "runway",
        params: {
          durationSec: 5,
          ratio: "16:9"
        }
      };

      console.log("Testing create video with payload:", payload);
      
      const res = await axios.post("/api/test-create", payload);
      console.log("Test response:", res.data);
      setLastApi({ method: 'POST', path: '/api/test-create', status: res.status, body: res.data });
    } catch (err: any) {
      console.error("Test create failed:", err);
      setLastApi({ method: 'POST', path: '/api/test-create', status: err?.response?.status || null, body: err?.response?.data || err.message });
    }
  }

  return (
    <div className="p-2 border rounded bg-white text-sm">
      <div className="font-semibold">Auth Debug</div>
      <div>Token: {token ? (token === "mock-token" ? "mock" : "present") : "none"}</div>
      <div>User: {user?.email || user?.id || "-"}</div>
      <div>GET /api/auth/me status: {lastStatus ?? "-"}</div>
      
      {/* Mock Controls */}
      {MOCK_MODE && (
        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
          <div className="font-semibold text-yellow-800">Mock Controls</div>
          <div className="space-x-2 mt-1">
            <button
              onClick={() => setMockAuth()}
              className="px-2 py-1 border rounded bg-yellow-100 text-yellow-700 text-xs"
            >
              Set Mock Token
            </button>
            <button
              onClick={() => clearMockAuth()}
              className="px-2 py-1 border rounded bg-yellow-100 text-yellow-700 text-xs"
            >
              Clear Mock
            </button>
          </div>
        </div>
      )}

      <div className="space-x-2 mt-2">
        <button
          onClick={() => refreshMe()}
          className="px-2 py-1 border rounded bg-gray-50"
        >
          Refresh Me
        </button>
        <button
          onClick={() => logout()}
          className="px-2 py-1 border rounded bg-red-50 text-red-600"
        >
          Logout
        </button>
        <button
          onClick={() => fetchVideos()}
          className="px-2 py-1 border rounded bg-green-50 text-green-600"
        >
          GET /api/video-tasks
        </button>
        <button
          onClick={() => testCreateVideo()}
          className="px-2 py-1 border rounded bg-purple-50 text-purple-600"
        >
          Test Create Video
        </button>
      </div>
      <pre className="mt-2 text-xs">{me ? JSON.stringify(me, null, 2) : "no body"}</pre>
      <div className="mt-2">
        <div className="font-semibold">Last API</div>
        <pre className="text-xs">{lastApi ? JSON.stringify(lastApi, null, 2) : 'no calls yet'}</pre>
      </div>
    </div>
  );
}
