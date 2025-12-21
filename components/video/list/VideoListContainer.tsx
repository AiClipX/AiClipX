import { StatusFilter } from "./components/StatusFilter";
import { SortByDate } from "./components/SortByDate";
import { VideoList } from "./components/VideoList";
import { Pagination } from "./components/Pagination";
import { LoadingState } from "./components/LoadingState";
import { EmptyState } from "./components/EmptyState";
import { useVideoListContext } from "./hooks/VideoListContext";
import { useVideoList } from "./hooks/useVideoList";
import { useEffect } from "react";

export function VideoListContainer() {
  const { status, setStatus, sort, setSort, search, setSearch, page, setPage } =
    useVideoListContext();
  const { videos, loading, total, pageSize } = useVideoList();

  //  load status saved in sessionStorage
  useEffect(() => {
    const saved = sessionStorage.getItem("videoListState");
    if (saved) {
      const state = JSON.parse(saved);
      setPage(state.page || 1);
      setStatus(state.status || "All");
      setSort(state.sort || "newest");
      setSearch(state.search || "");
    }
  }, []);

  return (
    <section className="max-w-7xl mx-auto px-4 py-4 text-white">
      <h1 className="text-xl font-semibold mb-4">Video List</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <StatusFilter value={status} onChange={setStatus} />
        <div className="flex items-center gap-2">
          <span>Search:</span>
          <input
            type="text"
            className="px-2 py-1 rounded text-black"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <SortByDate value={sort} onChange={setSort} />
      </div>

      {loading && <LoadingState />}
      {!loading && videos.length === 0 && <EmptyState />}
      {!loading && videos.length > 0 && (
        <>
          <VideoList videos={videos} page={page} />
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
          />
        </>
      )}
    </section>
  );
}
