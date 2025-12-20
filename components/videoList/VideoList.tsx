import { Video } from "./types/videoTypes";
import { VideoListItem } from "./VideoListItem";
import React from "react";
interface Props {
  videos: Video[];
}

export const VideoList: React.FC<Props> = ({ videos }) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {videos.map((video) => (
        <VideoListItem key={video.id} video={video} />
      ))}
    </div>
  );
};
