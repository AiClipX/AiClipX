import { useRouter } from "next/router";
import { useVideoListContext } from "../hooks/VideoListContext";
import { useLanguage } from "../../../../contexts/LanguageContext";
import { PlusIcon, MagnifyingGlassIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface Props {
  onCreateClick?: () => void;
  showFiltersEmpty: boolean;
  type?: 'error';
  errorMessage?: string;
  requestId?: string;
  onRetry?: () => void;
}

export function EmptyState({ 
  onCreateClick, 
  showFiltersEmpty, 
  type,
  errorMessage,
  requestId,
  onRetry 
}: Props) {
  const router = useRouter();
  const { setStatus, setSearch } = useVideoListContext();
  const { t } = useLanguage();

  const handleReset = () => {
    setStatus("All");
    setSearch("");
  };

  const handleCreateClick = () => {
    if (onCreateClick) {
      onCreateClick();
    } else {
      router.push('/create');
    }
  };

  // Error state
  if (type === 'error') {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
        </div>
        <p className="text-lg font-medium text-white mb-2">
          {t('error.unknown')}
        </p>
        <p className="text-sm text-neutral-500 mb-4 max-w-md text-center">
          {errorMessage || t('error.serverError')}
        </p>
        {requestId && (
          <p className="text-xs text-neutral-600 mb-4">
            {t('error.requestId')}: {requestId}
          </p>
        )}
        <div className="h-12 flex items-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm font-medium transition"
            >
              {t('action.retry')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
      <div className="mx-auto w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mb-6">
        {showFiltersEmpty ? (
          <MagnifyingGlassIcon className="w-8 h-8 text-neutral-500" />
        ) : (
          <PlusIcon className="w-8 h-8 text-neutral-500" />
        )}
      </div>

      <p className="text-lg font-medium text-white mb-2">
        {showFiltersEmpty ? t('empty.noResultsWithFilters.title') : t('empty.noVideos.title')}
      </p>
      <p className="text-sm text-neutral-500 mt-1 mb-6 max-w-md text-center">
        {showFiltersEmpty 
          ? t('empty.noResultsWithFilters.description')
          : t('empty.createFirstFilm')
        }
      </p>
      
      {/* Always show a button to maintain consistent layout height */}
      <div className="h-12 flex items-center gap-3">
        {showFiltersEmpty ? (
          <>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-neutral-600 hover:bg-neutral-700 rounded text-white text-sm font-medium transition"
            >
              {t('empty.noResultsWithFilters.action')}
            </button>
            <button
              onClick={handleCreateClick}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-white text-sm font-medium transition"
            >
              <PlusIcon className="w-4 h-4" />
              {t('empty.noVideos.action')}
            </button>
          </>
        ) : (
          <button
            onClick={handleCreateClick}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded text-white font-medium transition"
          >
            <PlusIcon className="w-5 h-5" />
            {t('empty.noVideos.action')}
          </button>
        )}
      </div>
    </div>
  );
}
