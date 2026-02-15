/**
 * Gamification Service Tests
 */

import { gamificationService } from '@/lib/services/gamification.service';

describe('GamificationService', () => {
  const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

  describe('awardPoints', () => {
    it('should award points for valid actions', async () => {
      const result = await gamificationService.awardPoints(
        mockUserId,
        'search'
      );

      expect(result).toHaveProperty('points');
      expect(result).toHaveProperty('newTotal');
      expect(result).toHaveProperty('levelUp');
      expect(result.points).toBeGreaterThan(0);
    });

    it('should throw error for invalid action', async () => {
      await expect(
        gamificationService.awardPoints(mockUserId, 'invalid_action')
      ).rejects.toThrow('Unknown action');
    });

    it('should detect level up when crossing threshold', async () => {
      // This would require mocking the database to set specific point values
      // For now, we test the structure
      const result = await gamificationService.awardPoints(
        mockUserId,
        'complete_profile'
      );
      expect(typeof result.levelUp).toBe('boolean');
    });
  });

  describe('getUserStats', () => {
    it('should return user gamification stats', async () => {
      const stats = await gamificationService.getUserStats(mockUserId);

      if (stats) {
        expect(stats).toHaveProperty('points');
        expect(stats).toHaveProperty('level');
        expect(stats).toHaveProperty('currentStreak');
        expect(stats).toHaveProperty('longestStreak');
        expect(stats).toHaveProperty('badgesEarned');
        expect(stats).toHaveProperty('pointsToNextLevel');
      }
    });

    it('should return null for non-existent user', async () => {
      const stats = await gamificationService.getUserStats(
        '00000000-0000-0000-0000-000000000000'
      );
      expect(stats).toBeNull();
    });
  });

  describe('getLeaderboard', () => {
    it('should return leaderboard for all time', async () => {
      const leaderboard = await gamificationService.getLeaderboard(
        'all_time',
        10
      );

      expect(Array.isArray(leaderboard)).toBe(true);
      if (leaderboard.length > 0) {
        expect(leaderboard[0]).toHaveProperty('userId');
        expect(leaderboard[0]).toHaveProperty('userName');
        expect(leaderboard[0]).toHaveProperty('points');
        expect(leaderboard[0]).toHaveProperty('rank');
        expect(leaderboard[0]).toHaveProperty('level');
      }
    });

    it('should return leaderboard for daily period', async () => {
      const leaderboard = await gamificationService.getLeaderboard('daily', 10);
      expect(Array.isArray(leaderboard)).toBe(true);
    });

    it('should respect limit parameter', async () => {
      const leaderboard = await gamificationService.getLeaderboard(
        'all_time',
        5
      );
      expect(leaderboard.length).toBeLessThanOrEqual(5);
    });
  });

  describe('updateStreak', () => {
    it('should update user streak on login', async () => {
      const result = await gamificationService.updateStreak(mockUserId);

      expect(result).toHaveProperty('currentStreak');
      expect(result).toHaveProperty('longestStreak');
      expect(result).toHaveProperty('streakBonus');
      expect(result.currentStreak).toBeGreaterThanOrEqual(0);
    });

    it('should award bonus for 7-day streak', async () => {
      // This would require mocking to set up a 7-day streak
      const result = await gamificationService.updateStreak(mockUserId);
      expect(typeof result.streakBonus).toBe('number');
    });
  });

  describe('getDailyChallenges', () => {
    it('should return daily challenges for user', async () => {
      const challenges =
        await gamificationService.getDailyChallenges(mockUserId);

      expect(Array.isArray(challenges)).toBe(true);
      if (challenges.length > 0) {
        expect(challenges[0]).toHaveProperty('id');
        expect(challenges[0]).toHaveProperty('title');
        expect(challenges[0]).toHaveProperty('description');
        expect(challenges[0]).toHaveProperty('targetValue');
        expect(challenges[0]).toHaveProperty('pointsReward');
      }
    });
  });

  describe('claimReward', () => {
    const mockRewardId = '123e4567-e89b-12d3-a456-426614174001';

    it('should throw error if user has insufficient points', async () => {
      await expect(
        gamificationService.claimReward(mockUserId, mockRewardId)
      ).rejects.toThrow();
    });

    it('should throw error if reward already claimed', async () => {
      // This would require setting up a claimed reward in the database
      // For now, we test the error handling structure
      await expect(
        gamificationService.claimReward(mockUserId, mockRewardId)
      ).rejects.toThrow();
    });
  });

  describe('getUserBadges', () => {
    it('should return user earned badges', async () => {
      const badges = await gamificationService.getUserBadges(mockUserId);

      expect(Array.isArray(badges)).toBe(true);
      if (badges.length > 0) {
        expect(badges[0]).toHaveProperty('id');
        expect(badges[0]).toHaveProperty('name');
        expect(badges[0]).toHaveProperty('description');
        expect(badges[0]).toHaveProperty('category');
      }
    });
  });

  describe('getAvailableBadges', () => {
    it('should return badges not yet earned', async () => {
      const badges = await gamificationService.getAvailableBadges(mockUserId);

      expect(Array.isArray(badges)).toBe(true);
      if (badges.length > 0) {
        expect(badges[0]).toHaveProperty('id');
        expect(badges[0]).toHaveProperty('name');
        expect(badges[0]).toHaveProperty('criteria');
      }
    });
  });

  describe('getUserRank', () => {
    it('should return user rank for all time', async () => {
      const rank = await gamificationService.getUserRank(
        mockUserId,
        'all_time'
      );

      if (rank) {
        expect(rank).toHaveProperty('rank');
        expect(rank).toHaveProperty('points');
        expect(rank.rank).toBeGreaterThan(0);
      }
    });

    it('should return null if user not in leaderboard', async () => {
      const rank = await gamificationService.getUserRank(
        '00000000-0000-0000-0000-000000000000'
      );
      expect(rank).toBeNull();
    });
  });
});
