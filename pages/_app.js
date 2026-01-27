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
import { SystemStatusPanel, useSystemStatusPanel } from "../components/common/SystemStatusPanel";
import { GlobalErrorToast } from "../components/common/ErrorDisplay";
import { CapabilityGuard } from "../components/common/CapabilityGuard";
import { initializeCapabilities } from "../lib/capabilities";
import { logEnvironmentInfo } from "../lib/envValidation";
import extensionPortHandler from "../lib/extensionPortHandler";
import CustomHead from "../components/common/CustomHead";

// Log environment info in development
if (typeof window !== "undefined") {
  logEnvironmentInfo();
  
  // Suppress extension-related errors in development
  const originalError = console.error;
  console.error = (...args) => {
    const message = args[0]?.toString() || '';
    
    // Suppress common extension-related errors
    if (
      message.includes('Unchecked runtime.lastError') ||
      message.includes('Extension context invalidated') ||
      message.includes('message channel is closed') ||
      message.includes('back/forward cache')
    ) {
      return; // Suppress these errors
    }
    
    // Log other errors normally
    originalError.apply(console, args);
  };
  
  // Prevent bfcache issues with browser extensions
  if (process.env.NODE_ENV === 'development') {
    // Initialize extension port handler
    extensionPortHandler;
    
    // Prevent the page from being cached in bfcache
    window.addEventListener('beforeunload', () => {
      // This prevents the page from being cached
    });
    
    // Handle page visibility changes to prevent extension port issues
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        // Page is being hidden, cleanup any extension connections
        try {
          // Dispatch a custom event to cleanup extension connections
          window.dispatchEvent(new CustomEvent('page-hidden'));
        } catch (e) {
          // Ignore errors
        }
      }
    });
    
    // Handle page show/hide events for bfcache
    window.addEventListener('pageshow', (event) => {
      if (event.persisted) {
        // Page was restored from bfcache, reload to avoid extension issues
        console.log('Page restored from bfcache, reloading to prevent extension issues');
        window.location.reload();
      }
    });
    
    // Prevent bfcache by adding an unload handler
    window.addEventListener('unload', () => {
      // This prevents bfcache
    });

    // Additional bfcache prevention
    window.addEventListener('pagehide', (event) => {
      if (event.persisted) {
        // Try to prevent the page from being cached
        event.preventDefault();
      }
    });
  }
}

function InnerApp({ Component, pageProps }) {
  const { token, isLoading, isValidating } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);
  const [capabilitiesInitialized, setCapabilitiesInitialized] = useState(false);
  const systemStatus = useSystemStatusPanel();

  // Check if current page is login
  const isLoginPage = router.pathname === "/login";

  // Initialize capabilities on app start (but don't block login page)
  useEffect(() => {
    const initCaps = async () => {
      try {
        console.log('Initializing capabilities...');
        await initializeCapabilities();
        console.log('Capabilities initialized successfully');
      } catch (error) {
        console.warn('Failed to initialize capabilities, using defaults:', error);
      } finally {
        setCapabilitiesInitialized(true);
        console.log('Capabilities initialization complete');
      }
    };

    // Initialize capabilities in background, don't block login page
    initCaps();
  }, []);

  // Handle redirects only after auth and capabilities are ready
  useEffect(() => {
    // Skip redirect logic if still loading or redirecting
    if (isLoading || redirecting) return;
    
    // Skip redirect logic on login page during initial load
    if (isLoginPage && (!capabilitiesInitialized || isValidating)) return;
    
    if (typeof window !== "undefined") {
      const isProtectedPage = router.pathname.startsWith("/dashboard") || 
                              router.pathname === "/upload";
      
      // Redirect to dashboard if we have token and we're on login page
      if (token && isLoginPage && !isValidating) {
        console.log('Redirecting to dashboard from login page');
        setRedirecting(true);
        router.push("/dashboard");
        return;
      }
      
      // Redirect to login if on protected page without token (and capabilities are loaded)
      if (!token && isProtectedPage && capabilitiesInitialized && !isValidating) {
        console.log('Redirecting to login from protected page');
        setRedirecting(true);
        router.push("/login");
        return;
      }
    }
  }, [token, router.pathname, isLoading, isValidating, router, redirecting, capabilitiesInitialized, isLoginPage]);

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

  // Show loading state for redirects
  if (redirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent border-solid rounded-full animate-spin"></div>
          <p className="text-white text-sm">{t('loading.redirecting')}</p>
        </div>
      </div>
    );
  }

  // Show loading state while validating session (but not on login page)
  if ((isLoading || isValidating) && !isLoginPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent border-solid rounded-full animate-spin"></div>
          <p className="text-white text-sm">
            {isLoading ? t('loading.app') : t('loading.validatingSession')}
          </p>
        </div>
      </div>
    );
  }

  // Show capabilities loading only for non-login pages
  if (!capabilitiesInitialized && !isLoginPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent border-solid rounded-full animate-spin"></div>
          <p className="text-white text-sm">Initializing...</p>
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
        {isLoginPage ? (
          // Login page doesn't need capability guard and can render immediately
          <Component {...pageProps} />
        ) : (
          // Other pages use capability guard and need capabilities loaded
          capabilitiesInitialized ? (
            <CapabilityGuard>
              <Component {...pageProps} />
            </CapabilityGuard>
          ) : (
            // Show loading for non-login pages while capabilities load
            <div className="min-h-screen flex items-center justify-center bg-neutral-950">
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent border-solid rounded-full animate-spin"></div>
                <p className="text-white text-sm">Loading capabilities...</p>
              </div>
            </div>
          )
        )}
      </div>
      
      {/* Environment Badge in footer */}
      <footer className="p-4 border-t bg-gray-50">
        <div className="flex justify-center">
          <EnvironmentBadge position="footer" />
        </div>
      </footer>

      {/* Global Error Toast */}
      <GlobalErrorToast />

      {/* System Status Panel - only show when capabilities are loaded */}
      {capabilitiesInitialized && (
        <SystemStatusPanel 
          isOpen={systemStatus.isOpen} 
          onToggle={systemStatus.toggle} 
        />
      )}
    </div>
  );
}

function MyApp({ Component, pageProps }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ErrorBoundary>
      <CustomHead />
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
