import { useEffect, useState } from "react";
import { Video } from "../../types/videoTypes";
import { getVideoById } from "../../services/videoService";

export function useVideoDetail(id: string) {
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    getVideoById(id).then((v) => {
      if (!v) setNotFound(true);
      else setVideo(v);
      setLoading(false);
    });
  }, [id]);

  return { video, loading, notFound };
}
