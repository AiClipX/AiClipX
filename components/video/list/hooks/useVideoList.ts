import { useQuery } from "@tanstack/react-query";
import { fetchVideos } from "../../services/videoService";
import { useVideoListContext } from "./VideoListContext";
import { Video } from "../../types/videoTypes";
import { useMemo, useState, useEffect } from "react";

const PAGE_SIZE = 12;
const DEBOUNCE_DELAY = 500;
const POLLING_INTERVAL = 5000;
const FIRST_LOAD_TIMEOUT = 30000; // 30s

export function useVideoList() {
  const { status, sort, search, page, initialized } = useVideoListContext();

  const [debouncedSearch, setDebouncedSearch] = useState(search);

  /** Force polling after create */
  const [forcePolling, setForcePolling] = useState(false);

  /** Timeout handling */
  const [timeoutError, setTimeoutError] = useState(false);

  // ----------------------------------
  // Debounce search
  // ----------------------------------
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [search]);

  // ----------------------------------
  // Fetch + Smart Polling
  // ----------------------------------
  const query = useQuery<{ data: Video[] }, Error>({
    queryKey: ["videos", "list"],
    queryFn: fetchVideos,
    enabled: initialized,

    staleTime: 0,

    refetchInterval: (query) => {
      const videos = query.state.data?.data;

      // Force polling after create
      if (forcePolling) return POLLING_INTERVAL;

      // First load: allow polling
      if (!videos) return POLLING_INTERVAL;

      // Poll only when needed
      const hasInProgress = videos.some(
        (v) => v.status === "Pending" || v.status === "Processing"
      );

      return hasInProgress ? POLLING_INTERVAL : false;
    },

    retry: 2,
    retryDelay: 2000,
  });

  // ----------------------------------
  // First load timeout (30s)
  // ----------------------------------
  useEffect(() => {
    if (!initialized) return;
    if (query.data || query.isError) return;

    const timer = setTimeout(() => {
      if (!query.data) {
        setTimeoutError(true);
      }
    }, FIRST_LOAD_TIMEOUT);

    return () => clearTimeout(timer);
  }, [initialized, query.data, query.isError]);

  // Clear timeout error when data arrives
  useEffect(() => {
    if (query.data) {
      setTimeoutError(false);
    }
  }, [query.data]);

  // ----------------------------------
  // Stop force polling when done
  // ----------------------------------
  useEffect(() => {
    if (!query.data || !forcePolling) return;

    const hasInProgress = query.data.data.some(
      (v) => v.status === "Pending" || v.status === "Processing"
    );

    if (!hasInProgress) {
      setForcePolling(false);
    }
  }, [query.data, forcePolling]);

  // ----------------------------------
  // Filter + Search + Sort
  // ----------------------------------
  const filteredVideos = useMemo(() => {
    if (!query.data) return [];

    let result = [...query.data.data];

    if (status !== "All") {
      result = result.filter((v) => v.status === status);
    }

    if (debouncedSearch) {
      const keyword = debouncedSearch.toLowerCase();

      result = result.filter((v) =>
        (v.title ?? "").toLowerCase().includes(keyword)
      );
    }

    result.sort((a, b) =>
      sort === "oldest"
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return result;
  }, [query.data, status, sort, debouncedSearch]);

  // ----------------------------------
  // Pagination
  // ----------------------------------
  const paginatedVideos = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredVideos.slice(start, start + PAGE_SIZE);
  }, [filteredVideos, page]);

  // ----------------------------------
  // Public API
  // ----------------------------------
  return {
    videos: paginatedVideos,
    total: filteredVideos.length,
    pageSize: PAGE_SIZE,

    loading: query.isLoading,
    error: query.isError,
    timeoutError,

    refetch: async () => {
      setTimeoutError(false);
      return query.refetch();
    },

    startPollingAfterCreate: () => {
      setForcePolling(true);
      query.refetch();
    },
  };
}
