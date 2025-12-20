import { Video } from "./types/videoTypes";
import { VideoListItem } from "./VideoListItem";

export function VideoList({ videos }: { videos: Video[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {videos.map((video) => (
        <VideoListItem key={video.id} video={video} />
      ))}
    </div>
  );
}
