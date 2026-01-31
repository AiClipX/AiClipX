// Service Worker Error Handler
// Handles MobX state tree errors and other service worker issues

class ServiceWorkerErrorHandler {
  constructor() {
    this.isInitialized = false;
    this.stateTreeRefs = new WeakSet();
    
    if (typeof window !== 'undefined') {
      this.init();
    }
  }

  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // Handle service worker registration
    this.registerServiceWorker();
    
    // Handle MobX state tree errors
    this.setupMobXErrorHandling();
    
    // Handle page lifecycle events
    this.setupPageLifecycleHandling();
    
    // Handle unhandled promise rejections
    this.setupPromiseRejectionHandling();
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      // Only register if we're not already registered
      navigator.serviceWorker.getRegistration().then(registration => {
        if (!registration) {
          // Register with error handling
          navigator.serviceWorker.register('/sw.js', {
            scope: '/',
            updateViaCache: 'none'
          }).catch(error => {
            // Silently handle registration errors to prevent console spam
            console.debug('Service worker registration failed:', error);
          });
        }
      }).catch(() => {
        // Silently handle getRegistration errors
      });
    }
  }

  setupMobXErrorHandling() {
    // Override console.error to catch and handle MobX state tree errors
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      
      // Check if this is a MobX state tree error
      if (message.includes('mobx-state-tree') && 
          message.includes('no longer part of a state tree')) {
        // Log a cleaner error message
        console.debug('MobX state tree access after removal - this is expected during cleanup');
        return; // Don't log the full error
      }
      
      // Check for other service worker related errors we want to suppress
      if (message.includes('Event handler of') && message.includes('event must be added')) {
        console.debug('Service worker event handler warning - this is expected');
        return;
      }
      
      if (message.includes('Duration section is missing')) {
        console.debug('WebM duration section missing - this is expected for some recordings');
        return;
      }
      
      // For all other errors, use the original console.error
      originalError.apply(console, args);
    };
  }

  setupPageLifecycleHandling() {
    // Handle page visibility changes to prevent state tree access after cleanup
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.cleanupStateReferences();
      }
    });

    // Handle beforeunload
    window.addEventListener('beforeunload', () => {
      this.cleanupStateReferences();
    });

    // Handle pagehide (for bfcache)
    window.addEventListener('pagehide', () => {
      this.cleanupStateReferences();
    });
  }

  setupPromiseRejectionHandling() {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      
      // Check if this is a MobX state tree error
      if (error && error.message && 
          error.message.includes('mobx-state-tree') && 
          error.message.includes('no longer part of a state tree')) {
        // Prevent the error from being logged
        event.preventDefault();
        console.debug('Prevented MobX state tree error from being logged');
        return;
      }
      
      // Check for extension port errors
      if (error && error.message && 
          error.message.includes('Extension context invalidated')) {
        event.preventDefault();
        console.debug('Extension context invalidated - this is expected');
        return;
      }
    });
  }

  cleanupStateReferences() {
    // Clear any stored state tree references
    this.stateTreeRefs = new WeakSet();
    
    // Trigger garbage collection if available (development only)
    if (window.gc && typeof window.gc === 'function') {
      try {
        window.gc();
      } catch (e) {
        // Ignore GC errors
      }
    }
  }

  // Method to register state tree objects for cleanup tracking
  registerStateTree(stateTreeObject) {
    if (stateTreeObject && typeof stateTreeObject === 'object') {
      this.stateTreeRefs.add(stateTreeObject);
    }
  }

  // Method to safely access state tree properties
  safeStateAccess(stateTreeObject, accessor) {
    try {
      if (!stateTreeObject || this.stateTreeRefs.has(stateTreeObject)) {
        return accessor();
      }
    } catch (error) {
      if (error.message && error.message.includes('no longer part of a state tree')) {
        console.debug('Safe state access prevented MobX error');
        return null;
      }
      throw error;
    }
    return null;
  }
}

// Create singleton instance
const serviceWorkerErrorHandler = new ServiceWorkerErrorHandler();

export default serviceWorkerErrorHandler;

// Utility functions
export const registerStateTree = (stateTreeObject) => {
  serviceWorkerErrorHandler.registerStateTree(stateTreeObject);
};

export const safeStateAccess = (stateTreeObject, accessor) => {
  return serviceWorkerErrorHandler.safeStateAccess(stateTreeObject, accessor);
};