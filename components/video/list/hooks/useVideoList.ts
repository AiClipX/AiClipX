import { useEffect, useRef, useState } from "react";
import { useVideoListContext } from "./VideoListContext";
import { fetchVideosCursor } from "../../services/videoService";
import { Video } from "../../types/videoTypes";

/* =====================
   CONFIG
===================== */
const LIMIT = 12;
const SEARCH_DEBOUNCE_MS = 1000;
const MAX_ITEMS = 300;
const MAX_REQUESTS = 10;

/* =====================
   SORT MAPPER
===================== */
function resolveSort(sort: "newest" | "oldest") {
  return sort === "oldest" ? "createdAt_asc" : "createdAt_desc";
}

/* =====================
   CURSOR PAGINATION (NORMAL MODE)
===================== */
function useCursorPagination() {
  const [cursor, setCursor] = useState<string | null>(null);
  const [stack, setStack] = useState<string[]>([]);
  const [hasNext, setHasNext] = useState(false);

  return {
    cursor,
    hasNext,
    hasPrev: stack.length > 0,

    push(nextCursor?: string) {
      if (!nextCursor) {
        setHasNext(false);
        return;
      }
      setStack((s) => [...s, cursor!].filter(Boolean));
      setCursor(nextCursor);
      setHasNext(true);
    },

    pop() {
      setStack((s) => {
        const copy = [...s];
        const prev = copy.pop() ?? null;
        setCursor(prev);
        return copy;
      });
    },

    reset() {
      setCursor(null);
      setStack([]);
      setHasNext(false);
    },
  };
}

/* =====================
   MAIN HOOK
===================== */
export function useVideoList() {
  const { status, sort, search } = useVideoListContext();

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeoutError, setTimeoutError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const pagination = useCursorPagination();

  /* =====================
     SEARCH STATE
  ===================== */
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchCursorRef = useRef<string | null>(null);
  const searchRequestRef = useRef(0);
  const [isCapped, setIsCapped] = useState(false);

  /* =====================
     SEARCH DEBOUNCE
  ===================== */
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(t);
  }, [search]);

  /* =====================
     FETCH NORMAL PAGE
     chỉ chạy khi không search
  ===================== */
  useEffect(() => {
    if (debouncedSearch) return;

    pagination.reset();
    setCurrentPage(1);
    fetchPage(null, true);
  }, [status, sort, debouncedSearch]);

  const fetchPage = async (cursor: string | null, replace = true) => {
    setLoading(true);
    setTimeoutError(false);

    try {
      const res = await fetchVideosCursor({
        limit: LIMIT,
        cursor: cursor ?? undefined,
        sort: resolveSort(sort),
      });

      pagination.push(res.nextCursor);

      let newVideos = res.data;
      if (status !== "All") {
        newVideos = newVideos.filter((v) => v.status === status);
      }

      setVideos(newVideos);
    } catch (err) {
      console.error(err);
      setTimeoutError(true);
    } finally {
      setLoading(false);
    }
  };

  /* =====================
     SEARCH MODE (FULL DATASET)
  ===================== */
  useEffect(() => {
    if (!debouncedSearch) return;

    let cancelled = false;

    const runSearch = async () => {
      setLoading(true);
      setIsCapped(false);

      let collected: Video[] = [];
      let cursor: string | null = null;
      let requests = 0;

      while (
        !cancelled &&
        collected.length < MAX_ITEMS &&
        requests < MAX_REQUESTS
      ) {
        const res = await fetchVideosCursor({
          limit: LIMIT,
          cursor: cursor ?? undefined,
          sort: resolveSort(sort),
        });

        collected.push(...res.data);
        cursor = res.nextCursor ?? null;
        requests++;
        if (!cursor) break;
      }

      if (cancelled) return;

      if (cursor) setIsCapped(true);

      const keyword = debouncedSearch.toLowerCase();
      setVideos(
        collected
          .filter((v) => status === "All" || v.status === status)
          .filter(
            (v) =>
              v.title?.toLowerCase().includes(keyword) ||
              v.id.toLowerCase().includes(keyword)
          )
      );

      searchCursorRef.current = cursor;
      searchRequestRef.current = requests;
      setLoading(false);
    };

    runSearch();

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, status, sort]);

  /* =====================
     LOAD MORE SEARCH RESULTS
  ===================== */
  const loadMoreResults = async () => {
    if (!searchCursorRef.current) return;

    setLoading(true);

    const res = await fetchVideosCursor({
      limit: LIMIT,
      cursor: searchCursorRef.current,
      sort: resolveSort(sort),
    });

    searchCursorRef.current = res.nextCursor ?? null;
    if (!searchCursorRef.current) setIsCapped(false);

    setVideos((prev) => {
      const map = new Map(prev.map((v) => [v.id, v]));
      res.data.forEach((v) => map.set(v.id, v));

      return Array.from(map.values()).filter(
        (v) => status === "All" || v.status === status
      );
    });

    setLoading(false);
  };

  /* =====================
     PAGINATION ACTIONS
  ===================== */
  const goNext = () => {
    if (debouncedSearch || !pagination.hasNext) return;
    setCurrentPage((p) => p + 1);
    fetchPage(pagination.cursor);
  };

  const goPrev = () => {
    if (debouncedSearch || !pagination.hasPrev) return;
    setCurrentPage((p) => Math.max(1, p - 1));
    pagination.pop();
    fetchPage(pagination.cursor, true);
  };

  /* =====================
     PUBLIC API
  ===================== */
  return {
    videos,
    loading,
    timeoutError,
    currentPage,

    canNext: !debouncedSearch && pagination.hasNext,
    canPrev: !debouncedSearch && pagination.hasPrev,

    goNext,
    goPrev,
    refetch: () => fetchPage(null, true),

    isCapped,
    loadMoreResults,
  };
}
