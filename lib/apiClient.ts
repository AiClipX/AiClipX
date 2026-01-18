import axios from "axios";
import { createClient } from "@supabase/supabase-js";
import { config, safeLog } from "./config";
import { handleAuthError, isAuthError, generateRequestId } from "./authErrorHandler";
import { apiCallTracker, extractRequestId, formatEndpoint } from "./apiCallTracker";

// Use centralized config for API base URL
const API_BASE = config.isDevelopment 
  ? "/api/proxy" 
  : config.apiBaseUrl;

// Safe logging of API configuration (no secrets)
safeLog("API Client initialized", { 
  environment: config.environment, 
  apiBase: API_BASE,
  isDevelopment: config.isDevelopment 
});

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
    // Safe logging - no token details
    safeLog("getAuthToken error (no sensitive data)", { hasError: !!err });
    return null;
  }
}

// Attach auth header and requestId when available
axiosInstance.interceptors.request.use(async (config) => {
  const token = await getAuthToken();
  const headers = (config.headers || {}) as Record<string, any>;
  
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Add requestId to all requests
  if (!headers["X-Request-Id"]) {
    headers["X-Request-Id"] = generateRequestId();
  }

  // Ensure JSON Content-Type for POST/PUT/PATCH
  if (
    config.method &&
    ["post", "put", "patch"].includes(config.method.toLowerCase())
  ) {
    headers["Content-Type"] = "application/json";
  }

  config.headers = headers as any;
  
  // Track request start
  (config as any).__startTime = Date.now();
  
  return config;
});

// Response interceptor: handle 401/403 consistently and track calls
axiosInstance.interceptors.response.use(
  (resp) => {
    // Track successful call
    const duration = (resp.config as any).__startTime 
      ? Date.now() - (resp.config as any).__startTime 
      : undefined;
    
    apiCallTracker.addCall({
      method: (resp.config.method || 'GET').toUpperCase(),
      endpoint: resp.config.url || '',
      status: resp.status,
      requestId: extractRequestId(resp),
      duration,
    });
    
    return resp;
  },
  (error) => {
    // Track failed call
    const duration = (error.config as any)?.__startTime 
      ? Date.now() - (error.config as any).__startTime 
      : undefined;
    
    apiCallTracker.addCall({
      method: (error.config?.method || 'GET').toUpperCase(),
      endpoint: error.config?.url || '',
      status: error.response?.status || null,
      requestId: error.config?.headers?.["X-Request-Id"] || extractRequestId(error.response),
      duration,
      error: error.message,
    });
    
    try {
      const status = error?.response?.status;
      
      // Handle auth errors (401/403) consistently
      if (status === 401 || status === 403) {
        handleAuthError({
          status: status as 401 | 403,
          message: error?.response?.data?.message || "Authentication failed",
          requestId: error?.config?.headers?.["X-Request-Id"]
        });
      }
    } catch (e) {
      safeLog("Error in response interceptor", { hasError: !!e });
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;

export { getAuthToken };
