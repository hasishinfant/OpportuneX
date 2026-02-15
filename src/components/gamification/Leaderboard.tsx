/**
 * Leaderboard Component
 * Display rankings of users based on points
 */

'use client';

import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useGamification } from '@/hooks/useGamification';
import { useEffect, useState } from 'react';

type Period = 'daily' | 'weekly' | 'monthly' | 'all_time';

export function Leaderboard() {
  const {
    leaderboard,
    userRank,
    loading,
    error,
    fetchLeaderboard,
    fetchUserRank,
  } = useGamification();

  const [period, setPeriod] = useState<Period>('all_time');

  useEffect(() => {
    fetchLeaderboard(period, 50);
    fetchUserRank(period);
  }, [period, fetchLeaderboard, fetchUserRank]);

  if (loading && leaderboard.length === 0) {
    return (
      <div className='flex justify-center items-center min-h-screen'>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <div className='text-center text-red-600 p-4'>Error: {error}</div>;
  }

  const getMedalEmoji = (rank: number) => {
    switch (rank) {
      case 1:
        return '🥇';
      case 2:
        return '🥈';
      case 3:
        return '🥉';
      default:
        return null;
    }
  };

  return (
    <div className='max-w-4xl mx-auto p-4 space-y-6'>
      {/* Header */}
      <div className='text-center'>
        <h1 className='text-3xl font-bold mb-2'>Leaderboard</h1>
        <p className='text-gray-600'>See how you rank against other users</p>
      </div>

      {/* Period Selector */}
      <div className='flex justify-center space-x-2'>
        {(['daily', 'weekly', 'monthly', 'all_time'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              period === p
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {p === 'all_time'
              ? 'All Time'
              : p.charAt(0).toUpperCase() + p.slice(1)}
          </button>
        ))}
      </div>

      {/* User's Rank Card */}
      {userRank && (
        <Card className='p-4 bg-gradient-to-r from-blue-50 to-purple-50'>
          <div className='flex items-center justify-between'>
            <div>
              <div className='text-sm text-gray-600'>Your Rank</div>
              <div className='text-2xl font-bold text-blue-600'>
                #{userRank.rank}
              </div>
            </div>
            <div className='text-right'>
              <div className='text-sm text-gray-600'>Your Points</div>
              <div className='text-2xl font-bold text-purple-600'>
                {userRank.points}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Leaderboard List */}
      <Card className='overflow-hidden'>
        <div className='divide-y'>
          {leaderboard.length === 0 ? (
            <div className='text-center text-gray-600 py-8'>
              No leaderboard data available for this period.
            </div>
          ) : (
            leaderboard.map(entry => (
              <div
                key={entry.userId}
                className={`p-4 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                  entry.rank <= 3 ? 'bg-yellow-50' : ''
                }`}
              >
                <div className='flex items-center space-x-4 flex-1'>
                  {/* Rank */}
                  <div className='w-12 text-center'>
                    {getMedalEmoji(entry.rank) || (
                      <span className='text-lg font-bold text-gray-600'>
                        #{entry.rank}
                      </span>
                    )}
                  </div>

                  {/* User Info */}
                  <div className='flex-1'>
                    <div className='font-medium'>{entry.userName}</div>
                    <div className='text-sm text-gray-600'>
                      Level {entry.level}
                      {entry.streak > 0 && (
                        <span className='ml-2'>
                          🔥 {entry.streak} day streak
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Points */}
                  <div className='text-right'>
                    <div className='text-xl font-bold text-blue-600'>
                      {entry.points.toLocaleString()}
                    </div>
                    <div className='text-xs text-gray-500'>points</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Info Card */}
      <Card className='p-4 bg-blue-50'>
        <div className='text-sm text-gray-700'>
          <p className='font-medium mb-2'>How to climb the leaderboard:</p>
          <ul className='list-disc list-inside space-y-1'>
            <li>Complete daily challenges</li>
            <li>Maintain your login streak</li>
            <li>Search and save opportunities</li>
            <li>Create and complete roadmaps</li>
            <li>Engage with the community</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
