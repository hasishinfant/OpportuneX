'use client';

import { Card } from '@/components/ui/Card';
import type { PublicUserProfile } from '@/lib/services/social.service';
import { useState } from 'react';

interface UserProfileCardProps {
  profile: PublicUserProfile;
  onFollow?: () => void;
  onUnfollow?: () => void;
  showFollowButton?: boolean;
}

export function UserProfileCard({
  profile,
  onFollow,
  onUnfollow,
  showFollowButton = true,
}: UserProfileCardProps) {
  const [isFollowing, setIsFollowing] = useState(profile.isFollowing || false);
  const [loading, setLoading] = useState(false);

  const handleFollowToggle = async () => {
    setLoading(true);
    try {
      if (isFollowing) {
        await onUnfollow?.();
        setIsFollowing(false);
      } else {
        await onFollow?.();
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Follow toggle error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className='p-4'>
      <div className='flex items-start justify-between'>
        <div className='flex-1'>
          <h3 className='text-lg font-semibold text-gray-900'>
            {profile.name}
          </h3>
          {profile.institution && (
            <p className='text-sm text-gray-600'>{profile.institution}</p>
          )}
          {profile.degree && (
            <p className='text-sm text-gray-500'>{profile.degree}</p>
          )}

          <div className='mt-2 flex gap-4 text-sm text-gray-600'>
            <span>{profile.followerCount} followers</span>
            <span>{profile.followingCount} following</span>
          </div>

          {profile.technicalSkills.length > 0 && (
            <div className='mt-3 flex flex-wrap gap-2'>
              {profile.technicalSkills.slice(0, 5).map(skill => (
                <span
                  key={skill}
                  className='rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-700'
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {showFollowButton && (
          <button
            onClick={handleFollowToggle}
            disabled={loading}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              isFollowing
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            } disabled:opacity-50`}
          >
            {loading ? 'Loading...' : isFollowing ? 'Following' : 'Follow'}
          </button>
        )}
      </div>
    </Card>
  );
}
