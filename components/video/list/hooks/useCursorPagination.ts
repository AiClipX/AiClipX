import { useState, useCallback } from "react";

export interface CursorApiResponse<T> {
  data: T[];
  nextCursor?: string | null;
}

interface UseCursorPaginationOptions {
  pageSize: number;
}

export function useCursorPagination<T>({
  pageSize,
}: UseCursorPaginationOptions) {
  const [cursor, setCursor] = useState<string | null>(null);
  const [cursorHistory, setCursorHistory] = useState<string[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const applyResponse = useCallback((res: CursorApiResponse<T>) => {
    setNextCursor(res.nextCursor ?? null);
  }, []);

  const goNext = useCallback(() => {
    if (!nextCursor) return;
    setCursorHistory((prev) => [...prev, cursor ?? ""]);
    setCursor(nextCursor);
  }, [nextCursor, cursor]);

  const goPrev = useCallback(() => {
    setCursorHistory((prev) => {
      if (prev.length === 0) return prev;
      const newHistory = [...prev];
      const prevCursor = newHistory.pop()!;
      setCursor(prevCursor || null);
      return newHistory;
    });
  }, []);

  const reset = useCallback(() => {
    setCursor(null);
    setNextCursor(null);
    setCursorHistory([]);
  }, []);

  return {
    cursor,
    setCursor,
    limit: pageSize,
    nextCursor,
    hasNext: Boolean(nextCursor),
    hasPrev: cursorHistory.length > 0,
    goNext,
    goPrev,
    reset,
    applyResponse,
    cursorHistory, // <- expose cursorHistory
  };
}
