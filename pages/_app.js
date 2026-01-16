// pages/_app.js
import "../styles/globals.css";
import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VideoListProvider } from "../components/video/list/hooks/VideoListContext";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/router";
import { ErrorBoundary } from "../components/common/ErrorBoundary";

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

  return <Component {...pageProps} />;
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
