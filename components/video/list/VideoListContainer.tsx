import { useState, useEffect } from "react";
import { StatusFilter } from "./components/StatusFilter";
import { SortByDate } from "./components/SortByDate";
import { VideoList } from "./components/VideoList";
import { LoadingState } from "./components/LoadingState";
import { EmptyState } from "./components/EmptyState";
import { CreateVideoButton } from "./components/CreateVideoButton";
import UserMenu from "../../common/UserMenu";
import { LanguageSelector } from "../../common/LanguageSelector";
import { RefreshButton } from "./components/RefreshButton";

import { useVideoListContext } from "./hooks/VideoListContext";
import { useVideoListQuery } from "./hooks/useVideoListQuery";
import { useAuth } from "../../../contexts/AuthContext";
import { useLanguage } from "../../../contexts/LanguageContext";
import { MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

export function VideoListContainer() {
  const { status, setStatus, sort, setSort, search, setSearch, initialized } =
    useVideoListContext();

  const {
    videos,
    loading,
    timeoutError,
    backgroundRetrying,
    canNext,
    canPrev,
    goNext,
    goPrev,
    currentPage,
    refetch,
    manualRefresh,
    prependVideo,
    removeVideo,
    isError,
    error,
  } = useVideoListQuery();

  const { logout, user, isAuthenticated, isLoading: authLoading, token, isValidating } = useAuth();
  const { t } = useLanguage();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isFilterTransitioning, setIsFilterTransitioning] = useState(false);
  const [stableEmptyState, setStableEmptyState] = useState<'loading' | 'filters' | 'notasks' | 'hasdata' | 'error'>('loading');

  // Track current filter state
  const hasFilters = status !== "All" || search.trim() !== "";

  // Update stable empty state based on current conditions
  useEffect(() => {
    if (loading || isFilterTransitioning) {
      setStableEmptyState('loading');
    } else if (isError && !videos.length) {
      setStableEmptyState('error');
    } else if (videos.length > 0) {
      setStableEmptyState('hasdata');
    } else if (hasFilters) {
      setStableEmptyState('filters');
    } else {
      setStableEmptyState('notasks');
    }

    // Clear filter transition after state is stable
    if (isFilterTransitioning && !loading) {
      const timer = setTimeout(() => {
        setIsFilterTransitioning(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [loading, isFilterTransitioning, videos.length, hasFilters, isError]);

  // Auto-hide timeout error when we have data (server is working)
  useEffect(() => {
    if (videos.length > 0 && timeoutError) {
      // If we have videos, the server is clearly working, so hide timeout error
      console.log('[VideoListContainer] Auto-hiding timeout error - server is working');
    }
  }, [videos.length, timeoutError]);

  if (!initialized) return null;

  // Show loading while auth is loading or validating
  if (authLoading || isValidating) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-4 text-white">
        <div className="flex items-center justify-center min-h-[400px]">
          <LoadingState />
        </div>
      </section>
    );
  }

  // Show error if not authenticated
  if (!token && !authLoading) {
    return (
      <section className="max-w-7xl mx-auto px-4 py-4 text-white">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">{t('error.authRequired')}</h2>
            <p className="text-neutral-400">{t('error.authRequiredDescription')}</p>
          </div>
        </div>
      </section>
    );
  }

  const handleRefresh = async () => {
    try {
      await manualRefresh(); // Use manualRefresh to preserve current page and cancel pending requests
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    }
  };

  // Handle filter changes with transition state
  const handleStatusChange = (newStatus: typeof status) => {
    if (newStatus !== status) {
      setIsFilterTransitioning(true);
      setStatus(newStatus);
    }
  };

  const handleSearchChange = (newSearch: string) => {
    if (newSearch !== search) {
      setIsFilterTransitioning(true);
      setSearch(newSearch);
    }
  };

  const handleClearSearch = () => {
    if (search.trim()) {
      setIsFilterTransitioning(true);
      setSearch("");
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 py-4 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold">{t('videoList.filmInbox')}</h1>
        <div className="flex items-center gap-3">
          <LanguageSelector compact />
          <CreateVideoButton variant="page" />
          <UserMenu />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-neutral-900 rounded-lg p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-neutral-400" />
              <input
                type="text"
                placeholder={t('videoList.searchPlaceholder')}
                className="w-full pl-10 pr-10 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
              {search && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-neutral-400 hover:text-white transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          {/* Filters and Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <StatusFilter value={status} onChange={handleStatusChange} />
            <SortByDate value={sort} onChange={setSort} />
            <RefreshButton onRefresh={handleRefresh} loading={loading} />
          </div>
        </div>

        {/* Last Updated */}
        {lastUpdated && (
          <div className="mt-3 pt-3 border-t border-neutral-800">
            <span className="text-sm text-neutral-400">
              {t('videoList.lastUpdated')}: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>

      {/* Timeout Error */}
      {timeoutError && (
        <div className="mb-6 p-4 rounded-lg bg-yellow-900/20 border border-yellow-700/30 text-yellow-200">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="font-semibold mb-1 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-yellow-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {t('error.serverSlow')}
              </div>
              <p className="text-yellow-300/80 mb-2">
                {t('error.serverSlowDescription')}
              </p>
              {backgroundRetrying && (
                <p className="text-blue-400 text-xs flex items-center gap-1">
                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('loading.retrying')}
                </p>
              )}
            </div>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-white text-sm font-medium transition whitespace-nowrap"
            >
              {t('action.retry')}
            </button>
          </div>
        </div>
      )}

      {/* Content - Completely stable layout with no flicker */}
      <div className="min-h-[400px]">
        {stableEmptyState === 'loading' && !timeoutError && <LoadingState />}
        
        {stableEmptyState === 'error' && (
          <EmptyState 
            showFiltersEmpty={false}
            type="error"
            errorMessage={error?.message || t('error.serverError')}
            requestId={error?.requestId}
            onRetry={handleRefresh}
            loading={loading}
          />
        )}
        
        {stableEmptyState === 'filters' && (
          <EmptyState 
            showFiltersEmpty={true} 
            type="no-results"
            loading={loading}
          />
        )}

        {stableEmptyState === 'notasks' && (
          <EmptyState 
            showFiltersEmpty={false} 
            type="no-videos"
            loading={loading}
          />
        )}

        {stableEmptyState === 'hasdata' && (
          <>
            <VideoList videos={videos} removeVideo={removeVideo} loading={loading} />

            {/* Pagination */}
            <div className="flex justify-center items-center mt-8 gap-4">
              <button
                onClick={goPrev}
                disabled={!canPrev || loading}
                className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {t('action.prev')}
              </button>

              <span className="text-white font-semibold px-4">
                {t('videoList.page')} {currentPage}
              </span>

              <button
                onClick={goNext}
                disabled={!canNext || loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {t('action.next')}
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
