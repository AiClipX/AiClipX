import React, { createContext, useContext, useEffect, useState } from "react";
import { VideoStatus } from "../../types/videoTypes";

interface VideoListContextType {
  status: "All" | VideoStatus;
  setStatus: (v: "All" | VideoStatus) => void;

  sort: "newest" | "oldest";
  setSort: (v: "newest" | "oldest") => void;

  search: string;
  setSearch: (v: string) => void;

  currentPage: number;
  setCurrentPage: (page: number) => void;

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
  const [currentPage, setCurrentPage] = useState(1);
  const [initialized, setInitialized] = useState(false);

  // Load state from sessionStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem("videoListState");
        if (saved) {
          const state = JSON.parse(saved);
          if (state.status) setStatus(state.status);
          if (state.sort) setSort(state.sort);
          if (typeof state.search === "string") setSearch(state.search);
          if (typeof state.currentPage === "number" && state.currentPage > 0) {
            setCurrentPage(state.currentPage);
          }
        }
      } catch (error) {
        console.warn("Failed to load video list state:", error);
      }
    }
    setInitialized(true);
  }, []);

  // Save state to sessionStorage when it changes
  useEffect(() => {
    if (!initialized) return;
    
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem(
          "videoListState",
          JSON.stringify({ status, sort, search, currentPage })
        );
      } catch (error) {
        console.warn("Failed to save video list state:", error);
      }
    }
  }, [status, sort, search, currentPage, initialized]);

  return (
    <VideoListContext.Provider
      value={{
        status,
        setStatus,
        sort,
        setSort,
        search,
        setSearch,
        currentPage,
        setCurrentPage,
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
