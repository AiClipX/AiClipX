import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "../lib/apiClient";
import { useRouter } from "next/router";
import { toastSuccess, toastWarning } from "../components/common/Toast";

type User = {
  id?: string;
  email?: string;
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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Token presence check on app load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("aiclipx_token");
      if (stored) {
        setToken(stored);
      }
      setLoading(false);
    } else {
      setLoading(false);
    }
  }, []);

  // Listen for token expiration events from API client
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleTokenExpired = (event: any) => {
      const error = event.detail;
      
      // Clear all auth state
      setToken(null);
      setUser(null);
      
      // Don't show toast here - authErrorHandler already shows it
      // Just ensure state is cleared
    };

    window.addEventListener('auth:token-expired', handleTokenExpired);
    return () => window.removeEventListener('auth:token-expired', handleTokenExpired);
  }, [router]);

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
    
    try {
      await fetchMe(tkn);
      toastSuccess("Đăng nhập thành công!");
      
      // Navigate to dashboard after successful login
      setTimeout(() => {
        router.push("/dashboard");
      }, 500);
    } catch (err) {
      // If fetching user fails, clear token and show error
      logout();
      throw err;
    }
  }

  function logout() {
    // Clear all auth state
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("aiclipx_token");
    }
    setToken(null);
    setUser(null);
    
    // Show success message
    toastSuccess("Đã đăng xuất thành công");
    
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
      isAuthenticated: !!token 
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
