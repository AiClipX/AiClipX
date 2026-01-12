import { useEffect, useRef, useState } from "react";
import { useVideoListContext } from "./VideoListContext";
import { fetchVideosCursor } from "../../services/videoService";
import { Video, VideoStatus } from "../../types/videoTypes";

/* =====================
   CONFIG
===================== */
const LIMIT = 12;
const SEARCH_DEBOUNCE_MS = 800;
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
  const fetchPage = async (
    pageIndex: number,
    force = false,
    silent = false
  ) => {
    if (!silent) {
      setLoading(true);
    }
    setTimeoutError(false);

    if (!force && pagesCache.current.has(pageIndex)) {
      setVideos(pagesCache.current.get(pageIndex)!);
      setCurrentPage(pageIndex);
      setHasNext(pageCursors.current.get(pageIndex) != null);
      if (!silent) {
        setLoading(false);
      }
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
    } catch (err) {
      console.error("Fetch page error:", err);
      setTimeoutError(true);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  const isPollingRef = useRef(false);

  /* =====================
     POLLING (Queued / Processing)
  ===================== */
  useEffect(() => {
    if (debouncedSearch) return;

    const hasCreating = videos.some((v) =>
      CREATING_STATUSES.includes(v.status)
    );

    // Start polling
    if (hasCreating && !isPollingRef.current) {
      isPollingRef.current = true;

      const interval = setInterval(() => {
        pagesCache.current.delete(currentPage);
        fetchPage(currentPage, true, true);
      }, POLL_INTERVAL_MS);

      return () => {
        clearInterval(interval);
        isPollingRef.current = false;
      };
    }

    // Stop polling
    if (!hasCreating && isPollingRef.current) {
      isPollingRef.current = false;
    }
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
    fetchPage(1, true);
  }, [status, sort, debouncedSearch]);

  return {
    videos,
    loading,
    timeoutError,
    currentPage,
    canNext: hasNext,
    canPrev: currentPage > 1,
    goNext,
    goPrev,
    refetch: () => {
      pagesCache.current.clear();
      pageCursors.current.clear();
      fetchPage(1, true);
    },
    isCapped,
    prependVideo,
  };
}
