import { StatusFilter } from "./components/StatusFilter";
import { SortByDate } from "./components/SortByDate";
import { VideoList } from "./components/VideoList";
import { Pagination } from "./components/Pagination";
import { LoadingState } from "./components/LoadingState";
import { EmptyState } from "./components/EmptyState";
import { useVideoListContext } from "./hooks/VideoListContext";
import { useVideoList } from "./hooks/useVideoList";

export function VideoListContainer() {
  const {
    status,
    setStatus,
    sort,
    setSort,
    search,
    setSearch,
    page,
    setPage,
    initialized,
  } = useVideoListContext();
  const { videos, loading, total, pageSize } = useVideoList();
  if (!initialized) return null; // load sessionStorage

  return (
    <section className="max-w-7xl mx-auto px-4 py-4 text-white">
      <h1 className="text-xl font-semibold mb-4">Video List</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <StatusFilter
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
        <div className="flex items-center gap-2">
          <span>Search:</span>
          <input
            type="text"
            className="px-2 py-1 rounded text-black"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <SortByDate
          value={sort}
          onChange={(v) => {
            setSort(v);
            setPage(1);
          }}
        />
      </div>

      {loading && <LoadingState />}
      {!loading && videos.length === 0 && <EmptyState />}
      {!loading && videos.length > 0 && (
        <>
          <VideoList videos={videos} />
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
