import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import { useCapabilities } from '../../lib/capabilities';
import { useLanguage } from '../../contexts/LanguageContext';

interface CapabilityGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  fallback?: React.ReactNode;
}

export function CapabilityGuard({ 
  children, 
  requireAuth = true, 
  fallback 
}: CapabilityGuardProps) {
  const { capabilities, loading: capabilitiesLoading } = useCapabilities();
  const { isAuthenticated, isLoading: authLoading, isValidating } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  // Wait for capabilities and auth to load
  if (capabilitiesLoading || authLoading || isValidating) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent border-solid rounded-full animate-spin"></div>
          <p className="text-white text-sm">{t('loading.app')}</p>
        </div>
      </div>
    );
  }

  // Check if auth is required by capability system
  const authRequired = requireAuth && capabilities.authRequired;

  // If auth is required but user is not authenticated
  if (authRequired && !isAuthenticated) {
    // Redirect to login if not already there
    if (router.pathname !== '/login') {
      router.push('/login');
      return (
        <div className="min-h-screen flex items-center justify-center bg-neutral-950">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent border-solid rounded-full animate-spin"></div>
            <p className="text-white text-sm">{t('loading.redirecting')}</p>
          </div>
        </div>
      );
    }

    // Show fallback if provided, otherwise show auth required message
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {t('error.authRequired')}
          </h2>
          <p className="text-gray-700 mb-6">
            {t('error.authRequiredDescription')}
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {t('nav.login')}
          </button>
        </div>
      </div>
    );
  }

  // All checks passed, render children
  return <>{children}</>;
}

// Hook for checking specific capabilities
export function useCapabilityCheck() {
  const { capabilities } = useCapabilities();

  const checkCapability = React.useCallback((
    capability: keyof typeof capabilities,
    requiredValue: boolean = true
  ) => {
    return capabilities[capability] === requiredValue;
  }, [capabilities]);

  const isFeatureEnabled = React.useCallback((feature: string) => {
    switch (feature) {
      case 'auth':
        return capabilities.authRequired;
      case 'runway':
        return capabilities.engineRunwayEnabled;
      case 'download':
        return capabilities.signedUrlEnabled;
      case 'cancel':
        return capabilities.cancelEnabled;
      case 'publish':
        return capabilities.publishEnabled;
      default:
        return false;
    }
  }, [capabilities]);

  return {
    capabilities,
    checkCapability,
    isFeatureEnabled,
    canCreateVideo: capabilities.engineRunwayEnabled,
    canDownloadVideo: capabilities.signedUrlEnabled,
    canCancelAction: capabilities.cancelEnabled,
    canPublish: capabilities.publishEnabled,
    requiresAuth: capabilities.authRequired,
  };
}