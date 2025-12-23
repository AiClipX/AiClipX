import { useQuery } from "@tanstack/react-query";
import { fetchVideos } from "../../services/videoService";
import { useVideoListContext } from "./VideoListContext";
import { Video } from "../../types/videoTypes";
import { useMemo } from "react";

const PAGE_SIZE = 12;

export function useVideoList() {
  const { status, sort, search, page } = useVideoListContext();

  const { data, isLoading } = useQuery<{ data: Video[] }, Error>({
    queryKey: ["videos"],
    queryFn: fetchVideos,
    staleTime: 5000,
    refetchInterval: 5000,
  });

  /**
   * Filter + sort on FE
   */
  const filteredVideos = useMemo(() => {
    if (!data) return [];

    let result = [...data.data];

    if (status !== "All") {
      result = result.filter((v) => v.status === status);
    }

    if (search) {
      result = result.filter((v) =>
        v.title.toLowerCase().includes(search.toLowerCase())
      );
    }

    result.sort((a, b) =>
      sort === "oldest"
        ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return result;
  }, [data, status, sort, search]);

  /**
   * Client-side pagination
   */
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
