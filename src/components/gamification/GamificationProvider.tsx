/**
 * Gamification Provider
 * Context provider for gamification features across the app
 */

'use client';

import { useGamification } from '@/hooks/useGamification';
import React, { createContext, useContext, useState } from 'react';
import { PointsNotification } from './PointsNotification';

interface GamificationContextType {
  awardPointsWithNotification: (
    action: string,
    metadata?: any
  ) => Promise<void>;
  updateStreakOnLogin: () => Promise<void>;
}

const GamificationContext = createContext<GamificationContextType | null>(null);

export function useGamificationContext() {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error(
      'useGamificationContext must be used within GamificationProvider'
    );
  }
  return context;
}

interface GamificationProviderProps {
  children: React.ReactNode;
}

export function GamificationProvider({ children }: GamificationProviderProps) {
  const { awardPoints, updateStreak } = useGamification();
  const [notification, setNotification] = useState<{
    points: number;
    action: string;
    levelUp?: boolean;
  } | null>(null);

  /**
   * Award points and show notification
   */
  const awardPointsWithNotification = async (
    action: string,
    metadata?: any
  ) => {
    try {
      const result = await awardPoints(action, metadata);

      // Show notification
      setNotification({
        points: result.points,
        action: getActionDescription(action),
        levelUp: result.levelUp,
      });
    } catch (error) {
      console.error('Error awarding points:', error);
    }
  };

  /**
   * Update streak on login
   */
  const updateStreakOnLogin = async () => {
    try {
      const streakResult = await updateStreak();

      // Show notification if streak bonus earned
      if (streakResult.streakBonus > 0) {
        setNotification({
          points: streakResult.streakBonus,
          action: `${streakResult.currentStreak} day streak bonus! 🔥`,
          levelUp: false,
        });
      }

      // Award daily login points
      await awardPointsWithNotification('daily_login');
    } catch (error) {
      console.error('Error updating streak:', error);
    }
  };

  const clearNotification = () => {
    setNotification(null);
  };

  const value: GamificationContextType = {
    awardPointsWithNotification,
    updateStreakOnLogin,
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}
      {notification && (
        <PointsNotification
          points={notification.points}
          action={notification.action}
          levelUp={notification.levelUp}
          onClose={clearNotification}
        />
      )}
    </GamificationContext.Provider>
  );
}

function getActionDescription(action: string): string {
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
