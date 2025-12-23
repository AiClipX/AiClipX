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

  // debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, DEBOUNCE_DELAY);

    return () => clearTimeout(handler);
  }, [search]);

  const { data, isLoading } = useQuery<{ data: Video[] }, Error>({
    queryKey: ["videos"],
    queryFn: fetchVideos,
    staleTime: 5000,
    refetchInterval: 5000,
  });

  // Filter + sort
  const filteredVideos = useMemo(() => {
    if (!data) return [];

    let result = [...data.data];

    if (status !== "All") {
      result = result.filter((v) => v.status === status);
    }

    if (debouncedSearch) {
      result = result.filter((v) =>
        v.title.toLowerCase().includes(debouncedSearch.toLowerCase())
      );
    }

    result.sort((a, b) =>
      sort === "oldest"
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return result;
  }, [data, status, sort, debouncedSearch]);

  // Pagination
  const paginatedVideos = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredVideos.slice(start, start + PAGE_SIZE);
  }, [filteredVideos, page]);

  return {
    videos: paginatedVideos,
    total: filteredVideos.length,
    pageSize: PAGE_SIZE,
    loading: isLoading,
  };
}
