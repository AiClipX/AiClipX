import { useEffect, useState, useRef } from "react";
import { Video } from "../../types/videoTypes";
import { getVideoById } from "../../services/videoService";

const POLL_INTERVAL = 5000;

export function useVideoDetail(id: string) {
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const intervalRef = useRef<number | null>(null);

  const fetchOnce = async () => {
    try {
      const v = await getVideoById(id);
      if (!v) {
        setNotFound(true);
        setVideo(null);
      } else {
        setVideo(v);
        setNotFound(false);
      }
    } catch (err) {
      console.error("getVideoById error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchOnce();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!video) return;

    if (video.status === "queued" || video.status === "processing") {
      // start polling
      if (intervalRef.current) return;
      intervalRef.current = window.setInterval(async () => {
        try {
          const v = await getVideoById(id);
          if (v) setVideo(v);
          if (v && (v.status === "completed" || v.status === "failed")) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
          }
        } catch (err) {
          console.error("poll error", err);
        }
      }, POLL_INTERVAL);
    } else {
      // ensure poll stopped
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [video, id]);

  return { video, loading, notFound };
}
