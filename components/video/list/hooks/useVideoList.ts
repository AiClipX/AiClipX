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
/* =====================
   MAIN HOOK - FIX PAGINATION
===================== */
export function useVideoList() {
  const { status, sort, search } = useVideoListContext();

  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [timeoutError, setTimeoutError] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasNext, setHasNext] = useState(false);

  const pagesCache = useRef<Map<number, Video[]>>(new Map()); // cache theo page index
  const pageCursors = useRef<Map<number, string | null>>(new Map()); // cursor cuối mỗi page

  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchCursorRef = useRef<string | null>(null);
  const searchRequestRef = useRef(0);
  const [isCapped, setIsCapped] = useState(false);

  /* =====================
     SEARCH DEBOUNCE
  ===================== */
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 1000);
    return () => clearTimeout(t);
  }, [search]);

  /* =====================
     FETCH PAGE (NORMAL MODE)
  ===================== */
  const fetchPage = async (pageIndex: number) => {
    setLoading(true);
    setTimeoutError(false);

    // nếu đã cache → lấy từ cache
    if (pagesCache.current.has(pageIndex)) {
      setVideos(pagesCache.current.get(pageIndex)!);
      setCurrentPage(pageIndex);
      setHasNext(pageCursors.current.get(pageIndex) != null);
      setLoading(false);
      return;
    }

    try {
      // lấy cursor cuối page trước
      const prevCursor = pageCursors.current.get(pageIndex - 1) ?? null;

      const res = await fetchVideosCursor({
        limit: LIMIT,
        cursor: prevCursor ?? undefined,
        sort: sort === "oldest" ? "createdAt_asc" : "createdAt_desc",
      });

      let newVideos = res.data;
      if (status !== "All")
        newVideos = newVideos.filter((v) => v.status === status);

      // lưu cache và cursor cuối page
      pagesCache.current.set(pageIndex, newVideos);
      pageCursors.current.set(pageIndex, res.nextCursor ?? null);

      setVideos(newVideos);
      setCurrentPage(pageIndex);
      setHasNext(res.nextCursor != null);
    } catch (err) {
      console.error(err);
      setTimeoutError(true);
    } finally {
      setLoading(false);
    }
  };

  /* =====================
     NAVIGATION
  ===================== */
  const goNext = () => {
    if (debouncedSearch || !hasNext) return;
    fetchPage(currentPage + 1);
  };

  const goPrev = () => {
    if (debouncedSearch || currentPage <= 1) return;
    fetchPage(currentPage - 1);
  };

  /* =====================
     RESET ON STATUS / SORT
  ===================== */
  useEffect(() => {
    if (debouncedSearch) return;
    pagesCache.current.clear();
    pageCursors.current.clear();
    fetchPage(1);
  }, [status, sort, debouncedSearch]);

  /* =====================
     SEARCH MODE
  ===================== */
  useEffect(() => {
    if (!debouncedSearch) return;

    let cancelled = false;

    // reset page khi search mới
    setCurrentPage(1);
    pagesCache.current.clear();
    pageCursors.current.clear();

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
          sort: sort === "oldest" ? "createdAt_asc" : "createdAt_desc",
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

  const loadMoreResults = async () => {
    if (!searchCursorRef.current) return;
    setLoading(true);

    const res = await fetchVideosCursor({
      limit: LIMIT,
      cursor: searchCursorRef.current,
      sort: sort === "oldest" ? "createdAt_asc" : "createdAt_desc",
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

  return {
    videos,
    loading,
    timeoutError,
    currentPage,
    canNext: !debouncedSearch && hasNext,
    canPrev: !debouncedSearch && currentPage > 1,
    goNext,
    goPrev,
    refetch: () => fetchPage(1),
    isCapped,
    loadMoreResults,
  };
}
