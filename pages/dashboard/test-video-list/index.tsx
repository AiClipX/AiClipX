import { VideoListProvider } from "../../../components/video/list/hooks/VideoListContext";
import { VideoListContainer } from "../../../components/video/list/VideoListContainer";

export default function TestVideoListPage() {
  return (
    <VideoListProvider>
      <VideoListContainer />
    </VideoListProvider>
  );
}
