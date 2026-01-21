import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useVideoListContext } from "./VideoListContext";
import { fetchVideosCursor } from "../../services/videoService";
import { Video, VideoStatus } from "../../types/videoTypes";
import { PollingManager } from "../../../../lib/pollingManager";
import { useAuth } from "../../../../contexts/AuthContext";

/* =====================
   CONFIG
===================== */
const LIMIT = 12;
const SEARCH_DEBOUNCE_MS = 800;
const POLL_INTERVAL_MS = 4000; // 4 seconds - sensible interval
const INITIAL_LOAD_TIMEOUT_MS = 30000; // 30 seconds
const RETRY_INTERVAL_MS = 10000; // 10 seconds for background retry

const CREATING_STATUSES: VideoStatus[] = ["queued", "processing"];

export function useVideoListQuery() {
  const { status, sort, search, currentPage, setCurrentPage } = useVideoListContext();
  const { isAuthenticated, isLoading: authLoading, token, isValidating } = useAuth();
  const queryClient = useQueryClient();

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [lastUpdated, setLastUpdated] = useState<number>(0);
  const [timeoutError, setTimeoutError] = useState(false);
  const [backgroundRetrying, setBackgroundRetrying] = useState(false);
  
  const timeoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pollingManagerRef = useRef<PollingManager | null>(null);

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

  // Create query key for current page
  const createQueryKey = (page: number) => [
    'videos', 
    'list', 
    {
      page,
      status: status === "All" ? undefined : status,
      sort: sort === "oldest" ? "createdAt_asc" : "createdAt_desc",
      search: debouncedSearch || undefined,
    }
  ];

  const queryKey = createQueryKey(currentPage);

  // Use TanStack Query for data fetching
  const {
    data: queryData,
    isLoading,
    isError,
    error,
    refetch: queryRefetch,
    isFetching,
  } = useQuery({
    queryKey,
    queryFn: async ({ signal }) => {
      console.log('[useVideoListQuery] Fetching with key:', queryKey);
      
      // Clear timeout error when starting new request
      setTimeoutError(false);
      setBackgroundRetrying(false);
      
      // Set timeout for initial load
      if (currentPage === 1 && !queryClient.getQueryData(queryKey)) {
        timeoutTimerRef.current = setTimeout(() => {
          setTimeoutError(true);
          setBackgroundRetrying(true);
        }, INITIAL_LOAD_TIMEOUT_MS);
      }

      try {
        // Get cursor for pagination from previous page
        let cursor = null;
        if (currentPage > 1) {
          const prevPageKey = createQueryKey(currentPage - 1);
          const prevData = queryClient.getQueryData(prevPageKey) as any;
          cursor = prevData?.nextCursor || null;
        }

        const result = await fetchVideosCursor({
          limit: LIMIT,
          cursor: cursor ?? undefined,
          sort: sort === "oldest" ? "createdAt_asc" : "createdAt_desc",
          q: debouncedSearch || undefined,
          status: status === "All" ? undefined : status,
          signal,
        });

        // Clear timeout on success
        if (timeoutTimerRef.current) {
          clearTimeout(timeoutTimerRef.current);
          timeoutTimerRef.current = null;
        }
        setTimeoutError(false);
        setBackgroundRetrying(false);
        setLastUpdated(Date.now());

        return {
          videos: result.data.slice(0, LIMIT),
          nextCursor: result.nextCursor,
          hasNext: !!result.nextCursor,
        };
      } catch (err: any) {
        // Clear timeout on error
        if (timeoutTimerRef.current) {
          clearTimeout(timeoutTimerRef.current);
          timeoutTimerRef.current = null;
        }
        
        // Don't set timeout error for auth errors
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          setTimeoutError(false);
          setBackgroundRetrying(false);
        }
        
        throw err;
      }
    },
    enabled: !!token && !authLoading && !isValidating, // Only fetch when we have token and not loading/validating
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error: any) => {
      // Don't retry on auth errors
      if (error?.response?.status === 401 || error?.response?.status === 403) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Extract data from query result
  const videos = queryData?.videos || [];
  const hasNext = queryData?.hasNext || false;
  const loading = isLoading || isFetching;

  /* =====================
     PREPEND VIDEO MỚI
  ===================== */
  const prependVideo = (newVideo: Video) => {
    if (status !== "All" && newVideo.status !== status) return;

    // Update all relevant query cache entries
    queryClient.setQueriesData(
      { queryKey: ['videos', 'list'] },
      (oldData: any) => {
        if (!oldData) return oldData;
        
        const existingVideos = oldData.videos || [];
        const map = new Map(existingVideos.map((v: Video) => [v.id, v]));
        map.set(newVideo.id, newVideo);
        
        return {
          ...oldData,
          videos: [
            newVideo,
            ...Array.from(map.values()).filter((v: Video) => v.id !== newVideo.id),
          ],
        };
      }
    );
  };

  /* =====================
     REMOVE VIDEO
  ===================== */
  const removeVideo = (videoId: string) => {
    // Update all relevant query cache entries
    queryClient.setQueriesData(
      { queryKey: ['videos', 'list'] },
      (oldData: any) => {
        if (!oldData) return oldData;
        
        return {
          ...oldData,
          videos: (oldData.videos || []).filter((v: Video) => v.id !== videoId),
        };
      }
    );
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
            // Polling callback - invalidate current query to refetch
            await queryClient.invalidateQueries({ 
              queryKey: ['videos', 'list'],
              exact: false 
            });
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
  }, [videos, queryClient]);

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
     REFRESH FUNCTIONS
  ===================== */
  const refetch = () => {
    // Clear error states
    setTimeoutError(false);
    setBackgroundRetrying(false);
    
    // Clear timers
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    
    // Reset to page 1 and invalidate all video queries
    setCurrentPage(1);
    queryClient.invalidateQueries({ 
      queryKey: ['videos', 'list'],
      exact: false 
    });
  };

  const manualRefresh = async () => {
    // Clear error states
    setTimeoutError(false);
    setBackgroundRetrying(false);
    
    // Clear timers
    if (timeoutTimerRef.current) {
      clearTimeout(timeoutTimerRef.current);
      timeoutTimerRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    
    // Refetch current query
    await queryRefetch();
  };

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

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [status, debouncedSearch, sort]);

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
    refetch,
    manualRefresh,
    prependVideo,
    removeVideo,
    lastUpdated,
    isPolling: pollingManagerRef.current?.isActive() ?? false,
    isError,
    error,
  };
}