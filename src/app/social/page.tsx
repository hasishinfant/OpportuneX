'use client';

import { ActivityFeed } from '@/components/social/ActivityFeed';
import { TeamList } from '@/components/social/TeamList';
import { useState } from 'react';

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState<'feed' | 'teams' | 'discover'>(
    'feed'
  );

  return (
    <div className='min-h-screen bg-gray-50'>
      <div className='mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'>
        <div className='mb-8'>
          <h1 className='text-3xl font-bold text-gray-900'>Social Hub</h1>
          <p className='mt-2 text-gray-600'>
            Connect with other students, join teams, and collaborate
          </p>
        </div>

        <div className='mb-6 border-b border-gray-200'>
          <nav className='-mb-px flex space-x-8'>
            <button
              onClick={() => setActiveTab('feed')}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'feed'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Activity Feed
            </button>
            <button
              onClick={() => setActiveTab('teams')}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'teams'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Teams
            </button>
            <button
              onClick={() => setActiveTab('discover')}
              className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium ${
                activeTab === 'discover'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              }`}
            >
              Discover Users
            </button>
          </nav>
        </div>

        <div className='grid grid-cols-1 gap-6 lg:grid-cols-3'>
          <div className='lg:col-span-2'>
            {activeTab === 'feed' && <ActivityFeed />}
            {activeTab === 'teams' && <TeamList />}
            {activeTab === 'discover' && (
              <div className='text-center text-gray-600'>
                User discovery feature coming soon
              </div>
            )}
          </div>

          <div className='space-y-6'>
            <div className='rounded-lg bg-white p-6 shadow'>
              <h3 className='text-lg font-semibold text-gray-900'>
                Quick Stats
              </h3>
              <div className='mt-4 space-y-3'>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Followers</span>
                  <span className='font-semibold text-gray-900'>0</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Following</span>
                  <span className='font-semibold text-gray-900'>0</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Teams</span>
                  <span className='font-semibold text-gray-900'>0</span>
                </div>
              </div>
            </div>

            <div className='rounded-lg bg-white p-6 shadow'>
              <h3 className='text-lg font-semibold text-gray-900'>
                Suggested Users
              </h3>
              <p className='mt-2 text-sm text-gray-600'>
                Connect with students who share your interests
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
