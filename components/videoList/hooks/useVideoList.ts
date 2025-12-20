import { useEffect, useState } from "react";
import { Video, VideoStatus } from "../types/videoTypes";
import { fetchVideos } from "../services/videoService";

const PAGE_SIZE = 12;

export function useVideoList() {
  const [status, setStatus] = useState<VideoStatus | "All">("All");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [search, setSearch] = useState(""); // 🔹 search query
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // 🔹 debounce search
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(handler);
  }, [search]);

  // fetch videos khi filter / sort / debounced search
  useEffect(() => {
    setPage(1);
    setLoading(true);

    fetchVideos({
      status: status === "All" ? undefined : status,
      sort,
      search: debouncedSearch, // 🔹 truyền search
      page: 1,
      pageSize: PAGE_SIZE,
    }).then((res) => {
      setVideos(res.data);
      setTotal(res.total);
      setLoading(false);
    });
  }, [status, sort, debouncedSearch]);

  // paginate → không loading
  useEffect(() => {
    fetchVideos({
      status: status === "All" ? undefined : status,
      sort,
      search: debouncedSearch, // 🔹 truyền search
      page,
      pageSize: PAGE_SIZE,
    }).then((res) => setVideos(res.data));
  }, [page]);

  return {
    status,
    setStatus,
    sort,
    setSort,
    search,
    setSearch, // 🔹 expose setSearch cho input
    videos,
    loading,
    page,
    setPage,
    total,
    pageSize: PAGE_SIZE,
  };
}
