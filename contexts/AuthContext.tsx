import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "../lib/apiClient";
import { useRouter } from "next/router";

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
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    // hydrate token from localStorage
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem("aiclipx_token");
      if (stored) {
        setToken(stored);
        // attempt to fetch user
        fetchMe(stored).catch(() => {
          setToken(null);
          setUser(null);
          window.localStorage.removeItem("aiclipx_token");
        });
      }
    }
  }, []);

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
    } catch (err) {
      // if fetching me fails, clear token
      logout();
      throw err;
    }
    // navigate to dashboard after login
    router.push("/dashboard");
  }

  function logout() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("aiclipx_token");
    }
    setToken(null);
    setUser(null);
    router.push("/login");
  }

  async function refreshMe() {
    if (!token) return;
    await fetchMe(token);
  }

  return (
    <AuthContext.Provider value={{ token, user, login, logout, refreshMe }}>
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
