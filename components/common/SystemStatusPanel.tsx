import React, { useState } from 'react';
import { 
  CogIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useLanguage } from '../../contexts/LanguageContext';
import { useCapabilities } from '../../lib/capabilities';

interface SystemStatusPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function SystemStatusPanel({ isOpen, onToggle }: SystemStatusPanelProps) {
  const { t } = useLanguage();
  const { capabilities, loading, error, refresh, isLoaded } = useCapabilities();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const getStatusIcon = (enabled: boolean) => {
    return enabled ? (
      <CheckCircleIcon className="w-4 h-4 text-green-500" />
    ) : (
      <XCircleIcon className="w-4 h-4 text-red-500" />
    );
  };

  const getStatusText = (enabled: boolean) => {
    return enabled ? 'Enabled' : 'Disabled';
  };

  const getStatusColor = (enabled: boolean) => {
    return enabled ? 'text-green-700' : 'text-red-700';
  };

  return (
    <div className="fixed bottom-4 right-4 z-40">
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg shadow-lg transition-colors"
        title="System Status"
      >
        <CogIcon className="w-4 h-4" />
        <span className="text-sm">System</span>
        {isOpen ? (
          <ChevronDownIcon className="w-4 h-4" />
        ) : (
          <ChevronUpIcon className="w-4 h-4" />
        )}
      </button>

      {/* Status Panel */}
      {isOpen && (
        <div className="absolute bottom-12 right-0 w-80 bg-white border border-gray-200 rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <InformationCircleIcon className="w-5 h-5 text-blue-500" />
              <h3 className="font-semibold text-gray-900">System Status</h3>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <ArrowPathIcon className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {/* App Info */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Application</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Version:</span>
                  <span className="font-mono text-gray-900">
                    {capabilities.version || '1.0.0'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Build ID:</span>
                  <span className="font-mono text-gray-900">
                    {capabilities.buildId || 'dev'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Environment:</span>
                  <span className="font-mono text-gray-900">
                    {process.env.NODE_ENV || 'development'}
                  </span>
                </div>
              </div>
            </div>

            {/* Capabilities Status */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Feature Capabilities</h4>
              
              {loading && !isLoaded && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  <span>Loading capabilities...</span>
                </div>
              )}

              {error && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
                  <p className="text-xs text-yellow-800">
                    Failed to load capabilities. Using safe defaults.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(capabilities.authRequired)}
                    <span className="text-sm text-gray-700">Authentication Required</span>
                  </div>
                  <span className={`text-xs font-medium ${getStatusColor(capabilities.authRequired)}`}>
                    {getStatusText(capabilities.authRequired)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(capabilities.engineRunwayEnabled)}
                    <span className="text-sm text-gray-700">Runway Engine</span>
                  </div>
                  <span className={`text-xs font-medium ${getStatusColor(capabilities.engineRunwayEnabled)}`}>
                    {getStatusText(capabilities.engineRunwayEnabled)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(capabilities.signedUrlEnabled)}
                    <span className="text-sm text-gray-700">Video Downloads</span>
                  </div>
                  <span className={`text-xs font-medium ${getStatusColor(capabilities.signedUrlEnabled)}`}>
                    {getStatusText(capabilities.signedUrlEnabled)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(capabilities.cancelEnabled)}
                    <span className="text-sm text-gray-700">Cancel Actions</span>
                  </div>
                  <span className={`text-xs font-medium ${getStatusColor(capabilities.cancelEnabled)}`}>
                    {getStatusText(capabilities.cancelEnabled)}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(capabilities.publishEnabled)}
                    <span className="text-sm text-gray-700">Publish & Share</span>
                  </div>
                  <span className={`text-xs font-medium ${getStatusColor(capabilities.publishEnabled)}`}>
                    {getStatusText(capabilities.publishEnabled)}
                  </span>
                </div>
              </div>
            </div>

            {/* Last Updated */}
            {isLoaded && (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Last updated: {new Date().toLocaleTimeString()}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Hook for managing system status panel
export function useSystemStatusPanel() {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = () => setIsOpen(!isOpen);
  const close = () => setIsOpen(false);
  const open = () => setIsOpen(true);

  return {
    isOpen,
    toggle,
    close,
    open,
  };
}