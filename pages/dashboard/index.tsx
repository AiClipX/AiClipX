import { VideoListProvider } from "../../components/video/list/hooks/VideoListContext";
import { VideoListContainer } from "../../components/video/list/VideoListContainer";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-neutral-950">
      <VideoListProvider>
        <VideoListContainer />
      </VideoListProvider>
    </div>
  );
}