import { VideoPlayer } from "./components/VideoPlayer";
import { VideoMeta } from "./components/VideoMeta";
import { VideoActions } from "./components/VideoActions";
import { useVideoDetail } from "./hooks/useVideoDetail";
import { BackButton } from "./components/BackButton";
import { VideoDetailSkeleton } from "./components/VideoDetailSkeleton";
import { VideoNotFound } from "./components/VideoNotFound";
import { useAuth } from "../../../contexts/AuthContext";

interface Props {
  id: string;
}

export function VideoDetailContainer({ id }: Props) {
  const { video, loading, notFound } = useVideoDetail(id);
  const { logout, user } = useAuth();

  if (loading) return <VideoDetailSkeleton />;
  if (notFound) return <VideoNotFound />;

  return (
    <div className="max-w-5xl mx-auto p-4 text-white">
      <div className="flex justify-between items-center mb-4">
        <BackButton />
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-sm text-neutral-400">
              {user.email || user.name}
            </span>
          )}
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-white text-sm font-medium transition"
          >
            Logout
          </button>
        </div>
      </div>
      <VideoPlayer video={video} />
      <VideoMeta video={video} />
      <VideoActions video={video} />
    </div>
  );
}
