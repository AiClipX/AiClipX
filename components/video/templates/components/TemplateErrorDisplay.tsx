import React from 'react';
import { 
  ExclamationTriangleIcon, 
  ArrowPathIcon, 
  WifiIcon,
  ServerIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { ErrorInfo } from '../../../../lib/globalErrorHandler';

interface TemplateErrorDisplayProps {
  error: string | ErrorInfo | null;
  onRetry?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
  showRequestId?: boolean;
  context?: string;
}

export function TemplateErrorDisplay({
  error,
  onRetry,
  onDismiss,
  compact = false,
  showRequestId = true,
  context = 'templates'
}: TemplateErrorDisplayProps) {
  const { t } = useLanguage();

  if (!error) return null;

  // Normalize error to ErrorInfo format
  const errorInfo: ErrorInfo = typeof error === 'string' 
    ? {
        message: error,
        timestamp: Date.now(),
        userSafe: true,
      }
    : error;

  // Determine error type and appropriate icon
  const getErrorIcon = () => {
    if (errorInfo.status === 0 || errorInfo.message?.toLowerCase().includes('network')) {
      return <WifiIcon className="w-5 h-5 text-red-500" />;
    }
    if (errorInfo.status && errorInfo.status >= 500) {
      return <ServerIcon className="w-5 h-5 text-red-500" />;
    }
    return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
  };

  // Get contextual error message
  const getErrorMessage = () => {
    if (errorInfo.status === 0) {
      return t('error.networkError');
    }
    if (errorInfo.status === 404) {
      return t('templates.error.loadFailed');
    }
    if (errorInfo.status && errorInfo.status >= 500) {
      return t('error.serverError');
    }
    return errorInfo.message || t('templates.error.loadFailed');
  };

  // Get suggested actions based on error type
  const getSuggestedActions = () => {
    const actions: string[] = [];
    
    if (errorInfo.status === 0) {
      actions.push(t('error.tryAgain'));
    } else if (errorInfo.status && errorInfo.status >= 500) {
      actions.push(t('error.tryAgain'));
      if (errorInfo.requestId) {
        actions.push(t('error.contactSupport'));
      }
    } else {
      actions.push(t('error.tryAgain'));
    }
    
    return actions;
  };

  if (compact) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          {getErrorIcon()}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-800">{getErrorMessage()}</p>
            {showRequestId && errorInfo.requestId && (
              <p className="text-xs text-red-600 mt-1 font-mono">
                {t('error.requestId')}: {errorInfo.requestId}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1">
            {onRetry && (
              <button
                onClick={onRetry}
                className="p-1 text-red-600 hover:text-red-800 transition-colors"
                title={t('action.retry')}
              >
                <ArrowPathIcon className="w-4 h-4" />
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="p-1 text-red-600 hover:text-red-800 transition-colors"
                title={t('action.close')}
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          {React.cloneElement(getErrorIcon(), { className: "w-8 h-8 text-red-500" })}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            {t('templates.error.loadFailed')}
          </h3>
          <p className="text-red-700 mb-4">{getErrorMessage()}</p>
          
          {showRequestId && errorInfo.requestId && (
            <div className="bg-red-100 border border-red-300 rounded p-3 mb-4">
              <p className="text-sm font-medium text-red-800 mb-1">
                {t('error.requestId')}
              </p>
              <p className="text-sm font-mono text-red-700 break-all">
                {errorInfo.requestId}
              </p>
            </div>
          )}

          {/* Suggested actions */}
          <div className="mb-4">
            <p className="text-sm font-medium text-red-800 mb-2">
              {t('error.whatToDo')}
            </p>
            <ul className="text-sm text-red-700 space-y-1">
              {getSuggestedActions().map((action, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex items-center gap-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <ArrowPathIcon className="w-5 h-5" />
                <span>{t('action.retry')}</span>
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-lg transition-colors"
              >
                {t('action.close')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TemplateErrorDisplay;