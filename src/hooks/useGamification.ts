/**
 * Gamification Hook
 * React hook for gamification features
 */

import { useCallback, useState } from 'react';

export interface GamificationStats {
  points: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  badgesEarned: number;
  rewardsClaimed: number;
  pointsToNextLevel: number;
  recentAchievements: any[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: string;
  iconUrl?: string;
  pointsRequired: number;
  earnedAt?: string;
}

export interface LeaderboardEntry {
  userId: string;
  userName: string;
  points: number;
  rank: number;
  level: number;
  streak: number;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  challengeType: string;
  targetValue: number;
  pointsReward: number;
  progress?: number;
  completed?: boolean;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  rewardType: string;
  pointsCost: number;
  iconUrl?: string;
  isClaimed: boolean;
}

export function useGamification() {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [availableBadges, setAvailableBadges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [userRank, setUserRank] = useState<{
    rank: number;
    points: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch user's gamification stats
   */
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/gamification/stats', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Fetch user's badges
   */
  const fetchBadges = useCallback(async () => {
    try {
      const response = await fetch('/api/gamification/badges', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch badges');
      }

      const data = await response.json();
      setBadges(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  /**
   * Fetch available badges
   */
  const fetchAvailableBadges = useCallback(async () => {
    try {
      const response = await fetch('/api/gamification/badges/available', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch available badges');
      }

      const data = await response.json();
      setAvailableBadges(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  /**
   * Fetch leaderboard
   */
  const fetchLeaderboard = useCallback(
    async (period = 'all_time', limit = 100) => {
      try {
        const response = await fetch(
          `/api/gamification/leaderboard?period=${period}&limit=${limit}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard');
        }

        const data = await response.json();
        setLeaderboard(data);
      } catch (err: any) {
        setError(err.message);
      }
    },
    []
  );

  /**
   * Fetch user's rank
   */
  const fetchUserRank = useCallback(async (period = 'all_time') => {
    try {
      const response = await fetch(`/api/gamification/rank?period=${period}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rank');
      }

      const data = await response.json();
      setUserRank(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  /**
   * Fetch daily challenges
   */
  const fetchChallenges = useCallback(async () => {
    try {
      const response = await fetch('/api/gamification/challenges', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch challenges');
      }

      const data = await response.json();
      setChallenges(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  /**
   * Fetch available rewards
   */
  const fetchRewards = useCallback(async () => {
    try {
      const response = await fetch('/api/gamification/rewards', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch rewards');
      }

      const data = await response.json();
      setRewards(data);
    } catch (err: any) {
      setError(err.message);
    }
  }, []);

  /**
   * Award points for an action
   */
  const awardPoints = useCallback(
    async (action: string, metadata?: any) => {
      try {
        const response = await fetch('/api/gamification/points', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({ action, metadata }),
        });

        if (!response.ok) {
          throw new Error('Failed to award points');
        }

        const result = await response.json();

        // Refresh stats after awarding points
        await fetchStats();

        return result;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    [fetchStats]
  );

  /**
   * Update login streak
   */
  const updateStreak = useCallback(async () => {
    try {
      const response = await fetch('/api/gamification/streak', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to update streak');
      }

      const result = await response.json();

      // Refresh stats after updating streak
      await fetchStats();

      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  }, [fetchStats]);

  /**
   * Claim a reward
   */
  const claimReward = useCallback(
    async (rewardId: string) => {
      try {
        const response = await fetch(
          `/api/gamification/rewards/${rewardId}/claim`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to claim reward');
        }

        const result = await response.json();

        // Refresh stats and rewards after claiming
        await fetchStats();
        await fetchRewards();

        return result;
      } catch (err: any) {
        setError(err.message);
        throw err;
      }
    },
    [fetchStats, fetchRewards]
  );

  return {
    stats,
    badges,
    availableBadges,
    leaderboard,
    challenges,
    rewards,
    userRank,
    loading,
    error,
    fetchStats,
    fetchBadges,
    fetchAvailableBadges,
    fetchLeaderboard,
    fetchUserRank,
    fetchChallenges,
    fetchRewards,
    awardPoints,
    updateStreak,
    claimReward,
  };
}
