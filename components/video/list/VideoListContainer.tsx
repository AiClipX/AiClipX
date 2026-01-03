import { useState } from "react";
import { StatusFilter } from "./components/StatusFilter";
import { SortByDate } from "./components/SortByDate";
import { VideoList } from "./components/VideoList";
import { LoadingState } from "./components/LoadingState";
import { EmptyState } from "./components/EmptyState";
import { CreateVideoButton } from "./components/CreateVideoButton";
import { CreateVideoModal } from "./components/CreateVideoModal";

import { useVideoListContext } from "./hooks/VideoListContext";
import { useVideoList } from "./hooks/useVideoList";
import { showToast } from "../../common/Toast";

export function VideoListContainer() {
  const { status, setStatus, sort, setSort, search, setSearch, initialized } =
    useVideoListContext();

  const {
    videos,
    loading,
    timeoutError,
    canNext,
    canPrev,
    goNext,
    goPrev,
    currentPage,
    refetch,

    // NEW from hook
    isCapped,
    prependVideo,
  } = useVideoList();

  const [openCreate, setOpenCreate] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  if (!initialized) return null;

  const handleRefresh = async () => {
    try {
      await refetch(); // hook luôn load page 1
      setLastUpdated(new Date());
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 py-4 text-white">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 gap-4">
        <h1 className="text-xl font-semibold">Video List</h1>
        <CreateVideoButton onClick={() => setOpenCreate(true)} />
      </div>

      {/* Filters */}
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
            refetch();
          }}
        />
      </div>

      {/* Timeout */}
      {timeoutError && (
        <div className="mb-4 p-4 rounded bg-neutral-800 text-neutral-300 text-sm flex items-center justify-between">
          <span>
            The server is taking longer than expected. It may be waking up.
          </span>
          <button
            onClick={handleRefresh}
            className="ml-4 px-3 py-1 bg-blue-600 rounded hover:bg-blue-500 text-white text-sm"
          >
            Refresh
          </button>
        </div>
      )}

      {/* Content */}
      {loading && !timeoutError && <LoadingState />}
      {!loading && videos.length === 0 && <EmptyState />}

      {!loading && videos.length > 0 && (
        <>
          <VideoList videos={videos} />

          {/* Pagination (disabled during search) */}
          <div className="flex justify-center items-center mt-6 gap-4">
            <button
              onClick={goPrev}
              disabled={!canPrev || loading}
              className="px-3 py-1 bg-neutral-700 rounded disabled:opacity-40"
            >
              Prev
            </button>

            <span className="text-white font-semibold">Page {currentPage}</span>

            <button
              onClick={goNext}
              disabled={!canNext || loading}
              className="px-3 py-1 bg-blue-600 rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </>
      )}

      <CreateVideoModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={(newVideo) => prependVideo(newVideo)}
      />
    </section>
  );
}
