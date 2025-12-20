import { useEffect, useState } from "react";
import { Video, VideoStatus } from "../types/videoTypes";
import { fetchVideos } from "../services/videoService";

const PAGE_SIZE = 12;

export function useVideoList() {
  const [status, setStatus] = useState<VideoStatus | "All">("All");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [search, setSearch] = useState("");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    const handler = setTimeout(() => {
      fetchVideos({ status, sort, search, page, pageSize: PAGE_SIZE }).then(
        (res) => {
          setVideos(res.data);
          setTotal(res.total);
          setLoading(false);
        }
      );
    }, 300); // debounce search

    return () => clearTimeout(handler);
  }, [status, sort, search, page]);

  useEffect(() => setPage(1), [status, sort, search]);

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
    pageSize: PAGE_SIZE,
  };
}
