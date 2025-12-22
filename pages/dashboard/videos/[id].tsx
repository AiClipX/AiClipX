import { useRouter } from "next/router";
import { VideoDetailContainer } from "../../../components/video/detail/VideoDetailContainer";

export default function VideoDetailPage() {
  const router = useRouter();
  const { id } = router.query; // <- đây mới có id
  if (!id) return null;

  return <VideoDetailContainer id={id as string} />;
}
