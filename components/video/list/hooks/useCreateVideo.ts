import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createVideoTask } from "../../services/videoService";
import { Video } from "../../types/videoTypes";

export function useCreateVideo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { 
      payload: {
        title: string; 
        prompt: string; 
        engine: string; 
        params?: any;
      };
      idempotencyKey?: string;
    }) => {
      console.log("=== CREATE VIDEO REQUEST ===");
      console.log("Payload:", data.payload);
      console.log("Idempotency Key:", data.idempotencyKey);
      
      const video = await createVideoTask(data.payload, {
        idempotencyKey: data.idempotencyKey
      });
      console.log("Response:", video);
      return video;
    },

    onSuccess: (newVideo: Video) => {
      // Update query cache immediately
      queryClient.setQueryData(["videos", "list"], (oldData: any) => {
        if (!oldData) return [newVideo];
        // Avoid duplicates
        const map = new Map(oldData.map((v: Video) => [v.id, v]));
        map.set(newVideo.id, newVideo);
        return [
          newVideo,
          ...Array.from(map.values()).filter(
            (v: Video) => v.id !== newVideo.id
          ),
        ];
      });

      // Invalidate to fetch latest from server
      queryClient.invalidateQueries({ queryKey: ["videos", "list"] });
    },
  });
}
