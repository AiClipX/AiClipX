// pages/_app.js
import "../styles/globals.css";
import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VideoListProvider } from "../components/video/list/hooks/VideoListContext";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { useRouter } from "next/router";

function InnerApp({ Component, pageProps }) {
  const { token } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If not on login page and no token, redirect to /login
    if (typeof window !== "undefined") {
      if (!token && router.pathname !== "/login") {
        router.push("/login");
      }
    }
  }, [token, router]);

  return <Component {...pageProps} />;
}

function MyApp({ Component, pageProps }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <VideoListProvider>
          <InnerApp Component={Component} pageProps={pageProps} />
        </VideoListProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default MyApp;
