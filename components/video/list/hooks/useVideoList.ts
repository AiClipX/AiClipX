import { useQuery } from "@tanstack/react-query";
import { fetchVideos } from "../../services/videoService";
import { useVideoListContext } from "./VideoListContext";
import { Video } from "../../types/videoTypes";
import { useMemo, useState, useEffect } from "react";

const PAGE_SIZE = 12;
const DEBOUNCE_DELAY = 500; // 500ms

export function useVideoList() {
  const { status, sort, search, page } = useVideoListContext();
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // -----------------------------
  // Debounce search input
  // -----------------------------
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(handler);
  }, [search]);

  // -----------------------------
  // Fetch + Polling
  // -----------------------------
  const query = useQuery<{ data: Video[] }, Error>({
    queryKey: ["videos", "list"],
    queryFn: fetchVideos,
    staleTime: 5000,
    refetchInterval: 5000, // polling mỗi 5s
    refetchIntervalInBackground: true,
  });

  // -----------------------------
  // Filter + Search + Sort
  // -----------------------------
  const filteredVideos = useMemo(() => {
    if (!query.data) return [];

    let result = [...query.data.data];

    // Filter by status
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

    // Sort by createdAt
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
    refetch: query.refetch,
  };
}
