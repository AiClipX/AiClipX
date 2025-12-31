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

    onSuccess: (newVideo) => {
      queryClient.invalidateQueries({ queryKey: ["videos", "list"] });
    },
  });
}
