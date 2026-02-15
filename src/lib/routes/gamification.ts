/**
 * Gamification API Routes
 */

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { gamificationService } from '../services/gamification.service';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

/**
 * GET /api/gamification/stats
 * Get user's gamification stats
 */
router.get('/stats', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await gamificationService.getUserStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching gamification stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * POST /api/gamification/points
 * Award points for an action
 */
router.post('/points', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { action, metadata } = req.body;
    if (!action) {
      return res.status(400).json({ error: 'Action is required' });
    }

    const result = await gamificationService.awardPoints(
      userId,
      action,
      metadata
    );
    res.json(result);
  } catch (error: any) {
    console.error('Error awarding points:', error);
    res.status(500).json({ error: error.message || 'Failed to award points' });
  }
});

/**
 * GET /api/gamification/badges
 * Get user's earned badges
 */
router.get('/badges', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const badges = await gamificationService.getUserBadges(userId);
    res.json(badges);
  } catch (error) {
    console.error('Error fetching badges:', error);
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

/**
 * GET /api/gamification/badges/available
 * Get available badges (not yet earned)
 */
router.get('/badges/available', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const badges = await gamificationService.getAvailableBadges(userId);
    res.json(badges);
  } catch (error) {
    console.error('Error fetching available badges:', error);
    res.status(500).json({ error: 'Failed to fetch available badges' });
  }
});

/**
 * GET /api/gamification/leaderboard
 * Get leaderboard
 */
router.get('/leaderboard', async (req, res) => {
  try {
    const period = (req.query.period as string) || 'all_time';
    const limit = parseInt(req.query.limit as string) || 100;

    if (!['daily', 'weekly', 'monthly', 'all_time'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period' });
    }

    const leaderboard = await gamificationService.getLeaderboard(
      period as any,
      limit
    );
    res.json(leaderboard);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

/**
 * GET /api/gamification/rank
 * Get user's rank in leaderboard
 */
router.get('/rank', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const period = (req.query.period as string) || 'all_time';
    if (!['daily', 'weekly', 'monthly', 'all_time'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period' });
    }

    const rank = await gamificationService.getUserRank(userId, period as any);
    res.json(rank);
  } catch (error) {
    console.error('Error fetching user rank:', error);
    res.status(500).json({ error: 'Failed to fetch rank' });
  }
});

/**
 * GET /api/gamification/challenges
 * Get daily challenges
 */
router.get('/challenges', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const challenges = await gamificationService.getDailyChallenges(userId);
    res.json(challenges);
  } catch (error) {
    console.error('Error fetching challenges:', error);
    res.status(500).json({ error: 'Failed to fetch challenges' });
  }
});

/**
 * POST /api/gamification/streak
 * Update user's login streak
 */
router.post('/streak', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await gamificationService.updateStreak(userId);
    res.json(result);
  } catch (error) {
    console.error('Error updating streak:', error);
    res.status(500).json({ error: 'Failed to update streak' });
  }
});

/**
 * GET /api/gamification/rewards
 * Get available rewards
 */
router.get('/rewards', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const rewards = await gamificationService.getAvailableRewards(userId);
    res.json(rewards);
  } catch (error) {
    console.error('Error fetching rewards:', error);
    res.status(500).json({ error: 'Failed to fetch rewards' });
  }
});

/**
 * POST /api/gamification/rewards/:rewardId/claim
 * Claim a reward
 */
router.post('/rewards/:rewardId/claim', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { rewardId } = req.params;
    const result = await gamificationService.claimReward(userId, rewardId);
    res.json(result);
  } catch (error: any) {
    console.error('Error claiming reward:', error);
    res.status(500).json({ error: error.message || 'Failed to claim reward' });
  }
});

export default router;
