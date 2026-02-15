'use client';

import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { DiscussionThread } from '@/lib/services/social.service';
import { useEffect, useState } from 'react';

interface DiscussionThreadProps {
  opportunityId: string;
}

export function DiscussionThreadComponent({
  opportunityId,
}: DiscussionThreadProps) {
  const [discussions, setDiscussions] = useState<DiscussionThread[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  useEffect(() => {
    fetchDiscussions();
  }, [opportunityId]);

  const fetchDiscussions = async () => {
    try {
      const response = await fetch(
        `/api/v1/social/discussions/${opportunityId}?page=1&limit=20`
      );

      if (response.ok) {
        const result = await response.json();
        setDiscussions(result.data.data);
      }
    } catch (error) {
      console.error('Fetch discussions error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/v1/social/discussions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          opportunityId,
          title: newTitle,
          content: newContent,
        }),
      });

      if (response.ok) {
        setNewTitle('');
        setNewContent('');
        setShowNewDiscussion(false);
        fetchDiscussions();
      }
    } catch (error) {
      console.error('Create discussion error:', error);
    }
  };

  if (loading) {
    return (
      <div className='flex justify-center py-8'>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-bold text-gray-900'>Discussions</h2>
        <button
          onClick={() => setShowNewDiscussion(!showNewDiscussion)}
          className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
        >
          New Discussion
        </button>
      </div>

      {showNewDiscussion && (
        <Card className='p-4'>
          <form onSubmit={handleCreateDiscussion} className='space-y-3'>
            <input
              type='text'
              placeholder='Discussion title'
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'
              required
            />
            <textarea
              placeholder='What would you like to discuss?'
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'
              rows={4}
              required
            />
            <div className='flex gap-2'>
              <button
                type='submit'
                className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
              >
                Post Discussion
              </button>
              <button
                type='button'
                onClick={() => setShowNewDiscussion(false)}
                className='rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300'
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {discussions.length === 0 ? (
        <Card className='p-6 text-center'>
          <p className='text-gray-600'>
            No discussions yet. Start the conversation!
          </p>
        </Card>
      ) : (
        <div className='space-y-3'>
          {discussions.map(discussion => (
            <Card key={discussion.id} className='p-4'>
              <h3 className='font-semibold text-gray-900'>
                {discussion.title}
              </h3>
              <p className='mt-1 text-sm text-gray-600'>{discussion.content}</p>
              <div className='mt-3 flex items-center gap-4 text-xs text-gray-500'>
                <span>by {discussion.user.name}</span>
                <span>{discussion.commentCount} comments</span>
                <span>
                  {new Date(discussion.createdAt).toLocaleDateString()}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
