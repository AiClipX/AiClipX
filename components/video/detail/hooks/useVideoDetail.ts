import { useEffect, useState, useRef } from "react";
import { Video } from "../../types/videoTypes";
import { getVideoById } from "../../services/videoService";
import { PollingManager } from "../../../../lib/pollingManager";

const POLL_INTERVAL = 4000; // 4 seconds

export function useVideoDetail(id: string) {
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollingManagerRef = useRef<PollingManager | null>(null);

  const fetchVideo = async () => {
    try {
      setError(null);
      const v = await getVideoById(id);
      
      if (!v) {
        setNotFound(true);
        setVideo(null);
      } else {
        setVideo(v);
        setNotFound(false);
      }
    } catch (err: any) {
      console.error("getVideoById error", err);
      setError(err?.message || "Failed to load video details");
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    setLoading(true);
    setError(null);
    fetchVideo();
  };

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchVideo();

    return () => {
      if (pollingManagerRef.current) {
        pollingManagerRef.current.destroy();
        pollingManagerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Smart polling for queued/processing videos
  useEffect(() => {
    if (!video) return;

    const shouldPoll = video.status === "queued" || video.status === "processing";

    if (shouldPoll) {
      // Start polling if not already started
      if (!pollingManagerRef.current) {
        pollingManagerRef.current = new PollingManager(
          async () => {
            try {
              const v = await getVideoById(id);
              if (v) {
                setVideo(v);
                
                // Stop polling if completed or failed
                if (v.status === "completed" || v.status === "failed") {
                  if (pollingManagerRef.current) {
                    pollingManagerRef.current.stop();
                    pollingManagerRef.current.destroy();
                    pollingManagerRef.current = null;
                  }
                }
              }
            } catch (err) {
              console.error("poll error", err);
            }
          },
          {
            interval: POLL_INTERVAL,
            enableWhenHidden: false, // Stop when tab hidden
            maxConcurrent: 1,
          }
        );
        pollingManagerRef.current.start();
      }
    } else {
      // Stop polling for completed/failed videos
      if (pollingManagerRef.current) {
        pollingManagerRef.current.stop();
        pollingManagerRef.current.destroy();
        pollingManagerRef.current = null;
      }
    }

    return () => {
      if (pollingManagerRef.current) {
        pollingManagerRef.current.destroy();
        pollingManagerRef.current = null;
      }
    };
  }, [video, id]);

  return { 
    video, 
    loading, 
    notFound, 
    error,
    refetch 
  };
}
