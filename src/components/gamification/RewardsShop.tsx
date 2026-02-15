/**
 * Rewards Shop Component
 * Display and allow users to claim rewards
 */

'use client';

import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useGamification } from '@/hooks/useGamification';
import { useEffect, useState } from 'react';

export function RewardsShop() {
  const {
    stats,
    rewards,
    loading,
    error,
    fetchStats,
    fetchRewards,
    claimReward,
  } = useGamification();

  const [claiming, setClaiming] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    fetchStats();
    fetchRewards();
  }, [fetchStats, fetchRewards]);

  const handleClaimReward = async (rewardId: string) => {
    try {
      setClaiming(rewardId);
      setMessage(null);

      const result = await claimReward(rewardId);

      setMessage({
        type: 'success',
        text: `Successfully claimed ${result.rewardName}!`,
      });

      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.message || 'Failed to claim reward',
      });
    } finally {
      setClaiming(null);
    }
  };

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

  const getRewardIcon = (type: string) => {
    switch (type) {
      case 'theme':
        return '🎨';
      case 'feature':
        return '⚡';
      case 'cosmetic':
        return '✨';
      default:
        return '🎁';
    }
  };

  return (
    <div className='max-w-6xl mx-auto p-4 space-y-6'>
      {/* Header */}
      <div className='text-center'>
        <h1 className='text-3xl font-bold mb-2'>Rewards Shop</h1>
        <p className='text-gray-600'>Spend your points on exclusive rewards</p>
      </div>

      {/* User Points */}
      {stats && (
        <Card className='p-6 bg-gradient-to-r from-purple-50 to-blue-50'>
          <div className='flex items-center justify-between'>
            <div>
              <div className='text-sm text-gray-600'>Your Points</div>
              <div className='text-3xl font-bold text-purple-600'>
                {stats.points}
              </div>
            </div>
            <div className='text-right'>
              <div className='text-sm text-gray-600'>Level</div>
              <div className='text-3xl font-bold text-blue-600'>
                {stats.level}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Rewards Grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {rewards.length === 0 ? (
          <div className='col-span-3 text-center text-gray-600 py-8'>
            No rewards available at the moment.
          </div>
        ) : (
          rewards.map(reward => {
            const canAfford = stats ? stats.points >= reward.pointsCost : false;
            const { isClaimed } = reward;

            return (
              <Card
                key={reward.id}
                className={`p-6 ${
                  isClaimed
                    ? 'bg-gray-50 border-2 border-green-500'
                    : canAfford
                      ? 'hover:shadow-lg transition-shadow'
                      : 'opacity-60'
                }`}
              >
                <div className='text-center'>
                  {/* Icon */}
                  <div className='text-5xl mb-3'>
                    {getRewardIcon(reward.rewardType)}
                  </div>

                  {/* Name */}
                  <h3 className='font-bold text-lg mb-2'>{reward.name}</h3>

                  {/* Description */}
                  <p className='text-sm text-gray-600 mb-4'>
                    {reward.description}
                  </p>

                  {/* Type Badge */}
                  <div className='inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full mb-4'>
                    {reward.rewardType}
                  </div>

                  {/* Cost */}
                  <div className='text-2xl font-bold text-purple-600 mb-4'>
                    {reward.pointsCost} points
                  </div>

                  {/* Action Button */}
                  {isClaimed ? (
                    <div className='w-full py-2 bg-green-100 text-green-800 rounded-lg font-medium'>
                      ✓ Claimed
                    </div>
                  ) : (
                    <button
                      onClick={() => handleClaimReward(reward.id)}
                      disabled={!canAfford || claiming === reward.id}
                      className={`w-full py-2 rounded-lg font-medium transition-colors ${
                        canAfford
                          ? 'bg-blue-600 text-white hover:bg-blue-700'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {claiming === reward.id ? (
                        <span className='flex items-center justify-center'>
                          <LoadingSpinner />
                          <span className='ml-2'>Claiming...</span>
                        </span>
                      ) : canAfford ? (
                        'Claim Reward'
                      ) : (
                        `Need ${reward.pointsCost - (stats?.points || 0)} more points`
                      )}
                    </button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Info Card */}
      <Card className='p-4 bg-yellow-50'>
        <div className='text-sm text-gray-700'>
          <p className='font-medium mb-2'>💡 How to earn more points:</p>
          <ul className='list-disc list-inside space-y-1'>
            <li>Complete your daily challenges (+50 points each)</li>
            <li>Maintain your login streak (bonus every 7 days)</li>
            <li>Search and save opportunities (+2-5 points)</li>
            <li>Create roadmaps (+25 points)</li>
            <li>Engage with the community (+3-10 points)</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}
