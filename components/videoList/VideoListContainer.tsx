import { StatusFilter } from "./StatusFilter";
import { SortByDate } from "./SortByDate";
import { Pagination } from "./Pagination";
import { VideoList } from "./VideoList";
import { EmptyState } from "./EmptyState";
import { LoadingState } from "./LoadingState";
import { useVideoList } from "./hooks/useVideoList";

export function VideoListContainer() {
  const {
    status,
    setStatus,
    sort,
    setSort,
    search,
    setSearch,
    videos,
    loading,
    page,
    setPage,
    total,
    pageSize,
  } = useVideoList();

  return (
    <section className="max-w-7xl mx-auto px-4 py-4 text-white">
      <h1 className="text-xl font-semibold mb-4">Video List</h1>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2 gap-2">
        <StatusFilter value={status} onChange={setStatus} />
        <div className="flex items-center gap-2 mb-4">
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
