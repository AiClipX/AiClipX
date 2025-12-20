import { useEffect, useState } from "react";
import { Video, VideoStatus } from "../types/videoTypes";
import { fetchVideos } from "../services/videoService";

const PAGE_SIZE = 12;

export function useVideoList() {
  const [status, setStatus] = useState<VideoStatus | "All">("All");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(handler);
  }, [search]);

  useEffect(() => {
    setPage(1);
    setLoading(true);
    fetchVideos({
      status: status === "All" ? undefined : status,
      sort,
      search: debouncedSearch,
      page: 1,
      pageSize: 12,
    }).then((res) => {
      setVideos(res.data);
      setTotal(res.total);
      setLoading(false);
    });
  }, [status, sort, debouncedSearch]);

  useEffect(() => {
    fetchVideos({
      status: status === "All" ? undefined : status,
      sort,
      search: debouncedSearch,
      page,
      pageSize: 12,
    }).then((res) => setVideos(res.data));
  }, [page]);

  // 🔹 Add handlers for edit/delete
  const removeVideo = (id: string) => {
    setVideos((prev) => prev.filter((v) => v.id !== id));
  };

  const updateVideo = (updatedVideo: Video) => {
    setVideos((prev) =>
      prev.map((v) => (v.id === updatedVideo.id ? updatedVideo : v))
    );
  };

  return {
    status,
    setStatus,
    sort,
    setSort,
    search,
    setSearch,
    videos,
    loading,
    page,
    setPage,
    total,
    pageSize: 12,
    removeVideo, // 🔹 export remove
    updateVideo, // 🔹 export update
  };
}
