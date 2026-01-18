// Polling Manager - Smart polling with guardrails
export interface PollingConfig {
  interval: number; // milliseconds
  enableWhenHidden?: boolean; // poll when tab is hidden
  hiddenInterval?: number; // slower interval when hidden
  maxConcurrent?: number; // max concurrent requests
}

export class PollingManager {
  private timerId: NodeJS.Timeout | null = null;
  private isPolling = false;
  private inFlightRequests = new Set<string>();
  private config: Required<PollingConfig>;
  private callback: () => Promise<void>;
  private isTabVisible = true;
  private lastPollTime = 0;

  constructor(callback: () => Promise<void>, config: PollingConfig) {
    this.callback = callback;
    this.config = {
      interval: config.interval,
      enableWhenHidden: config.enableWhenHidden ?? false,
      hiddenInterval: config.hiddenInterval ?? config.interval * 3,
      maxConcurrent: config.maxConcurrent ?? 1,
    };

    // Listen to page visibility changes
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }

  private handleVisibilityChange = () => {
    this.isTabVisible = !document.hidden;
    
    // Restart polling with appropriate interval when visibility changes
    if (this.isPolling) {
      this.stop();
      this.start();
    }
  };

  private getInterval(): number {
    if (this.isTabVisible) {
      return this.config.interval;
    }
    return this.config.enableWhenHidden 
      ? this.config.hiddenInterval 
      : this.config.interval;
  }

  private async poll() {
    // Don't poll if tab is hidden and not enabled
    if (!this.isTabVisible && !this.config.enableWhenHidden) {
      return;
    }

    // Check if we have too many in-flight requests
    if (this.inFlightRequests.size >= this.config.maxConcurrent) {
      console.warn('[PollingManager] Skipping poll - too many in-flight requests');
      return;
    }

    // Prevent concurrent duplicate calls
    const requestId = `poll_${Date.now()}`;
    this.inFlightRequests.add(requestId);

    try {
      await this.callback();
      this.lastPollTime = Date.now();
    } catch (error) {
      console.error('[PollingManager] Poll error:', error);
    } finally {
      this.inFlightRequests.delete(requestId);
    }
  }

  start() {
    if (this.isPolling) {
      console.warn('[PollingManager] Already polling');
      return;
    }

    this.isPolling = true;
    
    const scheduleNext = () => {
      if (!this.isPolling) return;
      
      const interval = this.getInterval();
      this.timerId = setTimeout(async () => {
        await this.poll();
        scheduleNext();
      }, interval);
    };

    // Start first poll immediately
    this.poll().then(() => {
      scheduleNext();
    });
  }

  stop() {
    this.isPolling = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  async refresh() {
    // Manual refresh - force a poll now
    await this.poll();
  }

  getLastPollTime(): number {
    return this.lastPollTime;
  }

  isActive(): boolean {
    return this.isPolling;
  }

  destroy() {
    this.stop();
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    }
  }
}

// Helper to format last updated time
export function formatLastUpdated(timestamp: number): string {
  if (!timestamp) return 'Never';
  
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 1000) return 'Just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  
  const date = new Date(timestamp);
  return date.toLocaleTimeString('vi-VN', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit'
  });
}