'use client';

import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { LoadingSpinner } from './LoadingSpinner';

interface InfiniteScrollListProps<T = any> {
  fetchMore: (page: number) => Promise<{
    data: T[];
    hasMore: boolean;
    totalCount?: number;
  }>;
  renderItem: (item: T, index: number) => ReactNode;
  initialData?: T[];
  className?: string;
  itemClassName?: string;
  loadingComponent?: ReactNode;
  errorComponent?: (error: string, retry: () => void) => ReactNode;
  emptyComponent?: ReactNode;
  endComponent?: ReactNode;
  enabled?: boolean;
  threshold?: number;
  showLoadMoreButton?: boolean;
  showItemCount?: boolean;
  itemCountLabel?: string;
}

export function InfiniteScrollList<T = any>({
  fetchMore,
  renderItem,
  initialData = [],
  className,
  itemClassName,
  loadingComponent,
  errorComponent,
  emptyComponent,
  endComponent,
  enabled = true,
  threshold = 200,
  showLoadMoreButton = false,
  showItemCount = false,
  itemCountLabel = 'items',
}: InfiniteScrollListProps<T>) {
  const {
    data,
    loading,
    hasMore,
    error,
    loadMore,
    reset,
    totalCount,
    sentinelRef,
  } = useInfiniteScroll({
    fetchMore,
    initialData,
    enabled,
    threshold,
  }) as ReturnType<typeof useInfiniteScroll> & {
    sentinelRef: React.MutableRefObject<HTMLDivElement | null>;
  };

  // Default loading component
  const defaultLoadingComponent = (
    <div className='flex items-center justify-center py-8'>
      <LoadingSpinner size='md' />
      <span className='ml-3 text-secondary-600'>Loading more results...</span>
    </div>
  );

  // Default error component
  const defaultErrorComponent = (errorMsg: string, retry: () => void) => (
    <div className='text-center py-8 px-4'>
      <div className='text-red-600 mb-4'>
        <svg
          className='w-12 h-12 mx-auto mb-2'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z'
          />
        </svg>
        <p className='text-sm font-medium'>Failed to load more results</p>
        <p className='text-xs text-secondary-500 mt-1'>{errorMsg}</p>
      </div>
      <Button onClick={retry} variant='outline' size='sm'>
        Try Again
      </Button>
    </div>
  );

  // Default empty component
  const defaultEmptyComponent = (
    <div className='text-center py-12 px-4'>
      <svg
        className='w-16 h-16 mx-auto mb-4 text-secondary-300'
        fill='none'
        stroke='currentColor'
        viewBox='0 0 24 24'
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
        />
      </svg>
      <h3 className='text-lg font-medium text-secondary-900 mb-2'>
        No results found
      </h3>
      <p className='text-secondary-500'>
        Try adjusting your search criteria or filters.
      </p>
    </div>
  );

  // Default end component
  const defaultEndComponent = (
    <div className='text-center py-6 px-4'>
      <div className='inline-flex items-center space-x-2 text-secondary-500'>
        <svg
          className='w-5 h-5'
          fill='none'
          stroke='currentColor'
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M5 13l4 4L19 7'
          />
        </svg>
        <span className='text-sm'>You've reached the end of the results</span>
      </div>
    </div>
  );

  // Show empty state if no data and not loading
  if (data.length === 0 && !loading) {
    return (
      <div className={cn('w-full', className)}>
        {emptyComponent || defaultEmptyComponent}
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      {/* Item count */}
      {showItemCount && (totalCount !== undefined || data.length > 0) && (
        <div className='mb-4 text-sm text-secondary-600'>
          {totalCount !== undefined ? (
            <span>
              Showing {data.length} of {totalCount.toLocaleString()}{' '}
              {itemCountLabel}
            </span>
          ) : (
            <span>
              {data.length} {itemCountLabel} loaded
            </span>
          )}
        </div>
      )}

      {/* Items list */}
      <div className='space-y-0'>
        {data.map((item: any, index) => (
          <div key={index} className={itemClassName}>
            {renderItem(item, index)}
          </div>
        ))}
      </div>

      {/* Loading state */}
      {loading && (loadingComponent || defaultLoadingComponent)}

      {/* Error state */}
      {error &&
        !loading &&
        (errorComponent
          ? errorComponent(error, () => {
              reset();
              loadMore();
            })
          : defaultErrorComponent(error, () => {
              reset();
              loadMore();
            }))}

      {/* Load more button (optional) */}
      {showLoadMoreButton && hasMore && !loading && !error && (
        <div className='text-center py-6'>
          <Button onClick={loadMore} variant='outline'>
            Load More Results
          </Button>
        </div>
      )}

      {/* End of results */}
      {!hasMore &&
        !loading &&
        data.length > 0 &&
        (endComponent || defaultEndComponent)}

      {/* Intersection observer sentinel (for automatic loading) */}
      {!showLoadMoreButton && hasMore && !error && (
        <div ref={sentinelRef} className='h-4' />
      )}
    </div>
  );
}
