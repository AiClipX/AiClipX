import { useEffect, useRef, useState } from "react";
import { useVideoListContext } from "./VideoListContext";
import { fetchVideosCursor } from "../../services/videoService";
import { Video, VideoStatus } from "../../types/videoTypes";
import { PollingManager, formatLastUpdated } from "../../../../lib/pollingManager";

/* =====================
   CONFIG
===================== */
const LIMIT = 12;
const SEARCH_DEBOUNCE_MS = 800;
const MAX_ITEMS = 300;
const MAX_REQUESTS = 10;
const POLL_INTERVAL_MS = 4000; // 4 seconds - sensible interval
const INITIAL_LOAD_TIMEOUT_MS = 30000; // 30 seconds
const RETRY_INTERVAL_MS = 10000; // 10 seconds for background retry

const CREATING_STATUSES: VideoStatus[] = ["queued", "processing"];

export function useVideoList() {
  const { status, sort, search } = useVideoListContext();

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeoutError, setTimeoutError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const pagesCache = useRef<Map<number, Video[]>>(new Map());
  const pageCursors = useRef<Map<number, string | null>>(new Map());

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [isCapped, setIsCapped] = useState(false);
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

    if (!silent) {
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
      setVideos(pagesCache.current.get(pageIndex)!);
      setCurrentPage(pageIndex);
      setHasNext(pageCursors.current.get(pageIndex) != null);
      if (!silent) {
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
      if (!silent) {
        setLoading(false);
      }
      isFetchingRef.current = false;
    }
  };

  /* =====================
     SMART POLLING with PollingManager
  ===================== */
  useEffect(() => {
    // Don't poll during search
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
            // Preserve current page state during polling
            const pageToRefresh = currentPage;
            pagesCache.current.delete(pageToRefresh);
            await fetchPage(pageToRefresh, true, true);
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
  }, [videos, currentPage, debouncedSearch]);

  /* =====================
     NAVIGATION
  ===================== */
  const goNext = () => {
    if (!hasNext) return;
    fetchPage(currentPage + 1);
  };

  const goPrev = () => {
    if (currentPage <= 1) return;
    fetchPage(currentPage - 1);
  };

  /* =====================
     RESET ON STATUS / SORT / SEARCH
  ===================== */
  useEffect(() => {
    pagesCache.current.clear();
    pageCursors.current.clear();
    setCurrentPage(1);
    setIsInitialLoad(true);
    fetchPage(1, true);
  }, [status, sort, debouncedSearch]);

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
      fetchPage(1, true);
    },
    manualRefresh: async () => {
      // Manual refresh button - force refresh current page
      pagesCache.current.delete(currentPage);
      await fetchPage(currentPage, true, false);
    },
    isCapped,
    prependVideo,
    removeVideo,
    lastUpdated,
    isPolling: pollingManagerRef.current?.isActive() ?? false,
  };
}
