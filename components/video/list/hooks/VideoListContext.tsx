import React, { createContext, useContext, useState, useEffect } from "react";
import { VideoStatus } from "../../types/videoTypes";

interface VideoListContextType {
  status: "All" | VideoStatus;
  setStatus: (v: "All" | VideoStatus) => void;
  sort: "newest" | "oldest";
  setSort: (v: "newest" | "oldest") => void;
  search: string;
  setSearch: (v: string) => void;
  page: number;
  setPage: (v: number) => void;
  initialized: boolean;
}

const VideoListContext = createContext<VideoListContextType | undefined>(
  undefined
);

export const VideoListProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [status, setStatus] = useState<"All" | VideoStatus>("All");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("videoListState");
    if (saved) {
      const state = JSON.parse(saved);
      setStatus(state.status || "All");
      setSort(state.sort || "newest");
      setSearch(state.search || "");
      setPage(state.page || 1);
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (initialized) {
      sessionStorage.setItem(
        "videoListState",
        JSON.stringify({ status, sort, search, page })
      );
    }
  }, [status, sort, search, page, initialized]);

  useEffect(() => {
    setPage(1); // reset page when filters change
  }, [status, sort, search]);

  return (
    <VideoListContext.Provider
      value={{
        status,
        setStatus,
        sort,
        setSort,
        search,
        setSearch,
        page,
        setPage,
        initialized,
      }}
    >
      {children}
    </VideoListContext.Provider>
  );
};

export const useVideoListContext = () => {
  const context = useContext(VideoListContext);
  if (!context)
    throw new Error(
      "useVideoListContext must be used within VideoListProvider"
    );
  return context;
};
