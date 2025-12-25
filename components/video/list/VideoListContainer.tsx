import { StatusFilter } from "./components/StatusFilter";
import { SortByDate } from "./components/SortByDate";
import { VideoList } from "./components/VideoList";
import { Pagination } from "./components/Pagination";
import { LoadingState } from "./components/LoadingState";
import { EmptyState } from "./components/EmptyState";
import { useVideoListContext } from "./hooks/VideoListContext";
import { useVideoList } from "./hooks/useVideoList";
import { CreateVideoButton } from "./components/CreateVideoButton";
import { useState } from "react";
import { CreateVideoModal } from "./components/CreateVideoModal";

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
  const { videos, loading, total, pageSize, refetch } = useVideoList(); // thêm refetch
  const [openCreate, setOpenCreate] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  if (!initialized) return null;

  const handleRefresh = async () => {
    try {
      await refetch();
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to refresh videos", err);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 py-4 text-white">
      {/* Header + Create Button + Refresh */}
      <div className="flex justify-between items-center mb-4 gap-4">
        <h1 className="text-xl font-semibold">Video List</h1>
        <div className="flex items-center gap-2">
          <CreateVideoButton onClick={() => setOpenCreate(true)} />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-2">
        <StatusFilter
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
        <div className="flex items-center gap-2 mb-4">
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
          <button
            onClick={handleRefresh}
            className="px-3 py-1 bg-blue-600 rounded text-white text-sm hover:bg-blue-500 transition"
          >
            Refresh
          </button>
          {lastUpdated && (
            <span className="text-sm text-neutral-400">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <SortByDate
          value={sort}
          onChange={(v) => {
            setSort(v);
            setPage(1);
          }}
        />
      </div>

      {/* Video List */}
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

      {/* Create Video Modal */}
      <CreateVideoModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={() => {
          setPage(1);
          handleRefresh();
        }}
      />
    </section>
  );
}
