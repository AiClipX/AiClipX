import { useQuery } from "@tanstack/react-query";
import { useMemo, useEffect, useState } from "react";
import { Video } from "../../types/videoTypes";
import { useVideoListContext } from "./VideoListContext";
import { useCursorPagination } from "./useCursorPagination";
import { fetchVideosCursor } from "../../services/videoService";

const PAGE_SIZE = 10;
const POLLING_INTERVAL = 5000;
const TIMEOUT_MS = 6000;

export function useVideoList() {
  const { status, sort, search, initialized } = useVideoListContext();
  const cursorPagination = useCursorPagination<Video>({ pageSize: PAGE_SIZE });

  const [timeoutError, setTimeoutError] = useState(false);
  const query = useQuery({
    queryKey: ["videos", cursorPagination.cursor, sort, status, search],
    enabled: initialized,
    queryFn: async () => {
      setTimeoutError(false);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("TIMEOUT")), TIMEOUT_MS)
      );

      return Promise.race([
        fetchVideosCursor({
          limit: cursorPagination.limit,
          cursor: cursorPagination.cursor ?? undefined,
          sort: sort === "oldest" ? "createdAt_asc" : "createdAt_desc",
        }),
        timeoutPromise,
      ]);
    },
    refetchInterval: (query) => {
      const videos = query.state.data?.data;
      if (!videos) return POLLING_INTERVAL;
      const hasProcessing = videos.some(
        (v) => v.status === "Pending" || v.status === "Processing"
      );
      return hasProcessing ? POLLING_INTERVAL : false;
    },
    retry: false,
  });
  const { refetch } = query;

  // Detect timeout
  useEffect(() => {
    if (query.error instanceof Error && query.error.message === "TIMEOUT") {
      setTimeoutError(true);
    }
  }, [query.error]);

  // Apply nextCursor
  useEffect(() => {
    if (query.data) cursorPagination.applyResponse(query.data);
  }, [query.data]);

  // Reset cursor on filter/sort/search change
  useEffect(() => {
    cursorPagination.reset();
    refetch(); // fetch lại dữ liệu mới từ backend
  }, [status, sort, search]);

  // FRONTEND FILTER
  const videos = useMemo(() => {
    if (!query.data) return [];
    let result = [...query.data.data];
    if (status !== "All") result = result.filter((v) => v.status === status);
    if (search) {
      const keyword = search.toLowerCase();
      result = result.filter((v) =>
        (v.title ?? "").toLowerCase().includes(keyword)
      );
    }
    return result;
  }, [query.data, status, search]);

  // Current page = cursorHistory.length + 1
  const currentPage = cursorPagination.cursorHistory.length + 1;

  return {
    videos,
    loading: query.isLoading,
    error: query.isError,
    timeoutError,
    canNext: cursorPagination.hasNext,
    canPrev: cursorPagination.hasPrev,
    goNext: cursorPagination.goNext,
    goPrev: cursorPagination.goPrev,
    currentPage,
    refetch: query.refetch,
  };
}
