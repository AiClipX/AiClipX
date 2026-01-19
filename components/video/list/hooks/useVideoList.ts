import { useEffect, useRef, useState } from "react";
import { useVideoListContext } from "./VideoListContext";
import { fetchVideosCursor } from "../../services/videoService";
import { Video, VideoStatus } from "../../types/videoTypes";
import { PollingManager } from "../../../../lib/pollingManager";

/* =====================
   CONFIG
===================== */
const LIMIT = 12;
const SEARCH_DEBOUNCE_MS = 800;
const POLL_INTERVAL_MS = 4000; // 4 seconds - sensible interval
const INITIAL_LOAD_TIMEOUT_MS = 30000; // 30 seconds
const RETRY_INTERVAL_MS = 10000; // 10 seconds for background retry

const CREATING_STATUSES: VideoStatus[] = ["queued", "processing"];

export function useVideoList() {
  const { status, sort, search, currentPage, setCurrentPage } = useVideoListContext();

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeoutError, setTimeoutError] = useState(false);
  const [hasNext, setHasNext] = useState(false);

  const pagesCache = useRef<Map<number, Video[]>>(new Map());
  const pageCursors = useRef<Map<number, string | null>>(new Map());

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  
  // Track if this is initial load and if we're retrying in background
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [backgroundRetrying, setBackgroundRetrying] = useState(false);
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollingManagerRef = useRef<PollingManager | null>(null);
  const isFetchingRef = useRef(false);

  /* =====================
     SEARCH DEBOUNCE
  ===================== */
  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedSearch(search.trim()),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(t);
  }, [search]);

  /* =====================
     PREPEND VIDEO MỚI
  ===================== */
  const prependVideo = (newVideo: Video) => {
    if (status !== "All" && newVideo.status !== status) return;

    setVideos((prev) => {
      const map = new Map(prev.map((v) => [v.id, v]));
      map.set(newVideo.id, newVideo);
      return [
        newVideo,
        ...Array.from(map.values()).filter((v) => v.id !== newVideo.id),
      ];
    });

    const page1 = pagesCache.current.get(1);
    if (page1) {
      const map = new Map(page1.map((v) => [v.id, v]));
      map.set(newVideo.id, newVideo);
      pagesCache.current.set(1, [
        newVideo,
        ...Array.from(map.values()).filter((v) => v.id !== newVideo.id),
      ]);
    }
  };

  /* =====================
     REMOVE VIDEO
  ===================== */
  const removeVideo = (videoId: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== videoId));
    
    // Clear cache to force refresh on next page load
    pagesCache.current.clear();
    pageCursors.current.clear();
  };

  /* =====================
     FETCH PAGE
  ===================== */
  const fetchPage = async (
    pageIndex: number,
    force = false,
    silent = false
  ) => {
    // Prevent concurrent duplicate calls
    if (isFetchingRef.current && !force) {
      console.log('[useVideoList] Skipping fetch - already in progress');
      return;
    }

    isFetchingRef.current = true;

    // Only show loading for non-silent requests and when we don't have data
    if (!silent && (videos.length === 0 || force)) {
      setLoading(true);
    }
    setTimeoutError(false);

    // Clear any existing timers
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }

    // Set timeout for initial load only
    if (isInitialLoad && !silent) {
      timeoutTimerRef.current = setTimeout(() => {
        setTimeoutError(true);
        setBackgroundRetrying(true);
        // Don't stop loading, continue in background
      }, INITIAL_LOAD_TIMEOUT_MS);
    }

    // Use cache if available and not forcing
    if (!force && pagesCache.current.has(pageIndex)) {
      const cachedVideos = pagesCache.current.get(pageIndex)!;
      setVideos(cachedVideos);
      setCurrentPage(pageIndex);
      setHasNext(pageCursors.current.get(pageIndex) != null);
      if (!silent && (videos.length === 0 || force)) {
        setLoading(false);
      }
      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current);
        timeoutTimerRef.current = null;
      }
      isFetchingRef.current = false;
      return;
    }

    try {
      let cursor =
        pageIndex === 1 ? null : pageCursors.current.get(pageIndex - 1) ?? null;

      const res = await fetchVideosCursor({
        limit: LIMIT,
        cursor: cursor ?? undefined,
        sort: sort === "oldest" ? "createdAt_asc" : "createdAt_desc",
        q: debouncedSearch || undefined,
        status: status === "All" ? undefined : status,
      });

      const pageVideos = res.data.slice(0, LIMIT);
      pagesCache.current.set(pageIndex, pageVideos);
      pageCursors.current.set(pageIndex, res.nextCursor ?? null);

      setVideos(pageVideos);
      setCurrentPage(pageIndex);
      setHasNext(!!res.nextCursor);
      setLastUpdated(Date.now());
      
      // Success! Clear timeout and error states
      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current);
        timeoutTimerRef.current = null;
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
      setTimeoutError(false);
      setBackgroundRetrying(false);
      setIsInitialLoad(false);
    } catch (err) {
      console.error("Fetch page error:", err);
      
      if (isInitialLoad) {
        setTimeoutError(true);
        setBackgroundRetrying(true);
        
        // Start background retry
        if (!retryTimerRef.current) {
          retryTimerRef.current = setTimeout(() => {
            retryTimerRef.current = null;
            fetchPage(pageIndex, true, true); // Retry silently
          }, RETRY_INTERVAL_MS);
        }
      }
    } finally {
      if (!silent && (videos.length === 0 || force)) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  };

  /* =====================
     SMART POLLING with PollingManager
  ===================== */
  useEffect(() => {
    // Don't poll during search to avoid disrupting user experience
    if (debouncedSearch) {
      if (pollingManagerRef.current) {
        pollingManagerRef.current.stop();
      }
      return;
    }

    const hasCreating = videos.some((v) =>
      CREATING_STATUSES.includes(v.status)
    );

    if (hasCreating) {
      // Start polling if not already started
      if (!pollingManagerRef.current) {
        pollingManagerRef.current = new PollingManager(
          async () => {
            // When polling, we need to refresh with current filters
            // This ensures that if a video changes status and no longer matches
            // the current filter, it will be removed from the view immediately
            
            const pageToRefresh = currentPage;
            
            // Clear cache to force fresh fetch with current filters
            pagesCache.current.delete(pageToRefresh);
            
            // Fetch with current filter settings - this will automatically
            // exclude videos that no longer match the filter
            try {
              let cursor = pageToRefresh === 1 ? null : pageCursors.current.get(pageToRefresh - 1) ?? null;

              const res = await fetchVideosCursor({
                limit: LIMIT,
                cursor: cursor ?? undefined,
                sort: sort === "oldest" ? "createdAt_asc" : "createdAt_desc",
                q: debouncedSearch || undefined,
                status: status === "All" ? undefined : status,
              });

              const pageVideos = res.data.slice(0, LIMIT);
              
              // Update cache and state
              pagesCache.current.set(pageToRefresh, pageVideos);
              pageCursors.current.set(pageToRefresh, res.nextCursor ?? null);
              
              // Update videos state - this will automatically show empty state
              // if no videos match the current filter
              setVideos(pageVideos);
              setHasNext(!!res.nextCursor);
              setLastUpdated(Date.now());
              
            } catch (error) {
              console.error('Polling fetch error:', error);
            }
          },
          {
            interval: POLL_INTERVAL_MS,
            enableWhenHidden: false, // Stop polling when tab is hidden
            hiddenInterval: POLL_INTERVAL_MS * 3, // Slower when hidden
            maxConcurrent: 1, // Prevent concurrent requests
          }
        );
        pollingManagerRef.current.start();
      }
    } else {
      // Stop polling when no creating videos
      if (pollingManagerRef.current) {
        pollingManagerRef.current.stop();
        pollingManagerRef.current.destroy();
        pollingManagerRef.current = null;
      }
    }

    // Cleanup on unmount
    return () => {
      if (pollingManagerRef.current) {
        pollingManagerRef.current.destroy();
        pollingManagerRef.current = null;
      }
    };
  }, [videos, currentPage, debouncedSearch, status, sort]);

  /* =====================
     NAVIGATION
  ===================== */
  const goNext = () => {
    if (!hasNext || loading) return;
    setCurrentPage(currentPage + 1);
  };

  const goPrev = () => {
    if (currentPage <= 1 || loading) return;
    setCurrentPage(currentPage - 1);
  };

  /* =====================
     RESET ON STATUS / SORT / SEARCH (but preserve page when possible)
  ===================== */
  useEffect(() => {
    // Clear cache when filters change
    pagesCache.current.clear();
    pageCursors.current.clear();
    
    // Reset to page 1 when search/filter changes, but preserve page for sort-only changes
    const shouldResetPage = debouncedSearch.trim() !== "" || status !== "All";
    if (shouldResetPage && currentPage !== 1) {
      setCurrentPage(1);
    }
    
    // Don't set initial load for filter changes to prevent flicker
    const pageToFetch = shouldResetPage ? 1 : currentPage;
    fetchPage(pageToFetch, true, false); // Force but not silent to show proper loading
  }, [status, debouncedSearch]); // Removed sort from dependencies to preserve page on sort change

  // Handle sort changes separately to preserve current page
  useEffect(() => {
    // Only clear cache and refetch current page for sort changes
    pagesCache.current.clear();
    pageCursors.current.clear();
    fetchPage(currentPage, true, false); // Force refresh but show loading state
  }, [sort]);

  // Fetch current page when page changes (but not on initial load)
  useEffect(() => {
    if (!isInitialLoad) {
      fetchPage(currentPage, true);
    }
  }, [currentPage]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutTimerRef.current) {
        clearTimeout(timeoutTimerRef.current);
      }
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, []);

  return {
    videos,
    loading,
    timeoutError,
    backgroundRetrying,
    currentPage,
    canNext: hasNext,
    canPrev: currentPage > 1,
    goNext,
    goPrev,
    refetch: () => {
      pagesCache.current.clear();
      pageCursors.current.clear();
      setIsInitialLoad(false); // Manual refetch, don't show timeout
      setCurrentPage(1);
      fetchPage(1, true);
    },
    manualRefresh: async () => {
      // Manual refresh button - force refresh current page
      pagesCache.current.delete(currentPage);
      await fetchPage(currentPage, true, false);
    },
    prependVideo,
    removeVideo,
    lastUpdated,
    isPolling: pollingManagerRef.current?.isActive() ?? false,
  };
}
