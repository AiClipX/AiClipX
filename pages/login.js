import React, { useState } from "react";
import { useRouter } from "next/router";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("test.stg9.staging.1768316110@test.com");
  const [password, setPassword] = useState("TestStg9.Pass123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const auth = useAuth();
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_VIDEO || "";
      const url = `${apiBase}/api/auth/signin`;
      
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Login failed (${response.status})`);
      }

      const data = await response.json();
      const token = data.access_token || data.token;

      if (!token) {
        throw new Error("No token returned from server");
      }

      localStorage.setItem("aiclipx_token", token);
      await auth.login(token);
      router.push('/dashboard/test-video-list');
    } catch (err) {
      console.error("Login error:", err);
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-900">
      <div className="w-full max-w-md p-8 bg-neutral-800 rounded-lg shadow-xl">
        <h1 className="text-2xl font-bold mb-6 text-white">Sign In</h1>
        
        <form onSubmit={handleSubmit}>
          <label className="block mb-4">
            <div className="text-sm text-neutral-300 mb-1">Email</div>
            <input
              className="w-full border border-neutral-700 bg-neutral-900 text-white p-2 rounded focus:border-blue-500 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
            />
          </label>
          
          <label className="block mb-4">
            <div className="text-sm text-neutral-300 mb-1">Password</div>
            <input
              className="w-full border border-neutral-700 bg-neutral-900 text-white p-2 rounded focus:border-blue-500 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
            />
          </label>
          
          {error && (
            <div className="text-red-400 mb-4 p-3 bg-red-900/30 rounded border border-red-700 text-sm">
              {error}
            </div>
          )}
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-3 rounded hover:bg-blue-500 disabled:opacity-50 font-semibold"
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="mt-4 p-3 bg-blue-900/30 rounded border border-blue-700 text-xs text-blue-300">
          <div className="font-semibold mb-1">Staging Test Account</div>
          <div>Email: test.stg9.staging.1768316110@test.com</div>
          <div>Password: TestStg9.Pass123</div>
        </div>
      </div>
    </div>
  );
}
