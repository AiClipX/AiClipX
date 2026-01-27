// Capability system for production-ready feature flags
import axios from './apiClient';
import { safeLog } from './config';

export interface Capabilities {
  authRequired: boolean;
  engineRunwayEnabled: boolean;
  signedUrlEnabled: boolean;
  cancelEnabled: boolean;
  publishEnabled: boolean;
  // Add more capabilities as needed
  version?: string;
  buildId?: string;
}

export interface SystemInfo {
  capabilities: Capabilities;
  appVersion: string;
  buildId: string;
  environment: string;
  lastUpdated: number;
}

// Default capabilities (safe fallbacks)
const DEFAULT_CAPABILITIES: Capabilities = {
  authRequired: true, // Safe default - require auth
  engineRunwayEnabled: false, // Safe default - disable advanced features
  signedUrlEnabled: false, // Safe default - disable downloads
  cancelEnabled: false, // Safe default - disable cancel actions
  publishEnabled: true, // Safe default - allow publish features
  version: '1.0.0',
  buildId: process.env.NEXT_PUBLIC_BUILD_ID || 'dev',
};

class CapabilityManager {
  private capabilities: Capabilities = DEFAULT_CAPABILITIES;
  private loading = false;
  private loaded = false;
  private error: string | null = null;
  private listeners: Array<(capabilities: Capabilities) => void> = [];

  async fetchCapabilities(): Promise<Capabilities> {
    if (this.loading) {
      // Return current capabilities if already loading
      return this.capabilities;
    }

    this.loading = true;
    this.error = null;

    try {
      safeLog('Fetching capabilities from /api/capabilities');
      
      const response = await axios.get('/api/capabilities', {
        timeout: 5000, // Reduced timeout to 5 seconds
      });

      const fetchedCapabilities: Capabilities = {
        ...DEFAULT_CAPABILITIES,
        ...response.data,
      };

      this.capabilities = fetchedCapabilities;
      this.loaded = true;
      this.error = null;

      safeLog('Capabilities loaded successfully', {
        authRequired: fetchedCapabilities.authRequired,
        engineRunwayEnabled: fetchedCapabilities.engineRunwayEnabled,
        signedUrlEnabled: fetchedCapabilities.signedUrlEnabled,
        cancelEnabled: fetchedCapabilities.cancelEnabled,
      });

      // Notify listeners
      this.notifyListeners();

      return this.capabilities;
    } catch (err: any) {
      this.error = err?.message || 'Failed to fetch capabilities';
      this.loaded = true; // Mark as loaded even on error to prevent infinite retries
      
      safeLog('Failed to fetch capabilities, using defaults', {
        error: this.error,
        usingDefaults: true,
      });

      // Use safe defaults on error
      this.capabilities = DEFAULT_CAPABILITIES;
      this.notifyListeners();

      return this.capabilities;
    } finally {
      this.loading = false;
    }
  }

  getSystemInfo(): SystemInfo {
    return {
      capabilities: this.capabilities,
      appVersion: this.capabilities.version || '1.0.0',
      buildId: this.capabilities.buildId || process.env.NEXT_PUBLIC_BUILD_ID || 'dev',
      environment: process.env.NODE_ENV || 'development',
      lastUpdated: Date.now(),
    };
  }

  getCapabilities(): Capabilities {
    return this.capabilities;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  isLoading(): boolean {
    return this.loading;
  }

  getError(): string | null {
    return this.error;
  }

  // Subscribe to capability changes
  subscribe(listener: (capabilities: Capabilities) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.capabilities);
      } catch (err) {
        safeLog('Error in capability listener', { hasError: !!err });
      }
    });
  }

  // Refresh capabilities (for manual refresh)
  async refresh(): Promise<Capabilities> {
    this.loaded = false;
    return this.fetchCapabilities();
  }
}

// Singleton instance
export const capabilityManager = new CapabilityManager();

// Convenience hooks and utilities
export function useCapabilities() {
  const [capabilities, setCapabilities] = React.useState<Capabilities>(
    capabilityManager.getCapabilities()
  );
  const [loading, setLoading] = React.useState(capabilityManager.isLoading());
  const [error, setError] = React.useState(capabilityManager.getError());

  React.useEffect(() => {
    const unsubscribe = capabilityManager.subscribe((newCapabilities) => {
      setCapabilities(newCapabilities);
      setLoading(capabilityManager.isLoading());
      setError(capabilityManager.getError());
    });

    // Initial load if not loaded
    if (!capabilityManager.isLoaded() && !capabilityManager.isLoading()) {
      capabilityManager.fetchCapabilities();
    }

    return unsubscribe;
  }, []);

  const refresh = React.useCallback(() => {
    return capabilityManager.refresh();
  }, []);

  return {
    capabilities,
    loading,
    error,
    refresh,
    isLoaded: capabilityManager.isLoaded(),
  };
}

// React import for the hook
import React from 'react';

// Initialize capabilities on app start
export async function initializeCapabilities(): Promise<void> {
  await capabilityManager.fetchCapabilities();
}

// Utility functions for checking specific capabilities
export function isAuthRequired(): boolean {
  return capabilityManager.getCapabilities().authRequired;
}

export function isEngineRunwayEnabled(): boolean {
  return capabilityManager.getCapabilities().engineRunwayEnabled;
}

export function isSignedUrlEnabled(): boolean {
  return capabilityManager.getCapabilities().signedUrlEnabled;
}

export function isCancelEnabled(): boolean {
  return capabilityManager.getCapabilities().cancelEnabled;
}

export function isPublishEnabled(): boolean {
  return capabilityManager.getCapabilities().publishEnabled;
}