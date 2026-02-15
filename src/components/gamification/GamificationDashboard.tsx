/**
 * Gamification Dashboard Component
 * Main dashboard showing user's gamification stats, badges, and challenges
 */

'use client';

import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useGamification } from '@/hooks/useGamification';
import { useEffect, useState } from 'react';

export function GamificationDashboard() {
  const {
    stats,
    badges,
    challenges,
    userRank,
    loading,
    error,
    fetchStats,
    fetchBadges,
    fetchChallenges,
    fetchUserRank,
  } = useGamification();

  const [activeTab, setActiveTab] = useState<
    'overview' | 'badges' | 'challenges'
  >('overview');

  useEffect(() => {
    fetchStats();
    fetchBadges();
    fetchChallenges();
    fetchUserRank();
  }, [fetchStats, fetchBadges, fetchChallenges, fetchUserRank]);

  if (loading && !stats) {
    return (
      <div className='flex justify-center items-center min-h-screen'>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <div className='text-center text-red-600 p-4'>Error: {error}</div>;
  }

  const progressPercentage = stats ? ((stats.points % 100) / 100) * 100 : 0;

  return (
    <div className='max-w-6xl mx-auto p-4 space-y-6'>
      {/* Header */}
      <div className='text-center'>
        <h1 className='text-3xl font-bold mb-2'>Your Progress</h1>
        <p className='text-gray-600'>
          Track your achievements and compete with others
        </p>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
          <Card className='p-4 text-center'>
            <div className='text-3xl font-bold text-blue-600'>
              {stats.points}
            </div>
            <div className='text-sm text-gray-600'>Total Points</div>
          </Card>

          <Card className='p-4 text-center'>
            <div className='text-3xl font-bold text-purple-600'>
              Level {stats.level}
            </div>
            <div className='text-sm text-gray-600'>Current Level</div>
            <div className='mt-2 w-full bg-gray-200 rounded-full h-2'>
              <div
                className='bg-purple-600 h-2 rounded-full transition-all'
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className='text-xs text-gray-500 mt-1'>
              {stats.pointsToNextLevel} points to next level
            </div>
          </Card>

          <Card className='p-4 text-center'>
            <div className='text-3xl font-bold text-orange-600'>
              {stats.currentStreak} 🔥
            </div>
            <div className='text-sm text-gray-600'>Day Streak</div>
            <div className='text-xs text-gray-500 mt-1'>
              Longest: {stats.longestStreak} days
            </div>
          </Card>

          <Card className='p-4 text-center'>
            <div className='text-3xl font-bold text-green-600'>
              {stats.badgesEarned}
            </div>
            <div className='text-sm text-gray-600'>Badges Earned</div>
            {userRank && (
              <div className='text-xs text-gray-500 mt-1'>
                Rank #{userRank.rank}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className='flex space-x-4 border-b'>
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'overview'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('badges')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'badges'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Badges ({badges.length})
        </button>
        <button
          onClick={() => setActiveTab('challenges')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'challenges'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          Daily Challenges ({challenges.filter(c => !c.completed).length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && stats && (
        <div className='space-y-6'>
          {/* Recent Achievements */}
          {stats.recentAchievements && stats.recentAchievements.length > 0 && (
            <Card className='p-6'>
              <h2 className='text-xl font-bold mb-4'>Recent Achievements</h2>
              <div className='space-y-3'>
                {stats.recentAchievements.map(
                  (achievement: any, index: number) => (
                    <div
                      key={index}
                      className='flex items-center justify-between p-3 bg-gray-50 rounded-lg'
                    >
                      <div>
                        <div className='font-medium'>{achievement.title}</div>
                        <div className='text-sm text-gray-600'>
                          {achievement.description}
                        </div>
                      </div>
                      <div className='text-green-600 font-bold'>
                        +{achievement.points_earned} pts
                      </div>
                    </div>
                  )
                )}
              </div>
            </Card>
          )}

          {/* Quick Stats */}
          <Card className='p-6'>
            <h2 className='text-xl font-bold mb-4'>Activity Summary</h2>
            <div className='grid grid-cols-2 gap-4'>
              <div className='p-4 bg-blue-50 rounded-lg'>
                <div className='text-2xl font-bold text-blue-600'>
                  {stats.badgesEarned}
                </div>
                <div className='text-sm text-gray-600'>Badges Collected</div>
              </div>
              <div className='p-4 bg-purple-50 rounded-lg'>
                <div className='text-2xl font-bold text-purple-600'>
                  {stats.rewardsClaimed}
                </div>
                <div className='text-sm text-gray-600'>Rewards Claimed</div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === 'badges' && (
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {badges.length === 0 ? (
            <div className='col-span-3 text-center text-gray-600 py-8'>
              No badges earned yet. Complete challenges to earn badges!
            </div>
          ) : (
            badges.map(badge => (
              <Card key={badge.id} className='p-4'>
                <div className='text-center'>
                  <div className='text-4xl mb-2'>🏆</div>
                  <h3 className='font-bold'>{badge.name}</h3>
                  <p className='text-sm text-gray-600 mt-1'>
                    {badge.description}
                  </p>
                  <div className='mt-2 text-xs text-gray-500'>
                    Earned {new Date(badge.earnedAt!).toLocaleDateString()}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {activeTab === 'challenges' && (
        <div className='space-y-4'>
          {challenges.length === 0 ? (
            <div className='text-center text-gray-600 py-8'>
              No challenges available today. Check back tomorrow!
            </div>
          ) : (
            challenges.map(challenge => (
              <Card key={challenge.id} className='p-4'>
                <div className='flex items-center justify-between'>
                  <div className='flex-1'>
                    <h3 className='font-bold'>{challenge.title}</h3>
                    <p className='text-sm text-gray-600 mt-1'>
                      {challenge.description}
                    </p>
                    <div className='mt-3'>
                      <div className='flex items-center justify-between text-sm mb-1'>
                        <span>
                          Progress: {challenge.progress}/{challenge.targetValue}
                        </span>
                        <span className='text-green-600 font-medium'>
                          +{challenge.pointsReward} pts
                        </span>
                      </div>
                      <div className='w-full bg-gray-200 rounded-full h-2'>
                        <div
                          className={`h-2 rounded-full transition-all ${
                            challenge.completed ? 'bg-green-600' : 'bg-blue-600'
                          }`}
                          style={{
                            width: `${Math.min(
                              ((challenge.progress || 0) /
                                challenge.targetValue) *
                                100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  {challenge.completed && (
                    <div className='ml-4 text-green-600 text-2xl'>✓</div>
                  )}
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
