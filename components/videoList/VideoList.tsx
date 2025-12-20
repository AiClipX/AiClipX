import { Video } from "./types/videoTypes";
import { VideoListItem } from "./VideoListItem";

interface Props {
  videos: Video[];
  // onEdit: (video: Video) => void;
  onDelete: (video: Video) => void;
}

export function VideoList({ videos, onDelete }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {videos.map((video) => (
        <VideoListItem
          key={video.id}
          video={video}
          // onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
