// Extension port handler to prevent bfcache issues
// This helps prevent "Unchecked runtime.lastError" messages from browser extensions

class ExtensionPortHandler {
  constructor() {
    this.ports = new Set();
    this.isCleaningUp = false;
    
    if (typeof window !== 'undefined') {
      this.setupEventListeners();
    }
  }

  setupEventListeners() {
    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.cleanupPorts();
      }
    });

    // Handle beforeunload
    window.addEventListener('beforeunload', () => {
      this.cleanupPorts();
    });

    // Handle pagehide (for bfcache)
    window.addEventListener('pagehide', () => {
      this.cleanupPorts();
    });

    // Handle page freeze (for bfcache)
    document.addEventListener('freeze', () => {
      this.cleanupPorts();
    });

    // Handle custom cleanup event
    window.addEventListener('page-hidden', () => {
      this.cleanupPorts();
    });
  }

  addPort(port) {
    if (port && typeof port.disconnect === 'function') {
      this.ports.add(port);
    }
  }

  removePort(port) {
    this.ports.delete(port);
  }

  cleanupPorts() {
    if (this.isCleaningUp) return;
    this.isCleaningUp = true;

    try {
      // Cleanup any extension ports
      this.ports.forEach(port => {
        try {
          if (port && typeof port.disconnect === 'function') {
            port.disconnect();
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      });
      
      this.ports.clear();

      // Try to cleanup any global extension connections
      if (window.chrome && window.chrome.runtime) {
        try {
          // Disconnect any active connections
          if (window.chrome.runtime.Port) {
            window.chrome.runtime.Port.disconnect();
          }
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      // Clear any extension-related timeouts/intervals
      if (window.extensionTimeouts) {
        window.extensionTimeouts.forEach(id => clearTimeout(id));
        window.extensionTimeouts = [];
      }

      if (window.extensionIntervals) {
        window.extensionIntervals.forEach(id => clearInterval(id));
        window.extensionIntervals = [];
      }

    } catch (e) {
      // Ignore all cleanup errors to prevent console spam
    } finally {
      this.isCleaningUp = false;
    }
  }

  // Method to safely create timeouts that will be cleaned up
  createTimeout(callback, delay) {
    const id = setTimeout(callback, delay);
    if (!window.extensionTimeouts) {
      window.extensionTimeouts = [];
    }
    window.extensionTimeouts.push(id);
    return id;
  }

  // Method to safely create intervals that will be cleaned up
  createInterval(callback, delay) {
    const id = setInterval(callback, delay);
    if (!window.extensionIntervals) {
      window.extensionIntervals = [];
    }
    window.extensionIntervals.push(id);
    return id;
  }
}

// Create singleton instance
const extensionPortHandler = new ExtensionPortHandler();

export default extensionPortHandler;

// Utility functions
export const safeTimeout = (callback, delay) => {
  return extensionPortHandler.createTimeout(callback, delay);
};

export const safeInterval = (callback, delay) => {
  return extensionPortHandler.createInterval(callback, delay);
};

export const addExtensionPort = (port) => {
  extensionPortHandler.addPort(port);
};

export const removeExtensionPort = (port) => {
  extensionPortHandler.removePort(port);
};