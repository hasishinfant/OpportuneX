import { useCallback, useEffect, useRef, useState } from 'react';

interface UseInfiniteScrollProps<T> {
  fetchMore: (page: number) => Promise<{
    data: T[];
    hasMore: boolean;
    totalCount?: number;
  }>;
  initialData?: T[];
  enabled?: boolean;
  threshold?: number; // Distance from bottom to trigger load (in pixels)
}

interface UseInfiniteScrollReturn<T> {
  data: T[];
  loading: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => void;
  reset: () => void;
  totalCount?: number;
}

export function useInfiniteScroll<T>({
  fetchMore,
  initialData = [],
  enabled = true,
  threshold = 200,
}: UseInfiniteScrollProps<T>): UseInfiniteScrollReturn<T> {
  const [data, setData] = useState<T[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState<number | undefined>();
  
  const loadingRef = useRef(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const loadMore = useCallback(async () => {
    if (!enabled || loading || !hasMore || loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchMore(page);
      
      setData(prevData => [...prevData, ...result.data]);
      setHasMore(result.hasMore);
      setTotalCount(result.totalCount);
      setPage(prevPage => prevPage + 1);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load more data';
      setError(errorMessage);
      console.error('Error loading more data:', err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [enabled, loading, hasMore, page, fetchMore]);

  const reset = useCallback(() => {
    setData(initialData);
    setLoading(false);
    setHasMore(true);
    setError(null);
    setPage(1);
    setTotalCount(undefined);
    loadingRef.current = false;
  }, [initialData]);

  // Set up intersection observer for automatic loading
  useEffect(() => {
    if (!enabled || !sentinelRef.current) return;

    const sentinel = sentinelRef.current;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && hasMore && !loading) {
          loadMore();
        }
      },
      {
        rootMargin: `${threshold}px`,
        threshold: 0.1,
      }
    );

    observerRef.current.observe(sentinel);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [enabled, hasMore, loading, loadMore, threshold]);

  // Cleanup observer on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Reset when initialData changes
  useEffect(() => {
    setData(initialData);
    setPage(1);
    setHasMore(true);
    setError(null);
    setTotalCount(undefined);
  }, [initialData]);

  return {
    data,
    loading,
    hasMore,
    error,
    loadMore,
    reset,
    totalCount,
    // Expose sentinel ref for manual placement
    sentinelRef: sentinelRef as React.MutableRefObject<HTMLDivElement | null>,
  } as UseInfiniteScrollReturn<T> & { sentinelRef: React.MutableRefObject<HTMLDivElement | null> };
}