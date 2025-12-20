import { EmptyState } from "./EmptyState";
import { useVideoList } from "./hooks/useVideoList";
import { LoadingState } from "./LoadingState";
import { Pagination } from "./Pagination";
import { SortByDate } from "./SortByDate";
import { StatusFilter } from "./StatusFilter";
import { VideoList } from "./VideoList";

export function VideoListContainer() {
  const {
    status,
    setStatus,
    sort,
    setSort,
    videos,
    loading,
    page,
    setPage,
    total,
    pageSize,
  } = useVideoList();

  return (
    <section className="max-w-7xl mx-auto px-4 py-6 text-white">
      <h1 className="text-xl font-semibold mb-4">Video List</h1>

      <div className="flex items-center justify-between mb-4">
        <StatusFilter value={status} onChange={setStatus} />
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
