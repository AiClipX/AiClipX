import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { Video } from "../../types/videoTypes";

const API_URL = `${process.env.NEXT_PUBLIC_API_VIDEO}/api/video-tasks`;

export function useCreateVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { title?: string; prompt?: string }) => {
      const res = await axios.post(API_URL, payload);
      return res.data; // đây phải là object video mới
    },

    onSuccess: (newVideo: Video) => {
      // 1. Set default status = "Queued" nếu chưa có
      const videoToAdd = { ...newVideo, status: newVideo.status || "Queued" };

      // 2. Update query cache ngay lập tức
      queryClient.setQueryData(["videos", "list"], (oldData: any) => {
        if (!oldData) return [videoToAdd];
        // Tránh duplicate
        const map = new Map(oldData.map((v: Video) => [v.id, v]));
        map.set(videoToAdd.id, videoToAdd);
        return [
          videoToAdd,
          ...Array.from(map.values()).filter(
            (v: Video) => v.id !== videoToAdd.id
          ),
        ];
      });

      // 3. Tùy chọn: vẫn invalidate để fetch server cập nhật mới nhất
      queryClient.invalidateQueries({ queryKey: ["videos", "list"] });
    },
  });
}
