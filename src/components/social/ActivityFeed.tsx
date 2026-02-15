'use client';

import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { ActivityFeedItem } from '@/lib/services/social.service';
import { useEffect, useState } from 'react';

export function ActivityFeed() {
  const [activities, setActivities] = useState<ActivityFeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [page]);

  const fetchActivities = async () => {
    try {
      const response = await fetch(
        `/api/v1/social/feed?page=${page}&limit=20`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        setActivities(prev => [...prev, ...result.data.data]);
        setHasMore(result.data.pagination.hasNext);
      }
    } catch (error) {
      console.error('Fetch activities error:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityMessage = (activity: ActivityFeedItem) => {
    switch (activity.activityType) {
      case 'saved_opportunity':
        return 'saved an opportunity';
      case 'completed_roadmap':
        return 'completed a roadmap';
      case 'joined_team':
        return 'joined a team';
      case 'shared_opportunity':
        return 'shared an opportunity';
      case 'completed_milestone':
        return 'completed a milestone';
      default:
        return 'performed an action';
    }
  };

  if (loading && activities.length === 0) {
    return (
      <div className='flex justify-center py-8'>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <h2 className='text-xl font-bold text-gray-900'>Activity Feed</h2>

      {activities.length === 0 ? (
        <Card className='p-6 text-center'>
          <p className='text-gray-600'>
            No activities yet. Follow users to see their activities here.
          </p>
        </Card>
      ) : (
        <>
          {activities.map(activity => (
            <Card key={activity.id} className='p-4'>
              <div className='flex items-start gap-3'>
                <div className='flex-1'>
                  <p className='text-sm text-gray-900'>
                    <span className='font-semibold'>{activity.user.name}</span>{' '}
                    {getActivityMessage(activity)}
                  </p>
                  <p className='mt-1 text-xs text-gray-500'>
                    {new Date(activity.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </Card>
          ))}

          {hasMore && (
            <button
              onClick={() => setPage(p => p + 1)}
              className='w-full rounded-lg bg-gray-100 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200'
            >
              Load More
            </button>
          )}
        </>
      )}
    </div>
  );
}
