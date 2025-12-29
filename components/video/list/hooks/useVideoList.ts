import { useQuery } from "@tanstack/react-query";
import { fetchVideos } from "../../services/videoService";
import { useVideoListContext } from "./VideoListContext";
import { Video } from "../../types/videoTypes";
import { useMemo, useState, useEffect } from "react";

const PAGE_SIZE = 12;
const DEBOUNCE_DELAY = 500; // ms
const LOAD_TIMEOUT = 30000; // 30s

export function useVideoList() {
  const { status, sort, search, page, initialized } = useVideoListContext();
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [timeoutError, setTimeoutError] = useState(false);

  // -----------------------------
  // Debounce search
  // -----------------------------
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(handler);
  }, [search]);

  // -----------------------------
  // Fetch + Smart polling
  // -----------------------------
  const query = useQuery<{ data: Video[] }, Error>({
    queryKey: ["videos", "list"],
    queryFn: fetchVideos,
    enabled: initialized,

    staleTime: 5000,

    refetchInterval: (query) => {
      const videos = query.state.data?.data;
      if (!videos) return false;

      const hasInProgress = videos.some(
        (v) => v.status === "Pending" || v.status === "Processing"
      );

      return hasInProgress ? 5000 : false;
    },

    retry: 2,
    retryDelay: 2000,
  });

  // -----------------------------
  // 30s loading timeout guard
  // -----------------------------
  useEffect(() => {
    if (!query.isLoading) {
      setTimeoutError(false);
      return;
    }

    const timer = setTimeout(() => {
      setTimeoutError(true);
    }, LOAD_TIMEOUT);

    return () => clearTimeout(timer);
  }, [query.isLoading]);

  // -----------------------------
  // Filter + Search + Sort
  // -----------------------------
  const filteredVideos = useMemo(() => {
    if (!query.data) return [];

    let result = [...query.data.data];

    if (status !== "All") {
      result = result.filter((v) => v.status === status);
    }

    if (debouncedSearch) {
      const keyword = debouncedSearch.toLowerCase();

      result = result.filter((v) => {
        const title = v.title ?? "";
        return title.toLowerCase().includes(keyword);
      });
    }

    result.sort((a, b) =>
      sort === "oldest"
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return result;
  }, [query.data, status, sort, debouncedSearch]);

  // -----------------------------
  // Pagination
  // -----------------------------
  const paginatedVideos = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredVideos.slice(start, start + PAGE_SIZE);
  }, [filteredVideos, page]);

  // -----------------------------
  // Public API
  // -----------------------------
  return {
    videos: paginatedVideos,
    total: filteredVideos.length,
    pageSize: PAGE_SIZE,
    loading: query.isLoading,
    timeoutError,
    refetch: query.refetch,
  };
}
