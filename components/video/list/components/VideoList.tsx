import { Video } from "../../types/videoTypes";
import { VideoListItem } from "./VideoListItem";
import { VideoCardSkeleton } from "./VideoCardSkeleton";

interface Props {
  videos: Video[];
  removeVideo: (id: string) => void;
  loading?: boolean;
}

export function VideoList({ videos, removeVideo, loading = false }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {videos.map((video) => (
        <VideoListItem key={video.id} video={video} removeVideo={removeVideo} />
      ))}
      
      {/* Show skeleton cards while loading (e.g., during polling) */}
      {loading && videos.length > 0 && (
        <>
          {[1, 2, 3, 4].map((i) => (
            <VideoCardSkeleton key={`skeleton-${i}`} />
          ))}
        </>
      )}
    </div>
  );
}
