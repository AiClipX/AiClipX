import React, { createContext, useContext, useEffect, useState } from "react";
import { VideoStatus } from "../../types/videoTypes";
import { useRouter } from "next/router";

interface VideoListContextType {
  status: "All" | VideoStatus;
  setStatus: (v: "All" | VideoStatus) => void;

  sort: "newest" | "oldest";
  setSort: (v: "newest" | "oldest") => void;

  search: string;
  setSearch: (v: string) => void;

  initialized: boolean;
}

const VideoListContext = createContext<VideoListContextType | undefined>(
  undefined
);

export const VideoListProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const router = useRouter();
  const [status, setStatus] = useState<"All" | VideoStatus>("All");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [search, setSearch] = useState("");
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("videoListState");
    if (saved) {
      try {
        const state = JSON.parse(saved);
        if (state.status) setStatus(state.status);
        if (state.sort) setSort(state.sort);
        if (typeof state.search === "string") setSearch(state.search);
      } catch {}
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (!initialized) return;
    sessionStorage.setItem(
      "videoListState",
      JSON.stringify({ status, sort, search })
    );
  }, [status, sort, search, initialized]);

  return (
    <VideoListContext.Provider
      value={{
        status,
        setStatus,
        sort,
        setSort,
        search,
        setSearch,
        initialized,
      }}
    >
      {children}
    </VideoListContext.Provider>
  );
};

export function useVideoListContext() {
  const context = useContext(VideoListContext);
  if (!context)
    throw new Error(
      "useVideoListContext must be used within VideoListProvider"
    );
  return context;
}
