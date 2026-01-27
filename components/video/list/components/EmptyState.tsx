import { useRouter } from "next/router";
import { useVideoListContext } from "../hooks/VideoListContext";
import { useLanguage } from "../../../../contexts/LanguageContext";
import { useCapabilityCheck } from "../../../common/CapabilityGuard";
import { PlusIcon, MagnifyingGlassIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface Props {
  onCreateClick?: () => void;
  showFiltersEmpty: boolean;
  type?: 'error' | 'no-results' | 'no-videos';
  errorMessage?: string;
  requestId?: string;
  onRetry?: () => void;
  loading?: boolean;
}

export function EmptyState({ 
  onCreateClick, 
  showFiltersEmpty, 
  type = 'no-videos',
  errorMessage,
  requestId,
  onRetry,
  loading = false
}: Props) {
  const router = useRouter();
  const { setStatus, setSearch, status, search } = useVideoListContext();
  const { t } = useLanguage();
  const { canCreateVideo } = useCapabilityCheck();

  const handleReset = () => {
    setStatus("All");
    setSearch("");
  };

  const handleCreateClick = () => {
    if (onCreateClick) {
      onCreateClick();
    } else {
      router.push('/dashboard');
    }
  };

  // Error state with production-grade styling
  if (type === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
          </div>
          
          <h3 className="text-lg font-semibold text-white mb-2">
            {t('error.unknown')}
          </h3>
          
          <p className="text-sm text-neutral-400 mb-4 leading-relaxed">
            {errorMessage || t('error.serverError')}
          </p>
          
          {requestId && (
            <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-3 mb-6">
              <p className="text-xs text-neutral-500 mb-1">
                {t('error.requestId')}
              </p>
              <p className="text-xs font-mono text-neutral-300 break-all">
                {requestId}
              </p>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onRetry && (
              <button
                onClick={onRetry}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white text-sm font-medium transition-colors"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowPathIcon className="w-4 h-4" />
                )}
                {t('action.retry')}
              </button>
            )}
            
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white text-sm font-medium transition-colors"
            >
              {t('action.back')} to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No results with filters applied
  if (type === 'no-results' || showFiltersEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="max-w-md w-full text-center">
          <div className="mx-auto w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-6">
            <MagnifyingGlassIcon className="w-8 h-8 text-neutral-500" />
          </div>
          
          <h3 className="text-lg font-semibold text-white mb-2">
            {t('empty.noResults.title')}
          </h3>
          
          <p className="text-sm text-neutral-400 mb-6 leading-relaxed">
            {t('empty.noResults.description')}
          </p>

          {/* Show current filters */}
          <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 mb-6">
            <p className="text-xs text-neutral-500 mb-2">Current filters:</p>
            <div className="space-y-1 text-xs">
              {status !== "All" && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Status:</span>
                  <span className="text-white">{status}</span>
                </div>
              )}
              {search && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Search:</span>
                  <span className="text-white truncate ml-2">"{search}"</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg text-white text-sm font-medium transition-colors"
            >
              {t('action.clearFilters')}
            </button>
            
            {canCreateVideo && (
              <button
                onClick={handleCreateClick}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm font-medium transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                {t('empty.noVideos.action')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // No videos at all (first time user)
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-6">
          <PlusIcon className="w-10 h-10 text-white" />
        </div>
        
        <h3 className="text-xl font-semibold text-white mb-3">
          {t('empty.noVideos.title')}
        </h3>
        
        <p className="text-sm text-neutral-400 mb-8 leading-relaxed">
          {t('empty.noVideos.description')}
        </p>
        
        {canCreateVideo ? (
          <button
            onClick={handleCreateClick}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-lg text-white font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            <PlusIcon className="w-5 h-5" />
            {t('empty.noVideos.action')}
          </button>
        ) : (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-yellow-800">
              {t('capability.engineDisabled')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
