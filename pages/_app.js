// pages/_app.js
import "../styles/globals.css";
import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VideoListProvider } from "../components/video/list/hooks/VideoListContext";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { EvidenceModeProvider } from "../contexts/EvidenceModeContext";
import { useRouter } from "next/router";
import { ErrorBoundary } from "../components/common/ErrorBoundary";
import EnvironmentBadge from "../components/common/EnvironmentBadge";
import EvidenceModeToggle from "../components/common/EvidenceModeToggle";
import EvidenceModePanel from "../components/common/EvidenceModePanel";
import { logEnvironmentInfo } from "../lib/envValidation";

// Log environment info in development
if (typeof window !== "undefined") {
  logEnvironmentInfo();
}

function InnerApp({ Component, pageProps }) {
  const { token, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Don't redirect while still loading token from localStorage
    if (isLoading) return;
    
    // Only redirect to login if:
    // 1. No token exists (after loading is complete)
    // 2. User is on a protected page (not login or home)
    if (typeof window !== "undefined") {
      const isProtectedPage = router.pathname.startsWith("/dashboard") || 
                              router.pathname === "/upload";
      
      // Only redirect if on protected page without token (and not loading)
      if (!token && isProtectedPage && !isLoading) {
        router.push("/login");
      }
    }
  }, [token, router.pathname, isLoading]);

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
          <EvidenceModeProvider>
            <VideoListProvider>
              <InnerApp Component={Component} pageProps={pageProps} />
              <EvidenceModeToggle />
              <EvidenceModePanel />
            </VideoListProvider>
          </EvidenceModeProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default MyApp;
