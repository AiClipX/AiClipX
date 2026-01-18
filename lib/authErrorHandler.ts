// Auth error handling utilities
import { toastWarning, toastError } from "../components/common/Toast";

export interface AuthError {
  status: 401 | 403;
  message: string;
  requestId?: string;
}

let isRedirecting = false;
let redirectTimer: NodeJS.Timeout | null = null;

/**
 * Handle 401/403 errors consistently across the app
 * - Clear token from localStorage
 * - Show user-friendly message
 * - Redirect to login (once)
 * - Prevent redirect loops
 */
export function handleAuthError(error: AuthError) {
  if (typeof window === "undefined") return;
  
  // Prevent multiple simultaneous redirects
  if (isRedirecting) return;
  
  isRedirecting = true;
  
  // Clear token immediately
  window.localStorage.removeItem("aiclipx_token");
  
  // Dispatch event to notify AuthContext
  window.dispatchEvent(new CustomEvent('auth:token-expired', { 
    detail: error 
  }));
  
  // Show user-friendly message
  const message = error.status === 401 
    ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
    : "Bạn không có quyền truy cập. Vui lòng đăng nhập lại.";
  
  toastWarning(message);
  
  // Redirect to login after toast is visible
  if (redirectTimer) clearTimeout(redirectTimer);
  redirectTimer = setTimeout(() => {
    window.location.href = "/login";
    // Reset flag after redirect
    setTimeout(() => {
      isRedirecting = false;
    }, 1000);
  }, 1500);
}

/**
 * Extract safe error message for display
 * Never show raw server errors or tokens
 */
export function getSafeErrorMessage(error: any, requestId?: string): string {
  // Default safe message
  let message = "Đã xảy ra lỗi. Vui lòng thử lại.";
  
  // Try to extract user-friendly message
  if (error?.response?.data?.message) {
    message = error.response.data.message;
  } else if (error?.message && !error.message.includes("token")) {
    message = error.message;
  }
  
  // Append requestId if available (for support)
  if (requestId) {
    message += ` (ID: ${requestId})`;
  }
  
  return message;
}

/**
 * Check if error is auth-related (401/403)
 */
export function isAuthError(error: any): boolean {
  const status = error?.response?.status || error?.status;
  return status === 401 || status === 403;
}

/**
 * Generate unique request ID for error tracking
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Reset redirect flag (for testing)
 */
export function resetRedirectFlag() {
  isRedirecting = false;
  if (redirectTimer) {
    clearTimeout(redirectTimer);
    redirectTimer = null;
  }
}