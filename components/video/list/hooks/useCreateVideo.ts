import { useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";

const API_URL = `${process.env.NEXT_PUBLIC_API_VIDEO}/api/video-tasks`;

export function useCreateVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { title: string; prompt: string }) => {
      const res = await axios.post(API_URL, payload);
      return res.data;
    },

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["videos", "list"],
      });
    },
  });
}
