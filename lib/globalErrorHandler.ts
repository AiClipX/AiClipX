// Global error handler for production-ready error management
import { t } from './i18n';
import { safeLog } from './config';

export interface ErrorInfo {
  message: string;
  requestId?: string;
  code?: string;
  status?: number;
  timestamp: number;
  userSafe: boolean;
}

export interface ErrorDisplayProps {
  error: ErrorInfo;
  onRetry?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
}

class GlobalErrorHandler {
  private listeners: Array<(error: ErrorInfo) => void> = [];

  // Process and standardize errors
  processError(error: any, context?: string): ErrorInfo {
    const timestamp = Date.now();
    let message = t('error.unknown');
    let requestId: string | undefined;
    let code: string | undefined;
    let status: number | undefined;
    let userSafe = true;

    try {
      // Extract status code
      status = error?.response?.status || error?.status;

      // Extract request ID from various sources
      requestId = 
        error?.requestId ||
        error?.response?.headers?.['x-request-id'] ||
        error?.config?.headers?.['X-Request-Id'] ||
        error?.response?.data?.requestId;

      // Extract error code
      code = error?.response?.data?.code || error?.code;

      // Determine user-safe message based on status
      if (status === 401) {
        message = t('error.unauthorized');
      } else if (status === 403) {
        message = t('error.forbidden');
      } else if (status === 404) {
        message = t('error.notFound');
      } else if (status === 422) {
        message = t('error.validationError');
      } else if (status === 429) {
        message = t('error.tooManyRequests');
      } else if (status === 503) {
        message = t('error.serviceUnavailable');
      } else if (status >= 500) {
        message = t('error.serverError');
      } else if (error?.message) {
        // For client-side errors, check if message is user-safe
        const errorMessage = error.message.toLowerCase();
        if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
          message = t('error.networkError');
        } else if (errorMessage.includes('abort')) {
          message = t('error.networkError');
        } else {
          // Generic message for unknown client errors
          message = t('error.unknown');
        }
      }

      // Add context if provided
      if (context) {
        safeLog(`Error in ${context}`, {
          status,
          hasRequestId: !!requestId,
          hasCode: !!code,
        });
      }

    } catch (processingError) {
      safeLog('Error processing error', { hasError: !!processingError });
      // Fallback to safe defaults
      message = t('error.unknown');
      userSafe = true;
    }

    return {
      message,
      requestId,
      code,
      status,
      timestamp,
      userSafe,
    };
  }

  // Handle and broadcast error
  handleError(error: any, context?: string): ErrorInfo {
    const errorInfo = this.processError(error, context);
    
    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(errorInfo);
      } catch (listenerError) {
        safeLog('Error in error listener', { hasError: !!listenerError });
      }
    });

    return errorInfo;
  }

  // Subscribe to error events
  subscribe(listener: (error: ErrorInfo) => void): () => void {
    this.listeners.push(listener);
    
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  // Create user-friendly error message with request ID
  formatErrorMessage(errorInfo: ErrorInfo): string {
    let message = errorInfo.message;
    
    if (errorInfo.requestId) {
      message += `\n\n${t('error.requestId')}: ${errorInfo.requestId}`;
    }
    
    return message;
  }

  // Get suggested actions based on error type
  getSuggestedActions(errorInfo: ErrorInfo): string[] {
    const actions: string[] = [];
    
    if (errorInfo.status === 422) {
      actions.push(t('error.checkInput'));
    } else if (errorInfo.status === 429) {
      actions.push(t('error.tryAgain'));
    } else if (errorInfo.status && errorInfo.status >= 500) {
      actions.push(t('error.tryAgain'));
      if (errorInfo.requestId) {
        actions.push(t('error.contactSupport'));
      }
    } else if (!errorInfo.status) {
      // Network/client errors
      actions.push(t('error.tryAgain'));
    }
    
    return actions;
  }
}

// Singleton instance
export const globalErrorHandler = new GlobalErrorHandler();

// Convenience function for handling errors
export function handleError(error: any, context?: string): ErrorInfo {
  return globalErrorHandler.handleError(error, context);
}

// React hook for error handling
import React from 'react';

export function useErrorHandler() {
  const [lastError, setLastError] = React.useState<ErrorInfo | null>(null);

  React.useEffect(() => {
    const unsubscribe = globalErrorHandler.subscribe((error) => {
      setLastError(error);
    });

    return unsubscribe;
  }, []);

  const handleError = React.useCallback((error: any, context?: string) => {
    return globalErrorHandler.handleError(error, context);
  }, []);

  const clearError = React.useCallback(() => {
    setLastError(null);
  }, []);

  return {
    lastError,
    handleError,
    clearError,
    formatMessage: globalErrorHandler.formatErrorMessage.bind(globalErrorHandler),
    getSuggestedActions: globalErrorHandler.getSuggestedActions.bind(globalErrorHandler),
  };
}