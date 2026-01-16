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
import { useAuth } from "../../../contexts/AuthContext";

export function VideoListContainer() {
  const { status, setStatus, sort, setSort, search, setSearch, initialized } =
    useVideoListContext();

  const {
    videos,
    loading,
    timeoutError,
    backgroundRetrying,
    canNext,
    canPrev,
    goNext,
    goPrev,
    currentPage,
    refetch,

    // NEW from hook
    isCapped,
    prependVideo,
    removeVideo,
  } = useVideoList();

  const { logout, user } = useAuth();
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
        <div className="flex items-center gap-3">
          {user && (
            <span className="text-sm text-neutral-400">
              {user.email || user.name}
            </span>
          )}
          <CreateVideoButton onClick={() => setOpenCreate(true)} />
          <button
            onClick={logout}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded text-white text-sm font-medium transition"
          >
            Logout
          </button>
        </div>
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
            // Don't call refetch here - useEffect in useVideoList will handle it
          }}
        />
      </div>

      {/* Timeout */}
      {timeoutError && (
        <div className="mb-4 p-4 rounded bg-neutral-800 text-neutral-300 text-sm">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="font-semibold mb-1 flex items-center gap-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-yellow-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                Server is taking longer than expected
              </div>
              <p className="text-neutral-400 mb-2">
                The backend may be starting up. This usually takes a moment.
              </p>
              {backgroundRetrying && (
                <p className="text-blue-400 text-xs flex items-center gap-1">
                  <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Retrying in background...
                </p>
              )}
            </div>
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-500 text-white text-sm font-medium transition whitespace-nowrap"
            >
              Retry Now
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {loading && !timeoutError && <LoadingState />}
      {!loading && videos.length === 0 && (
        <EmptyState onCreateClick={() => setOpenCreate(true)} />
      )}

      {!loading && videos.length > 0 && (
        <>
          <VideoList videos={videos} removeVideo={removeVideo} loading={loading} />

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
