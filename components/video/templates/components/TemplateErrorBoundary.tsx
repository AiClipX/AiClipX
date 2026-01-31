import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { handleError } from '../../../../lib/globalErrorHandler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onRetry?: () => void;
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class TemplateErrorBoundaryClass extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      errorInfo,
    });

    // Use global error handler for consistent error processing
    const context = this.props.context || 'TemplateComponent';
    handleError(error, context);
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return <TemplateErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }

    return this.props.children;
  }
}

// Functional component wrapper to use hooks
export function TemplateErrorBoundary(props: Props) {
  return <TemplateErrorBoundaryClass {...props} />;
}

// Default error fallback component
function TemplateErrorFallback({ 
  error, 
  onRetry 
}: { 
  error: Error | null; 
  onRetry?: () => void; 
}) {
  const { t } = useLanguage();

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            {t('templates.error.loadFailed')}
          </h3>
          <p className="text-red-700 mb-4">
            {error?.message || t('error.unknown')}
          </p>
          
          {onRetry && (
            <button
              onClick={onRetry}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <ArrowPathIcon className="w-5 h-5" />
              <span>{t('action.retry')}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TemplateErrorBoundary;