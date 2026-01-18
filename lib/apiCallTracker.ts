// API Call Tracker for Evidence Mode
export interface APICall {
  id: string;
  timestamp: number;
  method: string;
  endpoint: string;
  status: number | null;
  requestId: string;
  duration?: number;
  error?: string;
}

class APICallTracker {
  private calls: APICall[] = [];
  private maxCalls = 10; // Keep last 10 calls
  private listeners: Set<() => void> = new Set();

  addCall(call: Omit<APICall, 'id' | 'timestamp'>) {
    const newCall: APICall = {
      ...call,
      id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    this.calls.unshift(newCall);
    
    // Keep only last N calls
    if (this.calls.length > this.maxCalls) {
      this.calls = this.calls.slice(0, this.maxCalls);
    }

    // Notify listeners
    this.notifyListeners();
  }

  getCalls(limit: number = 5): APICall[] {
    return this.calls.slice(0, limit);
  }

  getLastCall(): APICall | null {
    return this.calls[0] || null;
  }

  clear() {
    this.calls = [];
    this.notifyListeners();
  }

  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }
}

// Singleton instance
export const apiCallTracker = new APICallTracker();

// Helper to extract requestId from response
export function extractRequestId(response: Response | any): string {
  // Try to get from response header
  if (response?.headers?.get) {
    const headerRequestId = response.headers.get('X-Request-Id');
    if (headerRequestId) return headerRequestId;
  }

  // Try to get from response body
  if (response?.data?.debug?.requestId) {
    return response.data.debug.requestId;
  }

  if (response?.data?.requestId) {
    return response.data.requestId;
  }

  // Generate fallback
  return `unknown_${Date.now()}`;
}

// Helper to format endpoint for display
export function formatEndpoint(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search;
  } catch {
    return url;
  }
}

// Helper to get status color
export function getStatusColor(status: number | null): string {
  if (!status) return 'text-gray-500';
  if (status >= 200 && status < 300) return 'text-green-600';
  if (status >= 400 && status < 500) return 'text-yellow-600';
  if (status >= 500) return 'text-red-600';
  return 'text-gray-600';
}

// Helper to format timestamp
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('vi-VN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit' 
  });
}