'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface UseLazyLoadingOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  enabled?: boolean;
}

/**
 * Hook for implementing lazy loading with Intersection Observer
 */
export function useLazyLoading(options: UseLazyLoadingOptions = {}) {
  const {
    threshold = 0.1,
    rootMargin = '50px',
    triggerOnce = true,
    enabled = true,
  } = options;

  const [isInView, setIsInView] = useState(!enabled);
  const [hasTriggered, setHasTriggered] = useState(false);
  const elementRef = useRef<HTMLElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const observe = useCallback(() => {
    if (!enabled || !elementRef.current || (triggerOnce && hasTriggered)) {
      return;
    }

    observerRef.current = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsInView(true);
            setHasTriggered(true);

            if (triggerOnce) {
              observerRef.current?.disconnect();
            }
          } else if (!triggerOnce) {
            setIsInView(false);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observerRef.current.observe(elementRef.current);
  }, [enabled, threshold, rootMargin, triggerOnce, hasTriggered]);

  useEffect(() => {
    observe();

    return () => {
      observerRef.current?.disconnect();
    };
  }, [observe]);

  const reset = useCallback(() => {
    setIsInView(!enabled);
    setHasTriggered(false);
    observerRef.current?.disconnect();
    observe();
  }, [enabled, observe]);

  return {
    elementRef,
    isInView,
    hasTriggered,
    reset,
  };
}

/**
 * Hook for lazy loading lists with pagination
 */
interface UseLazyListOptions<T> {
  loadMore: (page: number) => Promise<T[]>;
  initialPage?: number;
  pageSize?: number;
  threshold?: number;
  enabled?: boolean;
}

export function useLazyList<T>(options: UseLazyListOptions<T>) {
  const {
    loadMore,
    initialPage = 1,
    pageSize = 20,
    threshold = 0.5,
    enabled = true,
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { elementRef, isInView } = useLazyLoading({
    threshold,
    triggerOnce: false,
    enabled: enabled && hasMore && !isLoading,
  });

  const loadNextPage = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setError(null);

    try {
      const newItems = await loadMore(currentPage);

      if (newItems.length === 0 || newItems.length < pageSize) {
        setHasMore(false);
      }

      setItems(prev => [...prev, ...newItems]);
      setCurrentPage(prev => prev + 1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load more items'
      );
    } finally {
      setIsLoading(false);
    }
  }, [loadMore, currentPage, pageSize, isLoading, hasMore]);

  // Load more when sentinel comes into view
  useEffect(() => {
    if (isInView && enabled) {
      loadNextPage();
    }
  }, [isInView, enabled, loadNextPage]);

  const reset = useCallback(() => {
    setItems([]);
    setCurrentPage(initialPage);
    setHasMore(true);
    setError(null);
    setIsLoading(false);
  }, [initialPage]);

  const retry = useCallback(() => {
    setError(null);
    loadNextPage();
  }, [loadNextPage]);

  return {
    items,
    isLoading,
    hasMore,
    error,
    elementRef, // Attach this to the sentinel element
    reset,
    retry,
    loadNextPage,
  };
}

/**
 * Hook for lazy loading images with preloading
 */
interface UseLazyImageOptions {
  src: string;
  preloadSrc?: string;
  threshold?: number;
  rootMargin?: string;
}

export function useLazyImage(options: UseLazyImageOptions) {
  const { src, preloadSrc, threshold = 0.1, rootMargin = '50px' } = options;

  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string | null>(null);

  const { elementRef, isInView } = useLazyLoading({
    threshold,
    rootMargin,
    triggerOnce: true,
  });

  // Preload image when in view
  useEffect(() => {
    if (!isInView) return;

    const img = new Image();

    img.onload = () => {
      setCurrentSrc(src);
      setIsLoaded(true);
    };

    img.onerror = () => {
      setHasError(true);
      if (preloadSrc) {
        const fallbackImg = new Image();
        fallbackImg.onload = () => {
          setCurrentSrc(preloadSrc);
          setIsLoaded(true);
        };
        fallbackImg.onerror = () => setHasError(true);
        fallbackImg.src = preloadSrc;
      }
    };

    img.src = src;
  }, [isInView, src, preloadSrc]);

  return {
    elementRef,
    isInView,
    isLoaded,
    hasError,
    src: currentSrc,
  };
}

/**
 * Hook for lazy loading components with dynamic imports
 */
interface UseLazyComponentOptions {
  importFn: () => Promise<{ default: React.ComponentType<any> }>;
  threshold?: number;
  rootMargin?: string;
}

export function useLazyComponent(options: UseLazyComponentOptions) {
  const { importFn, threshold = 0.1, rootMargin = '50px' } = options;

  const [Component, setComponent] = useState<React.ComponentType<any> | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { elementRef, isInView } = useLazyLoading({
    threshold,
    rootMargin,
    triggerOnce: true,
  });

  useEffect(() => {
    if (!isInView || Component || isLoading) return;

    setIsLoading(true);
    setError(null);

    importFn()
      .then(module => {
        setComponent(() => module.default);
      })
      .catch(err => {
        setError(
          err instanceof Error ? err.message : 'Failed to load component'
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [isInView, Component, isLoading, importFn]);

  return {
    elementRef,
    Component,
    isLoading,
    error,
    isInView,
  };
}

/**
 * Hook for lazy loading with retry mechanism
 */
interface UseLazyLoadWithRetryOptions {
  loadFn: () => Promise<any>;
  maxRetries?: number;
  retryDelay?: number;
  threshold?: number;
  rootMargin?: string;
}

export function useLazyLoadWithRetry(options: UseLazyLoadWithRetryOptions) {
  const {
    loadFn,
    maxRetries = 3,
    retryDelay = 1000,
    threshold = 0.1,
    rootMargin = '50px',
  } = options;

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const { elementRef, isInView } = useLazyLoading({
    threshold,
    rootMargin,
    triggerOnce: true,
  });

  const load = useCallback(async () => {
    if (isLoading || data) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await loadFn();
      setData(result);
      setRetryCount(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Load failed';

      if (retryCount < maxRetries) {
        setTimeout(
          () => {
            setRetryCount(prev => prev + 1);
            setIsLoading(false);
            load();
          },
          retryDelay * Math.pow(2, retryCount)
        ); // Exponential backoff
      } else {
        setError(errorMessage);
      }
    } finally {
      if (retryCount >= maxRetries) {
        setIsLoading(false);
      }
    }
  }, [loadFn, isLoading, data, retryCount, maxRetries, retryDelay]);

  useEffect(() => {
    if (isInView) {
      load();
    }
  }, [isInView, load]);

  const retry = useCallback(() => {
    setRetryCount(0);
    setError(null);
    load();
  }, [load]);

  return {
    elementRef,
    data,
    isLoading,
    error,
    retryCount,
    retry,
    isInView,
  };
}

export default useLazyLoading;
