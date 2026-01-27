import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "../lib/apiClient";
import { useRouter } from "next/router";
import { toastSuccess, toastWarning } from "../components/common/Toast";
import { t } from "../lib/i18n";

type User = {
  id?: string;
  email?: string;
  name?: string;
  [k: string]: any;
};

type AuthContextType = {
  token: string | null;
  user: User | null;
  login: (token: string) => Promise<void>;
  logout: () => void;
  refreshMe: () => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
  isValidating: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const router = useRouter();

  // Token presence check and validation on app load
  useEffect(() => {
    const initializeAuth = async () => {
      if (typeof window === "undefined") {
        setLoading(false);
        return;
      }

      const stored = window.localStorage.getItem("aiclipx_token");
      if (stored) {
        setToken(stored);
        setValidating(true);
        
        try {
          // Validate session by calling /api/auth/me
          await fetchMe(stored);
          // If successful, user state is already set by fetchMe
        } catch (err) {
          console.warn("Session validation failed:", err);
          // Invalid token - clear it but don't redirect here
          // Let _app.js handle the redirect logic
          clearAuthState();
        } finally {
          setValidating(false);
        }
      }
      
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Listen for token expiration events from API client
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleTokenExpired = (event: any) => {
      const error = event.detail;
      
      // Clear all auth state
      clearAuthState();
      
      // Don't show toast here - authErrorHandler already shows it
      // Just ensure state is cleared
    };

    window.addEventListener('auth:token-expired', handleTokenExpired);
    return () => window.removeEventListener('auth:token-expired', handleTokenExpired);
  }, []);

  function clearAuthState() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("aiclipx_token");
    }
    setToken(null);
    setUser(null);
  }

  async function fetchMe(tkn?: string) {
    try {
      // temporarily set Authorization header for this call
      const headers: Record<string, string> = {};
      if (tkn) headers["Authorization"] = `Bearer ${tkn}`;
      
      // Mock response for development
      if (tkn === "mock-token") {
        setUser({ id: "mock-user", email: "dev@example.com", name: "Dev User" });
        return;
      }
      
      const res = await axios.get(`/api/auth/me`, { headers });
      setUser(res.data);
    } catch (err) {
      setUser(null);
      throw err;
    }
  }

  async function login(tkn: string) {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("aiclipx_token", tkn);
    }
    setToken(tkn);
    setValidating(true); // Set validating immediately when login starts
    
    try {
      await fetchMe(tkn);
      toastSuccess(t('success.loginSuccess'));
      
      // Don't redirect here - let _app.js handle it to avoid double redirect
    } catch (err) {
      // If fetching user fails, clear token and show error
      logout();
      throw err;
    } finally {
      setValidating(false); // Clear validating state
    }
  }

  function logout() {
    // Clear all auth state
    clearAuthState();
    
    // Show success message
    toastSuccess(t('success.logoutSuccess'));
    
    // Redirect to login
    setTimeout(() => {
      router.push("/login");
    }, 800);
  }

  async function refreshMe() {
    if (!token) return;
    await fetchMe(token);
  }

  return (
    <AuthContext.Provider value={{ 
      token, 
      user, 
      login, 
      logout, 
      refreshMe, 
      isLoading: loading,
      isAuthenticated: !!token && !!user,
      isValidating: validating
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;
