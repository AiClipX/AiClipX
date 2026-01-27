import React from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../../contexts/LanguageContext';
import { ErrorDisplayProps } from '../../lib/globalErrorHandler';

export function ErrorDisplay({ 
  error, 
  onRetry, 
  onDismiss, 
  compact = false 
}: ErrorDisplayProps) {
  const { t } = useLanguage();

  if (compact) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
        <div className="flex items-start gap-2">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-red-800">{error.message}</p>
            {error.requestId && (
              <p className="text-xs text-red-600 mt-1 font-mono">
                {t('error.requestId')}: {error.requestId}
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
          <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            {t('error.unknown')}
          </h3>
          <p className="text-red-700 mb-4">{error.message}</p>
          
          {error.requestId && (
            <div className="bg-red-100 border border-red-300 rounded p-3 mb-4">
              <p className="text-sm font-medium text-red-800 mb-1">
                {t('error.requestId')}
              </p>
              <p className="text-sm font-mono text-red-700 break-all">
                {error.requestId}
              </p>
            </div>
          )}

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

// Global error toast component
export function GlobalErrorToast() {
  const { t } = useLanguage();
  const [errors, setErrors] = React.useState<Array<{ id: string; error: any; timestamp: number }>>([]);

  React.useEffect(() => {
    const handleError = (error: any) => {
      const errorId = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      setErrors(prev => [...prev, { id: errorId, error, timestamp: Date.now() }]);
      
      // Auto-dismiss after 10 seconds
      setTimeout(() => {
        setErrors(prev => prev.filter(e => e.id !== errorId));
      }, 10000);
    };

    // Listen for global errors
    const unsubscribe = globalErrorHandler.subscribe(handleError);
    return unsubscribe;
  }, []);

  const dismissError = (errorId: string) => {
    setErrors(prev => prev.filter(e => e.id !== errorId));
  };

  if (errors.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {errors.map(({ id, error }) => (
        <div
          key={id}
          className="bg-red-50 border border-red-200 rounded-lg p-4 shadow-lg"
        >
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-red-800 mb-1">
                {t('error.unknown')}
              </p>
              <p className="text-sm text-red-700">{error.message}</p>
              {error.requestId && (
                <p className="text-xs text-red-600 mt-2 font-mono">
                  {t('error.requestId')}: {error.requestId}
                </p>
              )}
            </div>
            <button
              onClick={() => dismissError(id)}
              className="p-1 text-red-600 hover:text-red-800 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

import { globalErrorHandler } from '../../lib/globalErrorHandler';