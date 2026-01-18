// pages/_app.js
import "../styles/globals.css";
import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VideoListProvider } from "../components/video/list/hooks/VideoListContext";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/router";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import EnvironmentBadge from "../components/common/EnvironmentBadge";
import { logEnvironmentInfo } from "../lib/envValidation";

// Log environment info in development
if (typeof window !== "undefined") {
  logEnvironmentInfo();
}

function InnerApp({ Component, pageProps }) {
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If not on login page and no token, redirect to /login
    if (typeof window !== "undefined") {
      // Only redirect if we're sure there's no token (not during initial load)
      if (!token && router.pathname !== "/login" && router.pathname !== "/") {
        router.push("/login");
      }
    }
  }, [token, router.pathname]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Environment Badge in header for non-prod */}
      <div className="flex justify-end p-2">
        <EnvironmentBadge position="header" />
      </div>
      
      {/* Main content */}
      <div className="flex-1">
        <Component {...pageProps} />
      </div>
      
      {/* Environment Badge in footer */}
      <footer className="p-4 border-t bg-gray-50">
        <div className="flex justify-center">
          <EnvironmentBadge position="footer" />
        </div>
      </footer>
    </div>
  );
}

function MyApp({ Component, pageProps }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <VideoListProvider>
            <InnerApp Component={Component} pageProps={pageProps} />
          </VideoListProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default MyApp;
