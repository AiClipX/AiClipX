import { useQuery } from "@tanstack/react-query";
import { useVideoListContext } from "./VideoListContext";
import { fetchVideos } from "../../services/videoService";
import { Video } from "../../types/videoTypes";

export function useVideoList() {
  const { status, sort, search, page } = useVideoListContext();
  const { data, isLoading } = useQuery<{ data: Video[]; total: number }, Error>(
    {
      queryKey: ["videos", { status, sort, search, page }],
      queryFn: () => fetchVideos({ status, sort, search, page, pageSize: 12 }),
      refetchInterval: 5000,
      staleTime: 5000, // thay keepPreviousData
    }
  );

  return {
    videos: data?.data || [],
    total: data?.total || 0,
    pageSize: 12,
    loading: isLoading,
  };
}
