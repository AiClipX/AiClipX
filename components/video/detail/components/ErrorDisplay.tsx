import React, { useState } from 'react';
import { 
  ExclamationTriangleIcon, 
  ClipboardDocumentIcon,
  CheckIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface ErrorDisplayProps {
  errorMessage: string;
  requestId?: string;
  className?: string;
  onRetry?: () => void;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  errorMessage, 
  requestId,
  className = '',
  onRetry
}) => {
  const [copied, setCopied] = useState(false);

  const copyRequestId = async () => {
    if (requestId) {
      try {
        await navigator.clipboard.writeText(requestId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  // Clean up error message for user display
  const getUserFriendlyError = (error: string) => {
    if (!error) return 'An unknown error occurred during video generation.';
    
    // Remove technical details but keep useful info
    const cleanError = error
      .replace(/Error:\s*/gi, '')
      .replace(/Exception:\s*/gi, '')
      .replace(/\[.*?\]/g, '') // Remove bracketed technical info
      .trim();
    
    return cleanError || 'Video generation failed. Please try again.';
  };

  return (
    <div className={`bg-red-50 border-2 border-red-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
        </div>
        
        <div className="flex-1">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-red-900">
              Video Generation Failed
            </h3>
            {onRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-2 px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded transition-colors"
              >
                <ArrowPathIcon className="w-4 h-4" />
                Refresh
              </button>
            )}
          </div>
          
          <div className="bg-white border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 font-medium">
              {getUserFriendlyError(errorMessage)}
            </p>
          </div>
          
          {requestId && (
            <div className="bg-white border border-red-200 rounded-lg p-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-600 mb-1">
                    Request ID (for support)
                  </p>
                  <p className="font-mono text-sm text-gray-800 break-all">
                    {requestId}
                  </p>
                </div>
                
                <button
                  onClick={copyRequestId}
                  className="ml-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                  title="Copy Request ID"
                >
                  {copied ? (
                    <>
                      <CheckIcon className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-600">Copied!</span>
                    </>
                  ) : (
                    <>
                      <ClipboardDocumentIcon className="w-4 h-4 text-gray-600" />
                      <span className="text-sm text-gray-600">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          
          <div className="text-sm text-red-600">
            <p className="font-semibold mb-2">💡 What to do next:</p>
            <ul className="list-disc list-inside space-y-1 text-red-700">
              <li>Check your input parameters and try again</li>
              <li>Wait a moment and retry - this might be a temporary issue</li>
              <li>Contact support with the Request ID if the problem persists</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;