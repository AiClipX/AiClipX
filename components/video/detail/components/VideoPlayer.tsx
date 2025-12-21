import { Video } from "../../types/videoTypes";

interface Props {
  video: Video;
}

export function VideoPlayer({ video }: Props) {
  return (
    <div className="aspect-video bg-black mb-4">
      <video src={video.url} controls className="w-full h-full" />
    </div>
  );
}
