import { useEffect, useState } from "react";
import { useVideoListContext } from "./VideoListContext";
import { Video } from "../../types/videoTypes";
import { fetchVideos } from "../../services/videoService";

const PAGE_SIZE = 12;
const DEBOUNCE_MS = 300;

export function useVideoList() {
  const { status, sort, search, page, initialized } = useVideoListContext();
  const [videos, setVideos] = useState<Video[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!initialized) return; // wait until context is initialized

    setLoading(true);
    const timer = setTimeout(async () => {
      const res = await fetchVideos({
        status,
        sort,
        search,
        page,
        pageSize: PAGE_SIZE,
      });
      setVideos(res.data);
      setTotal(res.total);
      setLoading(false);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [status, sort, search, page, initialized]);

  return { videos, total, pageSize: PAGE_SIZE, loading };
}
