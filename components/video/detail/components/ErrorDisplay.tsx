import React, { useState } from 'react';
import { 
  ExclamationTriangleIcon, 
  ClipboardDocumentIcon,
  CheckIcon 
} from '@heroicons/react/24/outline';

interface ErrorDisplayProps {
  errorMessage: string;
  requestId?: string;
  className?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ 
  errorMessage, 
  requestId,
  className = '' 
}) => {
  const [copied, setCopied] = useState(false);

  const copyRequestId = () => {
    if (requestId) {
      navigator.clipboard.writeText(requestId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={`bg-red-50 border-2 border-red-200 rounded-lg p-6 ${className}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
        </div>
        
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Video Generation Failed
          </h3>
          
          <p className="text-red-700 mb-4">
            {errorMessage || 'An error occurred during video generation. Please try again.'}
          </p>
          
          {requestId && (
            <div className="bg-white border border-red-200 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-600 mb-1">
                    Request ID (for support)
                  </p>
                  <p className="font-mono text-sm text-gray-800">
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
          
          <div className="mt-4 text-sm text-red-600">
            <p>💡 <strong>What to do:</strong></p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-red-700">
              <li>Check your input parameters</li>
              <li>Try creating the video again</li>
              <li>Contact support with the Request ID if the issue persists</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorDisplay;