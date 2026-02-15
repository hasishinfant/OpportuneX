/**
 * Badge Showcase Component
 * Compact display of user badges for profile/header
 */

'use client';

import { useGamification } from '@/hooks/useGamification';
import { useEffect } from 'react';

interface BadgeShowcaseProps {
  userId?: string;
  maxDisplay?: number;
  compact?: boolean;
}

export function BadgeShowcase({
  maxDisplay = 3,
  compact = false,
}: BadgeShowcaseProps) {
  const { badges, fetchBadges } = useGamification();

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  const displayBadges = badges.slice(0, maxDisplay);
  const remainingCount = Math.max(0, badges.length - maxDisplay);

  if (badges.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className='flex items-center space-x-1'>
        {displayBadges.map(badge => (
          <div
            key={badge.id}
            className='w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-xs'
            title={badge.name}
          >
            🏆
          </div>
        ))}
        {remainingCount > 0 && (
          <div className='text-xs text-gray-600'>+{remainingCount}</div>
        )}
      </div>
    );
  }

  return (
    <div className='flex flex-wrap gap-2'>
      {displayBadges.map(badge => (
        <div
          key={badge.id}
          className='px-3 py-1 bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-full flex items-center space-x-2'
          title={badge.description}
        >
          <span className='text-sm'>🏆</span>
          <span className='text-xs font-medium'>{badge.name}</span>
        </div>
      ))}
      {remainingCount > 0 && (
        <div className='px-3 py-1 bg-gray-100 rounded-full text-xs text-gray-600'>
          +{remainingCount} more
        </div>
      )}
    </div>
  );
}
