'use client';

import { Button } from '@/components/ui/Button';
import { InfiniteScrollList } from '@/components/ui/InfiniteScrollList';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';
import { useMemo, useState } from 'react';
import { OpportunityCard } from './OpportunityCard';

interface BackendOpportunity {
  _id: string;
  title: string;
  description: string;
  category: 'hackathon' | 'internship' | 'workshop' | 'quiz';
  platform: string;
  skills_required: string[];
  organizer_type: 'company' | 'startup' | 'college';
  mode: 'online' | 'offline' | 'hybrid';
  location: {
    city: string;
    state: string;
    country: string;
  };
  start_date: string;
  deadline: string;
  official_link: string;
  tags: string[];
}

interface OpportunityListProps {
  opportunities?: BackendOpportunity[];
  loading?: boolean;
  onLoadMore?: () => void;
  hasMore?: boolean;
  onFavorite?: (id: string) => void;
  onApply?: (id: string) => void;
  favoriteIds?: string[];
  className?: string;
  emptyMessage?: string;
  sortBy?: 'deadline' | 'relevance' | 'newest';
  onSortChange?: (sort: 'deadline' | 'relevance' | 'newest') => void;
  // New props for infinite scroll
  fetchMore?: (page: number) => Promise<{
    data: BackendOpportunity[];
    hasMore: boolean;
    totalCount?: number;
  }>;
  enableInfiniteScroll?: boolean;
  initialData?: BackendOpportunity[];
}

export function OpportunityList({
  opportunities = [],
  loading = false,
  onLoadMore,
  hasMore = false,
  onFavorite,
  onApply,
  favoriteIds = [],
  className,
  emptyMessage = 'No opportunities found. Try adjusting your search criteria.',
  sortBy = 'relevance',
  onSortChange,
  fetchMore,
  enableInfiniteScroll = false,
  initialData = [],
}: OpportunityListProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Use either provided opportunities or initial data for infinite scroll
  const dataToUse = enableInfiniteScroll ? initialData : opportunities;

  const sortedOpportunities = useMemo(() => {
    const sorted = [...dataToUse];

    switch (sortBy) {
      case 'deadline':
        return sorted.sort(
          (a, b) =>
            new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
        );
      case 'newest':
        return sorted.sort(
          (a, b) =>
            new Date(b.deadline).getTime() - new Date(a.deadline).getTime()
        );
      case 'relevance':
      default:
        return sorted; // Assume already sorted by relevance from API
    }
  }, [dataToUse, sortBy]);

  // Render opportunity card
  const renderOpportunityCard = (opportunity: BackendOpportunity) => (
    <OpportunityCard
      key={opportunity._id}
      opportunity={opportunity}
      onFavorite={onFavorite}
      isFavorited={favoriteIds.includes(opportunity._id)}
      className={viewMode === 'list' ? 'max-w-none' : ''}
    />
  );

  if (loading && dataToUse.length === 0) {
    return (
      <div className='flex items-center justify-center py-12'>
        <LoadingSpinner size='lg' />
        <span className='ml-3 text-secondary-600'>
          Finding opportunities for you...
        </span>
      </div>
    );
  }

  // Custom empty component
  const emptyComponent = (
    <div className='text-center py-12'>
      <div className='w-24 h-24 mx-auto mb-4 text-secondary-300'>
        <svg fill='currentColor' viewBox='0 0 24 24'>
          <path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z' />
        </svg>
      </div>
      <h3 className='text-lg font-medium text-secondary-900 mb-2'>
        No opportunities found
      </h3>
      <p className='text-secondary-600 max-w-md mx-auto'>{emptyMessage}</p>
    </div>
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header with controls */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <div className='flex items-center space-x-4'>
          <p className='text-sm text-secondary-600'>
            {dataToUse.length} opportunities{' '}
            {enableInfiniteScroll ? 'loaded' : 'found'}
          </p>

          {/* Sort Options */}
          {onSortChange && (
            <select
              value={sortBy}
              onChange={e =>
                onSortChange(
                  e.target.value as 'deadline' | 'relevance' | 'newest'
                )
              }
              className='text-sm border border-secondary-300 rounded-md px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500'
            >
              <option value='relevance'>Most Relevant</option>
              <option value='deadline'>Deadline (Soonest)</option>
              <option value='newest'>Newest First</option>
            </select>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className='flex items-center space-x-1 bg-secondary-100 rounded-lg p-1'>
          <button
            onClick={() => setViewMode('grid')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'grid'
                ? 'bg-white shadow-sm text-primary-600'
                : 'text-secondary-600 hover:text-secondary-900'
            )}
            aria-label='Grid view'
          >
            <svg className='h-4 w-4' fill='currentColor' viewBox='0 0 24 24'>
              <path d='M3 3h8v8H3V3zm10 0h8v8h-8V3zM3 13h8v8H3v-8zm10 0h8v8h-8v-8z' />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={cn(
              'p-2 rounded-md transition-colors',
              viewMode === 'list'
                ? 'bg-white shadow-sm text-primary-600'
                : 'text-secondary-600 hover:text-secondary-900'
            )}
            aria-label='List view'
          >
            <svg className='h-4 w-4' fill='currentColor' viewBox='0 0 24 24'>
              <path d='M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z' />
            </svg>
          </button>
        </div>
      </div>

      {/* Infinite Scroll List or Regular List */}
      {enableInfiniteScroll && fetchMore ? (
        <InfiniteScrollList
          fetchMore={fetchMore}
          renderItem={renderOpportunityCard}
          initialData={sortedOpportunities}
          className={cn(
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
              : 'space-y-4'
          )}
          emptyComponent={emptyComponent}
          showItemCount={true}
          itemCountLabel='opportunities'
        />
      ) : (
        <>
          {/* Regular Opportunities Grid/List */}
          <div
            className={cn(
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
                : 'space-y-4'
            )}
          >
            {sortedOpportunities.map(opportunity =>
              renderOpportunityCard(opportunity)
            )}
          </div>

          {/* Loading More */}
          {loading && dataToUse.length > 0 && (
            <div className='flex items-center justify-center py-8'>
              <LoadingSpinner size='md' />
              <span className='ml-3 text-secondary-600'>
                Loading more opportunities...
              </span>
            </div>
          )}

          {/* Load More Button */}
          {!loading && hasMore && onLoadMore && (
            <div className='flex justify-center py-8'>
              <Button onClick={onLoadMore} variant='outline' size='lg'>
                Load More Opportunities
              </Button>
            </div>
          )}

          {/* End of Results */}
          {!loading && !hasMore && dataToUse.length > 0 && (
            <div className='text-center py-8'>
              <p className='text-secondary-600'>
                You've reached the end of the results
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
