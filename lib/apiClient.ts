import axios from "axios";
import { createClient } from "@supabase/supabase-js";

// Use proxy in development to avoid CORS, direct API in production
const API_BASE = process.env.NODE_ENV === "development" 
  ? "/api/proxy" 
  : process.env.NEXT_PUBLIC_API_VIDEO || "";

const axiosInstance = axios.create({ baseURL: API_BASE });

// Initialize Supabase client if env vars present
let supabase: ReturnType<typeof createClient> | null = null;
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

async function getAuthToken(): Promise<string | null> {
  try {
    // Prefer localStorage-stored token (FE login flow). Fall back to Supabase session if present.
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("aiclipx_token");
      if (stored) return stored;
    }

    if (!supabase) return null;
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token ?? null;
  } catch (err) {
    console.warn("getAuthToken error", err);
    return null;
  }
}

// Attach auth header when available
axiosInstance.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  // Use a typed-safe approach: mutate headers via cast to any to satisfy Axios typings.
  const headers = (config.headers || {}) as Record<string, any>;
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Ensure JSON Content-Type for POST/PUT/PATCH
  if (
    config.method &&
    ["post", "put", "patch"].includes(config.method.toLowerCase())
  ) {
    headers["Content-Type"] = "application/json";
  }

  config.headers = headers as any;
  return config;
});

// Response interceptor: handle 401 by clearing token and redirecting to /login
axiosInstance.interceptors.response.use(
  (resp) => resp,
  (error) => {
    try {
      const status = error?.response?.status;
      if (status === 401) {
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("aiclipx_token");
          // Force a client-side navigation to the login page
          window.location.href = "/login";
        }
      }
    } catch (e) {
      // ignore
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;

export { getAuthToken };
