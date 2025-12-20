import { Video } from "./types/videoTypes";
import { VideoListItem } from "./VideoListItem";

interface Props {
  videos: Video[];
}

export function VideoList({ videos }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 min-h-[600px]">
      {videos.map((video) => (
        <VideoListItem key={video.id} video={video} />
      ))}
    </div>
  );
}
