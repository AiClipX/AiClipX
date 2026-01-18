import React, { useEffect, useState } from 'react';
import { useEvidenceMode } from '../../contexts/EvidenceModeContext';
import { apiCallTracker, APICall, formatEndpoint, getStatusColor, formatTimestamp } from '../../lib/apiCallTracker';
import { 
  ClipboardDocumentIcon, 
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon 
} from '@heroicons/react/24/outline';

const EvidenceModePanel: React.FC = () => {
  const { isEnabled } = useEvidenceMode();
  const [calls, setCalls] = useState<APICall[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isEnabled) return;

    // Initial load
    setCalls(apiCallTracker.getCalls(5));

    // Subscribe to updates
    const unsubscribe = apiCallTracker.subscribe(() => {
      setCalls(apiCallTracker.getCalls(5));
    });

    return () => {
      unsubscribe();
    };
  }, [isEnabled]);

  if (!isEnabled) return null;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearCalls = () => {
    apiCallTracker.clear();
    setCalls([]);
  };

  const lastCall = calls[0];

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 bg-white border-2 border-blue-500 rounded-lg shadow-2xl">
      {/* Header */}
      <div className="bg-blue-500 text-white px-4 py-2 flex items-center justify-between rounded-t-lg">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="font-semibold">Evidence Mode</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="hover:bg-blue-600 p-1 rounded"
          >
            {isExpanded ? (
              <ChevronDownIcon className="w-5 h-5" />
            ) : (
              <ChevronUpIcon className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={clearCalls}
            className="hover:bg-blue-600 p-1 rounded"
            title="Clear history"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 max-h-96 overflow-y-auto">
          {/* Last Action */}
          {lastCall && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-xs font-semibold text-yellow-800 mb-2">
                LAST ACTION
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{lastCall.method}</span>
                  <span className={`font-semibold ${getStatusColor(lastCall.status)}`}>
                    {lastCall.status || 'pending'}
                  </span>
                </div>
                <div className="text-xs text-gray-600 truncate" title={lastCall.endpoint}>
                  {formatEndpoint(lastCall.endpoint)}
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-yellow-200">
                  <span className="text-xs font-mono text-gray-700">
                    {lastCall.requestId}
                  </span>
                  <button
                    onClick={() => copyToClipboard(lastCall.requestId, lastCall.id)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Copy Request ID"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                  </button>
                </div>
                {copiedId === lastCall.id && (
                  <div className="text-xs text-green-600 text-center">Copied!</div>
                )}
              </div>
            </div>
          )}

          {/* API Calls History */}
          <div className="text-xs font-semibold text-gray-700 mb-2">
            LAST 5 API CALLS
          </div>
          
          {calls.length === 0 ? (
            <div className="text-sm text-gray-500 text-center py-4">
              No API calls yet
            </div>
          ) : (
            <div className="space-y-2">
              {calls.map((call, index) => (
                <div
                  key={call.id}
                  className={`p-2 rounded border ${
                    index === 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-700">
                        {call.method}
                      </span>
                      <span className={`text-xs font-semibold ${getStatusColor(call.status)}`}>
                        {call.status || '...'}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTimestamp(call.timestamp)}
                    </span>
                  </div>
                  
                  <div className="text-xs text-gray-600 truncate mb-1" title={call.endpoint}>
                    {formatEndpoint(call.endpoint)}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-gray-500 truncate flex-1">
                      {call.requestId}
                    </span>
                    <button
                      onClick={() => copyToClipboard(call.requestId, call.id)}
                      className="ml-2 text-gray-400 hover:text-blue-600"
                      title="Copy Request ID"
                    >
                      <ClipboardDocumentIcon className="w-3 h-3" />
                    </button>
                  </div>
                  
                  {copiedId === call.id && (
                    <div className="text-xs text-green-600 text-center mt-1">Copied!</div>
                  )}
                  
                  {call.error && (
                    <div className="text-xs text-red-600 mt-1 truncate" title={call.error}>
                      Error: {call.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Help Text */}
          <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
            <div className="font-semibold mb-1">📹 Evidence Capture Tips:</div>
            <ul className="list-disc list-inside space-y-1">
              <li>Use Jam.dev or screen recording</li>
              <li>Show RequestID for each action</li>
              <li>Mask sensitive data (tokens, emails)</li>
              <li>Include timestamps</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceModePanel;