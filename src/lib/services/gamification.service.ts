/**
 * Gamification Service
 * Handles points, badges, achievements, leaderboards, and challenges
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface PointsAction {
  action: string;
  points: number;
  description: string;
  metadata?: Record<string, any>;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  category: string;
  iconUrl?: string;
  pointsRequired: number;
  criteria: Record<string, any>;
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

// Points configuration for different actions
const POINTS_CONFIG: Record<string, number> = {
  complete_profile: 50,
  first_search: 10,
  search: 2,
  save_opportunity: 5,
  create_roadmap: 25,
  complete_roadmap_phase: 15,
  follow_user: 3,
  join_team: 20,
  create_team: 30,
  post_discussion: 10,
  comment: 5,
  share_opportunity: 8,
  daily_login: 5,
  complete_challenge: 50,
  interview_practice: 15,
};

export class GamificationService {
  /**
   * Award points to a user for an action
   */
  async awardPoints(
    userId: string,
    action: string,
    metadata?: Record<string, any>
  ): Promise<{ points: number; newTotal: number; levelUp: boolean }> {
    const points = POINTS_CONFIG[action] || 0;

    if (points === 0) {
      throw new Error(`Unknown action: ${action}`);
    }

    // Get current user points
    const user = await prisma.$queryRaw<
      Array<{ points: number; level: number }>
    >`
      SELECT points, level FROM users WHERE id = ${userId}::uuid
    `;

    if (!user || user.length === 0) {
      throw new Error('User not found');
    }

    const currentPoints = user[0].points;
    const currentLevel = user[0].level;
    const newTotal = currentPoints + points;
    const newLevel = Math.floor(newTotal / 100) + 1;
    const levelUp = newLevel > currentLevel;

    // Update user points
    await prisma.$executeRaw`
      UPDATE users 
      SET points = ${newTotal}, 
          level = ${newLevel},
          updated_at = NOW()
      WHERE id = ${userId}::uuid
    `;

    // Record points history
    await prisma.$executeRaw`
      INSERT INTO points_history (user_id, points, action, description, metadata)
      VALUES (
        ${userId}::uuid,
        ${points},
        ${action},
        ${this.getActionDescription(action)},
        ${JSON.stringify(metadata || {})}::jsonb
      )
    `;

    // Update leaderboards
    await this.updateLeaderboards(userId, newTotal);

    // Check for badge eligibility
    await this.checkBadgeEligibility(userId, action);

    // Check challenge progress
    await this.updateChallengeProgress(userId, action);

    return { points, newTotal, levelUp };
  }

  /**
   * Get user's gamification stats
   */
  async getUserStats(userId: string) {
    const stats = await prisma.$queryRaw<Array<any>>`
      SELECT 
        u.points,
        u.level,
        u.current_streak,
        u.longest_streak,
        u.last_active_date,
        COUNT(DISTINCT ub.badge_id) as badges_earned,
        COUNT(DISTINCT ur.reward_id) as rewards_claimed
      FROM users u
      LEFT JOIN user_badges ub ON u.id = ub.user_id
      LEFT JOIN user_rewards ur ON u.id = ur.user_id
      WHERE u.id = ${userId}::uuid
      GROUP BY u.id
    `;

    if (!stats || stats.length === 0) {
      return null;
    }

    const userStats = stats[0];

    // Get recent achievements
    const recentAchievements = await prisma.$queryRaw<Array<any>>`
      SELECT achievement_type, title, description, points_earned, created_at
      FROM achievements
      WHERE user_id = ${userId}::uuid
      ORDER BY created_at DESC
      LIMIT 5
    `;

    // Get points needed for next level
    const pointsForNextLevel = userStats.level * 100;
    const pointsToNextLevel = pointsForNextLevel - userStats.points;

    return {
      points: userStats.points,
      level: userStats.level,
      currentStreak: userStats.current_streak,
      longestStreak: userStats.longest_streak,
      badgesEarned: Number(userStats.badges_earned),
      rewardsClaimed: Number(userStats.rewards_claimed),
      pointsToNextLevel,
      recentAchievements,
    };
  }

  /**
   * Get user's badges
   */
  async getUserBadges(userId: string) {
    const badges = await prisma.$queryRaw<Array<any>>`
      SELECT 
        b.id,
        b.name,
        b.description,
        b.category,
        b.icon_url,
        b.points_required,
        ub.earned_at,
        ub.progress
      FROM user_badges ub
      JOIN badges b ON ub.badge_id = b.id
      WHERE ub.user_id = ${userId}::uuid
      ORDER BY ub.earned_at DESC
    `;

    return badges;
  }

  /**
   * Get available badges (not yet earned)
   */
  async getAvailableBadges(userId: string) {
    const badges = await prisma.$queryRaw<Array<any>>`
      SELECT 
        b.id,
        b.name,
        b.description,
        b.category,
        b.icon_url,
        b.points_required,
        b.criteria
      FROM badges b
      WHERE b.is_active = true
        AND b.id NOT IN (
          SELECT badge_id FROM user_badges WHERE user_id = ${userId}::uuid
        )
      ORDER BY b.points_required ASC
    `;

    return badges;
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(
    period: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'all_time',
    limit: number = 100
  ): Promise<LeaderboardEntry[]> {
    if (period === 'all_time') {
      const leaderboard = await prisma.$queryRaw<Array<any>>`
        SELECT 
          u.id as user_id,
          u.name as user_name,
          u.points,
          u.level,
          u.current_streak as streak,
          ROW_NUMBER() OVER (ORDER BY u.points DESC) as rank
        FROM users u
        WHERE u.points > 0
        ORDER BY u.points DESC
        LIMIT ${limit}
      `;

      return leaderboard.map(entry => ({
        userId: entry.user_id,
        userName: entry.user_name,
        points: entry.points,
        rank: Number(entry.rank),
        level: entry.level,
        streak: entry.streak,
      }));
    }

    // For time-based periods
    const now = new Date();
    let periodStart: Date;

    switch (period) {
      case 'daily':
        periodStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - dayOfWeek);
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const leaderboard = await prisma.$queryRaw<Array<any>>`
      SELECT 
        le.user_id,
        u.name as user_name,
        le.points,
        u.level,
        u.current_streak as streak,
        le.rank
      FROM leaderboard_entries le
      JOIN users u ON le.user_id = u.id
      WHERE le.period = ${period}
        AND le.period_start = ${periodStart}
      ORDER BY le.rank ASC
      LIMIT ${limit}
    `;

    return leaderboard.map(entry => ({
      userId: entry.user_id,
      userName: entry.user_name,
      points: entry.points,
      rank: entry.rank,
      level: entry.level,
      streak: entry.streak,
    }));
  }

  /**
   * Get user's rank in leaderboard
   */
  async getUserRank(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly' | 'all_time' = 'all_time'
  ) {
    if (period === 'all_time') {
      const result = await prisma.$queryRaw<Array<any>>`
        WITH ranked_users AS (
          SELECT 
            id,
            points,
            ROW_NUMBER() OVER (ORDER BY points DESC) as rank
          FROM users
          WHERE points > 0
        )
        SELECT rank, points
        FROM ranked_users
        WHERE id = ${userId}::uuid
      `;

      return result.length > 0
        ? { rank: Number(result[0].rank), points: result[0].points }
        : null;
    }

    const now = new Date();
    let periodStart: Date;

    switch (period) {
      case 'daily':
        periodStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        break;
      case 'weekly':
        const dayOfWeek = now.getDay();
        periodStart = new Date(now);
        periodStart.setDate(now.getDate() - dayOfWeek);
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'monthly':
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const result = await prisma.$queryRaw<Array<any>>`
      SELECT rank, points
      FROM leaderboard_entries
      WHERE user_id = ${userId}::uuid
        AND period = ${period}
        AND period_start = ${periodStart}
    `;

    return result.length > 0
      ? { rank: result[0].rank, points: result[0].points }
      : null;
  }

  /**
   * Get daily challenges
   */
  async getDailyChallenges(userId: string): Promise<Challenge[]> {
    const today = new Date().toISOString().split('T')[0];

    const challenges = await prisma.$queryRaw<Array<any>>`
      SELECT 
        dc.id,
        dc.title,
        dc.description,
        dc.challenge_type,
        dc.target_value,
        dc.points_reward,
        COALESCE(ucp.current_value, 0) as progress,
        COALESCE(ucp.completed, false) as completed
      FROM daily_challenges dc
      LEFT JOIN user_challenge_progress ucp 
        ON dc.id = ucp.challenge_id AND ucp.user_id = ${userId}::uuid
      WHERE dc.active_date = ${today}::date
        AND dc.is_active = true
      ORDER BY dc.created_at
    `;

    return challenges.map(c => ({
      id: c.id,
      title: c.title,
      description: c.description,
      challengeType: c.challenge_type,
      targetValue: c.target_value,
      pointsReward: c.points_reward,
      progress: c.progress,
      completed: c.completed,
    }));
  }

  /**
   * Update streak for daily login
   */
  async updateStreak(
    userId: string
  ): Promise<{
    currentStreak: number;
    longestStreak: number;
    streakBonus: number;
  }> {
    const user = await prisma.$queryRaw<Array<any>>`
      SELECT current_streak, longest_streak, last_active_date
      FROM users
      WHERE id = ${userId}::uuid
    `;

    if (!user || user.length === 0) {
      throw new Error('User not found');
    }

    const today = new Date().toISOString().split('T')[0];
    const lastActiveDate = user[0].last_active_date;
    let currentStreak = user[0].current_streak || 0;
    let longestStreak = user[0].longest_streak || 0;
    let streakBonus = 0;

    if (!lastActiveDate || lastActiveDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (lastActiveDate === yesterdayStr) {
        // Continue streak
        currentStreak += 1;
      } else {
        // Streak broken, start new
        currentStreak = 1;
      }

      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }

      // Award streak bonus
      if (currentStreak >= 7) {
        streakBonus = Math.floor(currentStreak / 7) * 10;
      }

      await prisma.$executeRaw`
        UPDATE users
        SET current_streak = ${currentStreak},
            longest_streak = ${longestStreak},
            last_active_date = ${today}::date,
            points = points + ${streakBonus},
            updated_at = NOW()
        WHERE id = ${userId}::uuid
      `;

      // Check for streak badges
      if (currentStreak === 7 || currentStreak === 30) {
        await this.checkBadgeEligibility(userId, 'streak');
      }
    }

    return { currentStreak, longestStreak, streakBonus };
  }

  /**
   * Get available rewards
   */
  async getAvailableRewards(userId: string) {
    const rewards = await prisma.$queryRaw<Array<any>>`
      SELECT 
        r.id,
        r.name,
        r.description,
        r.reward_type,
        r.points_cost,
        r.icon_url,
        r.metadata,
        EXISTS(
          SELECT 1 FROM user_rewards ur 
          WHERE ur.reward_id = r.id AND ur.user_id = ${userId}::uuid
        ) as is_claimed
      FROM rewards r
      WHERE r.is_available = true
      ORDER BY r.points_cost ASC
    `;

    return rewards;
  }

  /**
   * Claim a reward
   */
  async claimReward(userId: string, rewardId: string) {
    // Check if user has enough points
    const user = await prisma.$queryRaw<Array<{ points: number }>>`
      SELECT points FROM users WHERE id = ${userId}::uuid
    `;

    if (!user || user.length === 0) {
      throw new Error('User not found');
    }

    const reward = await prisma.$queryRaw<Array<any>>`
      SELECT points_cost, name FROM rewards WHERE id = ${rewardId}::uuid
    `;

    if (!reward || reward.length === 0) {
      throw new Error('Reward not found');
    }

    if (user[0].points < reward[0].points_cost) {
      throw new Error('Insufficient points');
    }

    // Check if already claimed
    const existing = await prisma.$queryRaw<Array<any>>`
      SELECT id FROM user_rewards 
      WHERE user_id = ${userId}::uuid AND reward_id = ${rewardId}::uuid
    `;

    if (existing.length > 0) {
      throw new Error('Reward already claimed');
    }

    // Deduct points and claim reward
    await prisma.$executeRaw`
      UPDATE users
      SET points = points - ${reward[0].points_cost},
          updated_at = NOW()
      WHERE id = ${userId}::uuid
    `;

    await prisma.$executeRaw`
      INSERT INTO user_rewards (user_id, reward_id)
      VALUES (${userId}::uuid, ${rewardId}::uuid)
    `;

    return { success: true, rewardName: reward[0].name };
  }

  // Private helper methods

  private getActionDescription(action: string): string {
    const descriptions: Record<string, string> = {
      complete_profile: 'Completed profile',
      first_search: 'First search',
      search: 'Searched for opportunities',
      save_opportunity: 'Saved an opportunity',
      create_roadmap: 'Created a roadmap',
      complete_roadmap_phase: 'Completed roadmap phase',
      follow_user: 'Followed a user',
      join_team: 'Joined a team',
      create_team: 'Created a team',
      post_discussion: 'Posted in discussion',
      comment: 'Commented on discussion',
      share_opportunity: 'Shared an opportunity',
      daily_login: 'Daily login',
      complete_challenge: 'Completed daily challenge',
      interview_practice: 'Practiced interview',
    };

    return descriptions[action] || action;
  }

  private async updateLeaderboards(userId: string, points: number) {
    const now = new Date();
    const periods = [
      {
        period: 'daily',
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
      },
      {
        period: 'weekly',
        start: (() => {
          const d = new Date(now);
          d.setDate(now.getDate() - now.getDay());
          d.setHours(0, 0, 0, 0);
          return d;
        })(),
      },
      {
        period: 'monthly',
        start: new Date(now.getFullYear(), now.getMonth(), 1),
      },
    ];

    for (const { period, start } of periods) {
      const end = new Date(start);
      if (period === 'daily') {
        end.setDate(start.getDate() + 1);
      } else if (period === 'weekly') {
        end.setDate(start.getDate() + 7);
      } else {
        end.setMonth(start.getMonth() + 1);
      }

      await prisma.$executeRaw`
        INSERT INTO leaderboard_entries (user_id, period, points, period_start, period_end)
        VALUES (
          ${userId}::uuid,
          ${period}::leaderboard_period,
          ${points},
          ${start.toISOString().split('T')[0]}::date,
          ${end.toISOString().split('T')[0]}::date
        )
        ON CONFLICT (user_id, period, period_start)
        DO UPDATE SET 
          points = ${points},
          updated_at = NOW()
      `;
    }

    // Update ranks
    for (const { period, start } of periods) {
      await prisma.$executeRaw`
        WITH ranked AS (
          SELECT 
            id,
            ROW_NUMBER() OVER (ORDER BY points DESC) as new_rank
          FROM leaderboard_entries
          WHERE period = ${period}::leaderboard_period
            AND period_start = ${start.toISOString().split('T')[0]}::date
        )
        UPDATE leaderboard_entries le
        SET rank = ranked.new_rank
        FROM ranked
        WHERE le.id = ranked.id
      `;
    }
  }

  private async checkBadgeEligibility(userId: string, action: string) {
    // This is a simplified version - in production, you'd have more complex logic
    const badges = await prisma.$queryRaw<Array<any>>`
      SELECT id, criteria FROM badges
      WHERE is_active = true
        AND id NOT IN (SELECT badge_id FROM user_badges WHERE user_id = ${userId}::uuid)
    `;

    for (const badge of badges) {
      const criteria = badge.criteria;
      if (criteria.action === action) {
        // Check if criteria met (simplified)
        await prisma.$executeRaw`
          INSERT INTO user_badges (user_id, badge_id)
          VALUES (${userId}::uuid, ${badge.id}::uuid)
          ON CONFLICT (user_id, badge_id) DO NOTHING
        `;
      }
    }
  }

  private async updateChallengeProgress(userId: string, action: string) {
    const today = new Date().toISOString().split('T')[0];

    const challenges = await prisma.$queryRaw<Array<any>>`
      SELECT id, challenge_type, target_value, points_reward
      FROM daily_challenges
      WHERE active_date = ${today}::date
        AND is_active = true
        AND challenge_type = ${action}
    `;

    for (const challenge of challenges) {
      await prisma.$executeRaw`
        INSERT INTO user_challenge_progress (user_id, challenge_id, current_value)
        VALUES (${userId}::uuid, ${challenge.id}::uuid, 1)
        ON CONFLICT (user_id, challenge_id)
        DO UPDATE SET 
          current_value = user_challenge_progress.current_value + 1,
          updated_at = NOW()
      `;

      // Check if challenge completed
      const progress = await prisma.$queryRaw<Array<any>>`
        SELECT current_value, completed
        FROM user_challenge_progress
        WHERE user_id = ${userId}::uuid AND challenge_id = ${challenge.id}::uuid
      `;

      if (
        progress.length > 0 &&
        !progress[0].completed &&
        progress[0].current_value >= challenge.target_value
      ) {
        await prisma.$executeRaw`
          UPDATE user_challenge_progress
          SET completed = true, completed_at = NOW()
          WHERE user_id = ${userId}::uuid AND challenge_id = ${challenge.id}::uuid
        `;

        // Award points
        await this.awardPoints(userId, 'complete_challenge', {
          challengeId: challenge.id,
        });
      }
    }
  }
}

export const gamificationService = new GamificationService();
