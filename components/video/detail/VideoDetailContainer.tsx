import { VideoPlayer } from "./components/VideoPlayer";
import { VideoMeta } from "./components/VideoMeta";
import { VideoActions } from "./components/VideoActions";
import { useVideoDetail } from "./hooks/useVideoDetail";
import { BackButton } from "./components/BackButton";
import { VideoDetailSkeleton } from "./components/VideoDetailSkeleton";
import { VideoNotFound } from "./components/VideoNotFound";

interface Props {
  id: string;
}

export function VideoDetailContainer({ id }: Props) {
  const { video, loading, notFound } = useVideoDetail(id);

  if (loading) return <VideoDetailSkeleton />;
  if (notFound) return <VideoNotFound />;
  return (
    <div className="max-w-5xl mx-auto p-4 text-white">
      <BackButton />
      <VideoPlayer video={video} />
      <VideoMeta video={video} />
      <VideoActions />
    </div>
  );
}
