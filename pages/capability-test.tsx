import React from 'react';
import { useCapabilities } from '../lib/capabilities';
import { EngineDisabledBanner, DownloadDisabledBanner, CancelDisabledBanner } from '../components/common/CapabilityBanner';
import { SystemStatusPanel, useSystemStatusPanel } from '../components/common/SystemStatusPanel';
import { ErrorDisplay } from '../components/common/ErrorDisplay';
import { handleError } from '../lib/globalErrorHandler';

export default function CapabilityTestPage() {
  const { capabilities, loading, error, refresh } = useCapabilities();
  const systemStatus = useSystemStatusPanel();

  const testError = () => {
    // Simulate different types of errors
    const errors = [
      { status: 422, message: 'Validation failed', requestId: 'req_123' },
      { status: 500, message: 'Internal server error', requestId: 'req_456' },
      { status: 401, message: 'Unauthorized' },
      { message: 'Network timeout' },
    ];
    
    const randomError = errors[Math.floor(Math.random() * errors.length)];
    handleError(randomError, 'CapabilityTest');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-2xl font-bold mb-6">Capability System Test</h1>
          
          {loading && (
            <div className="flex items-center gap-2 text-blue-600 mb-4">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Loading capabilities...</span>
            </div>
          )}

          {error && (
            <div className="mb-4">
              <ErrorDisplay 
                error={{ 
                  message: error, 
                  timestamp: Date.now(), 
                  userSafe: true 
                }} 
                onRetry={refresh}
                compact
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-lg font-semibold mb-4">Current Capabilities</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Auth Required:</span>
                  <span className={capabilities.authRequired ? 'text-green-600' : 'text-red-600'}>
                    {capabilities.authRequired ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Runway Engine:</span>
                  <span className={capabilities.engineRunwayEnabled ? 'text-green-600' : 'text-red-600'}>
                    {capabilities.engineRunwayEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Downloads:</span>
                  <span className={capabilities.signedUrlEnabled ? 'text-green-600' : 'text-red-600'}>
                    {capabilities.signedUrlEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Cancel Actions:</span>
                  <span className={capabilities.cancelEnabled ? 'text-green-600' : 'text-red-600'}>
                    {capabilities.cancelEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Publish & Share:</span>
                  <span className={capabilities.publishEnabled ? 'text-green-600' : 'text-red-600'}>
                    {capabilities.publishEnabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold mb-4">System Info</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Version:</span>
                  <span className="font-mono">{capabilities.version}</span>
                </div>
                <div className="flex justify-between">
                  <span>Build ID:</span>
                  <span className="font-mono">{capabilities.buildId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Environment:</span>
                  <span className="font-mono">{process.env.NODE_ENV}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={refresh}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Refresh Capabilities
            </button>
            <button
              onClick={testError}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Test Error Handler
            </button>
            <button
              onClick={systemStatus.toggle}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Toggle System Panel
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Capability Banners</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Engine Disabled Banner:</h3>
              <EngineDisabledBanner />
            </div>
            <div>
              <h3 className="font-medium mb-2">Download Disabled Banner:</h3>
              <DownloadDisabledBanner />
            </div>
            <div>
              <h3 className="font-medium mb-2">Cancel Disabled Banner:</h3>
              <CancelDisabledBanner />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Feature Behavior</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Create Video Button:</h3>
              <button
                disabled={!capabilities.engineRunwayEnabled}
                className={`px-4 py-2 rounded transition-colors ${
                  capabilities.engineRunwayEnabled
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Create Video {!capabilities.engineRunwayEnabled && '(Disabled)'}
              </button>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Download Button:</h3>
              <button
                disabled={!capabilities.signedUrlEnabled}
                className={`px-4 py-2 rounded transition-colors ${
                  capabilities.signedUrlEnabled
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Download {!capabilities.signedUrlEnabled && '(Disabled)'}
              </button>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Cancel Button:</h3>
              <button
                disabled={!capabilities.cancelEnabled}
                className={`px-4 py-2 rounded transition-colors ${
                  capabilities.cancelEnabled
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Cancel {!capabilities.cancelEnabled && '(Disabled)'}
              </button>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">Publish Button:</h3>
              <button
                disabled={!capabilities.publishEnabled}
                className={`px-4 py-2 rounded transition-colors ${
                  capabilities.publishEnabled
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Publish {!capabilities.publishEnabled && '(Disabled)'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* System Status Panel */}
      <SystemStatusPanel 
        isOpen={systemStatus.isOpen} 
        onToggle={systemStatus.toggle} 
      />
    </div>
  );
}