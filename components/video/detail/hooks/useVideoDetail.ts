import { useEffect, useState, useRef } from "react";
import { Video } from "../../types/videoTypes";
import { getVideoById } from "../../services/videoService";
import { PollingManager } from "../../../../lib/pollingManager";
import { handleError } from "../../../../lib/globalErrorHandler";

// Production-grade polling configuration
const INITIAL_POLL_INTERVAL = 2000; // 2 seconds initially
const MAX_POLL_INTERVAL = 30000; // Max 30 seconds
const BACKOFF_MULTIPLIER = 1.5; // Exponential backoff
const MAX_POLL_ATTEMPTS = 50; // Stop after 50 attempts (~25 minutes)

const ACTIVE_STATUSES = ["queued", "processing"];
const TERMINAL_STATUSES = ["completed", "failed", "cancelled"];

export function useVideoDetail(id: string) {
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  const pollingManagerRef = useRef<PollingManager | null>(null);
  const pollIntervalRef = useRef(INITIAL_POLL_INTERVAL);
  const pollAttemptsRef = useRef(0);
  const inflightRequestRef = useRef(false);

  const fetchVideo = async (isPolling = false) => {
    // Prevent duplicate in-flight requests
    if (inflightRequestRef.current) {
      return;
    }

    inflightRequestRef.current = true;

    try {
      if (!isPolling) {
        setError(null);
        setRequestId(null);
      }

      const v = await getVideoById(id);
      
      if (!v) {
        setNotFound(true);
        setVideo(null);
      } else {
        setVideo(v);
        setNotFound(false);
        
        // Reset polling interval on successful fetch
        if (isPolling) {
          pollIntervalRef.current = INITIAL_POLL_INTERVAL;
          pollAttemptsRef.current = 0;
        }
      }
    } catch (err: any) {
      console.error("getVideoById error", err);
      
      // Use global error handler for consistent error processing
      const errorInfo = handleError(err, 'useVideoDetail.fetchVideo');
      setError(errorInfo.message);
      setRequestId(errorInfo.requestId || null);

      // Implement exponential backoff for polling errors
      if (isPolling) {
        pollIntervalRef.current = Math.min(
          pollIntervalRef.current * BACKOFF_MULTIPLIER,
          MAX_POLL_INTERVAL
        );
        pollAttemptsRef.current++;
      }
    } finally {
      setLoading(false);
      inflightRequestRef.current = false;
    }
  };

  const refetch = () => {
    setLoading(true);
    setError(null);
    setRequestId(null);
    pollAttemptsRef.current = 0;
    pollIntervalRef.current = INITIAL_POLL_INTERVAL;
    fetchVideo(false);
  };

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    fetchVideo(false);

    return () => {
      if (pollingManagerRef.current) {
        pollingManagerRef.current.destroy();
        pollingManagerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Enhanced smart polling with exponential backoff
  useEffect(() => {
    if (!video) return;

    const shouldPoll = ACTIVE_STATUSES.includes(video.status as any);
    const shouldStopPolling = TERMINAL_STATUSES.includes(video.status as any) || 
                             pollAttemptsRef.current >= MAX_POLL_ATTEMPTS;

    if (shouldPoll && !shouldStopPolling) {
      // Start or restart polling with current interval
      if (pollingManagerRef.current) {
        pollingManagerRef.current.destroy();
      }

      pollingManagerRef.current = new PollingManager(
        async () => {
          await fetchVideo(true);
        },
        {
          interval: pollIntervalRef.current,
          enableWhenHidden: false, // Stop when tab hidden for performance
          maxConcurrent: 1, // Prevent overlapping requests
        }
      );
      pollingManagerRef.current.start();
    } else {
      // Stop polling for terminal states or max attempts reached
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollingManagerRef.current) {
        pollingManagerRef.current.destroy();
        pollingManagerRef.current = null;
      }
      inflightRequestRef.current = false;
    };
  }, []);

  return { 
    video, 
    loading, 
    notFound, 
    error,
    requestId,
    refetch,
    isPolling: pollingManagerRef.current?.isActive() ?? false,
    pollAttempts: pollAttemptsRef.current,
    pollInterval: pollIntervalRef.current,
  };
}
