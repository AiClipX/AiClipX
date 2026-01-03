import { useEffect, useRef, useState } from "react";
import { useVideoListContext } from "./VideoListContext";
import { fetchVideosCursor } from "../../services/videoService";
import { Video, VideoStatus } from "../../types/videoTypes";

/* =====================
   CONFIG
===================== */
const LIMIT = 12;
const SEARCH_DEBOUNCE_MS = 1000;
const MAX_ITEMS = 300;
const MAX_REQUESTS = 10;
const POLL_INTERVAL_MS = 5000;

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
  const searchCursorRef = useRef<string | null>(null);
  const [isCapped, setIsCapped] = useState(false);

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
     FETCH PAGE
  ===================== */
  const fetchPage = async (pageIndex: number, force = false) => {
    // setLoading(true);
    setTimeoutError(false);

    if (!force && pagesCache.current.has(pageIndex)) {
      setVideos(pagesCache.current.get(pageIndex)!);
      setCurrentPage(pageIndex);
      setHasNext(pageCursors.current.get(pageIndex) != null);
      setLoading(false);
      return;
    }

    try {
      let cursor =
        pageIndex === 1 ? null : pageCursors.current.get(pageIndex - 1) ?? null;

      let collected: Video[] = [];
      let hasMore = true;
      let safety = 0;

      while (collected.length < LIMIT && hasMore && safety < 10) {
        const res = await fetchVideosCursor({
          limit: LIMIT,
          cursor: cursor ?? undefined,
          sort: sort === "oldest" ? "createdAt_asc" : "createdAt_desc",
        });

        const filtered =
          status === "All"
            ? res.data
            : res.data.filter((v) => v.status === status);

        collected.push(...filtered);
        cursor = res.nextCursor ?? null;
        hasMore = !!cursor;
        safety++;
      }

      const pageVideos = collected.slice(0, LIMIT);
      pagesCache.current.set(pageIndex, pageVideos);
      pageCursors.current.set(pageIndex, cursor);

      setVideos(pageVideos);
      setCurrentPage(pageIndex);
      setHasNext(hasMore);
    } catch (err) {
      console.error(err);
      setTimeoutError(true);
    } finally {
      setLoading(false);
    }
  };

  /* =====================
     POLLING (Queued / Processing)
  ===================== */
  useEffect(() => {
    if (debouncedSearch) return;

    const hasCreating = videos.some((v) =>
      CREATING_STATUSES.includes(v.status)
    );

    if (!hasCreating) return;

    const interval = setInterval(() => {
      pagesCache.current.delete(currentPage);
      fetchPage(currentPage, true);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [videos, currentPage, debouncedSearch]);

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
    fetchPage(1, true);
  }, [status, sort, debouncedSearch]);

  /* =====================
     SEARCH MODE
  ===================== */
  useEffect(() => {
    if (!debouncedSearch) return;

    let cancelled = false;

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
        collected.filter(
          (v) =>
            (status === "All" || v.status === status) &&
            (v.title?.toLowerCase().includes(keyword) ||
              v.id.toLowerCase().includes(keyword))
        )
      );

      searchCursorRef.current = cursor;
      setLoading(false);
    };

    runSearch();
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, status, sort]);

  return {
    videos,
    loading,
    timeoutError,
    currentPage,
    canNext: !debouncedSearch && hasNext,
    canPrev: !debouncedSearch && currentPage > 1,
    goNext,
    goPrev,
    refetch: () => fetchPage(1, true),
    isCapped,
    prependVideo,
  };
}
