import { useState } from "react";
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

      {/* Filter + Sort + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-4">
        <StatusFilter value={status} onChange={setStatus} />
        <div className="flex items-center gap-2 w-full sm:w-auto mb-4">
          <span className="text-neutral-400">Search:</span>
          <input
            type="text"
            placeholder="Search videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-neutral-800 px-3 py-2 rounded w-full sm:w-64"
          />
        </div>

        <SortByDate value={sort} onChange={setSort} />
      </div>

      {/* List + Loading + Empty */}
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
