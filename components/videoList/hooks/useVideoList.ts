import { useEffect, useState } from "react";
import { Video, VideoStatus } from "../types/videoTypes";
import { fetchVideos } from "../services/videoService";

const PAGE_SIZE = 12;

export function useVideoList() {
  const [status, setStatus] = useState<VideoStatus | "All">("All");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // loading CHỈ khi filter / sort
  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchVideos({
      status: status === "All" ? undefined : status,
      sort,
      page: 1,
      pageSize: PAGE_SIZE,
    }).then((res) => {
      if (!active) return;
      setVideos(res.data);
      setTotal(res.total);
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [status, sort]);

  // paginate KHÔNG loading
  useEffect(() => {
    fetchVideos({
      status: status === "All" ? undefined : status,
      sort,
      page,
      pageSize: PAGE_SIZE,
    }).then((res) => {
      setVideos(res.data);
    });
  }, [page]);

  // reset page khi filter/sort
  useEffect(() => {
    setPage(1);
  }, [status, sort]);

  return {
    status,
    setStatus,
    sort,
    setSort,
    videos,
    loading,
    page,
    setPage,
    total,
    pageSize: PAGE_SIZE,
  };
}
