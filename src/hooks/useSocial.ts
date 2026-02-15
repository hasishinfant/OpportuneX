import type {
  DirectMessageData,
  DiscussionThread,
  PublicUserProfile,
  TeamData,
} from '@/lib/services/social.service';
import { useCallback, useState } from 'react';

export function useSocial() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getToken = () => localStorage.getItem('token');

  const followUser = useCallback(async (followingId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/v1/social/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ followingId }),
      });

      if (!response.ok) {
        throw new Error('Failed to follow user');
      }

      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const unfollowUser = useCallback(async (followingId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/social/follow/${followingId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to unfollow user');
      }

      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const getPublicProfile = useCallback(async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/social/profile/${userId}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const result = await response.json();
      return result.data as PublicUserProfile;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const shareContent = useCallback(
    async (
      contentType: 'opportunity' | 'roadmap',
      contentId: string,
      sharedWithId?: string,
      message?: string,
      isPublic = false
    ) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/v1/social/share', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            contentType,
            contentId,
            sharedWithId,
            message,
            isPublic,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to share content');
        }

        return await response.json();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const sendMessage = useCallback(
    async (receiverId: string, content: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/v1/social/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ receiverId, content }),
        });

        if (!response.ok) {
          throw new Error('Failed to send message');
        }

        const result = await response.json();
        return result.data as DirectMessageData;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const createTeam = useCallback(
    async (
      name: string,
      description?: string,
      opportunityId?: string,
      maxMembers = 5,
      isPublic = true
    ) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/v1/social/teams', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({
            name,
            description,
            opportunityId,
            maxMembers,
            isPublic,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create team');
        }

        const result = await response.json();
        return result.data as TeamData;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const joinTeam = useCallback(async (teamId: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/v1/social/teams/${teamId}/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to join team');
      }

      return await response.json();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const createDiscussion = useCallback(
    async (opportunityId: string, title: string, content: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/v1/social/discussions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ opportunityId, title, content }),
        });

        if (!response.ok) {
          throw new Error('Failed to create discussion');
        }

        const result = await response.json();
        return result.data as DiscussionThread;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const addComment = useCallback(
    async (discussionId: string, content: string, parentId?: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch('/api/v1/social/comments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ discussionId, content, parentId }),
        });

        if (!response.ok) {
          throw new Error('Failed to add comment');
        }

        return await response.json();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    loading,
    error,
    followUser,
    unfollowUser,
    getPublicProfile,
    shareContent,
    sendMessage,
    createTeam,
    joinTeam,
    createDiscussion,
    addComment,
  };
}
