// pages/_app.js
import "../styles/globals.css";
import { useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { VideoListProvider } from "../components/video/list/hooks/VideoListContext";
import { AuthProvider, useAuth } from "../contexts/AuthContext";
import { EvidenceModeProvider } from "../contexts/EvidenceModeContext";
import { LanguageProvider, useLanguage } from "../contexts/LanguageContext";
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
  const { token, isLoading, isValidating } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    // Don't redirect while still loading token from localStorage or validating session
    if (isLoading || isValidating || redirecting) return;
    
    if (typeof window !== "undefined") {
      const isProtectedPage = router.pathname.startsWith("/dashboard") || 
                              router.pathname === "/upload";
      const isLoginPage = router.pathname === "/login";
      
      // Redirect to dashboard if we have token and we're on login page
      if (token && isLoginPage && !isLoading && !isValidating) {
        setRedirecting(true);
        router.push("/dashboard");
        return;
      }
      
      // Redirect to login if on protected page without token
      if (!token && isProtectedPage && !isLoading && !isValidating) {
        setRedirecting(true);
        router.push("/login");
        return;
      }
    }
  }, [token, router.pathname, isLoading, isValidating, router, redirecting]);

  // Reset redirecting state when route changes
  useEffect(() => {
    const handleRouteChange = () => {
      setRedirecting(false);
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);

  // Show loading state while validating session (but not on login page) or redirecting
  if (((isLoading || isValidating) && router.pathname !== "/login") || redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent border-solid rounded-full animate-spin"></div>
          <p className="text-white text-sm">
            {redirecting ? t('loading.redirecting') : isLoading ? t('loading.app') : t('loading.validatingSession')}
          </p>
        </div>
      </div>
    );
  }

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
        <LanguageProvider>
          <AuthProvider>
            <EvidenceModeProvider>
              <VideoListProvider>
                <InnerApp Component={Component} pageProps={pageProps} />
                <EvidenceModeToggle />
                <EvidenceModePanel />
              </VideoListProvider>
            </EvidenceModeProvider>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default MyApp;
