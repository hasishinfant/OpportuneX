'use client';

import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { TeamData } from '@/lib/services/social.service';
import { useEffect, useState } from 'react';

interface TeamListProps {
  opportunityId?: string;
}

export function TeamList({ opportunityId }: TeamListProps) {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    maxMembers: 5,
  });

  useEffect(() => {
    fetchTeams();
  }, [opportunityId]);

  const fetchTeams = async () => {
    try {
      const url = opportunityId
        ? `/api/v1/social/teams?opportunityId=${opportunityId}`
        : '/api/v1/social/teams';

      const response = await fetch(url);

      if (response.ok) {
        const result = await response.json();
        setTeams(result.data.data);
      }
    } catch (error) {
      console.error('Fetch teams error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/v1/social/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          ...formData,
          opportunityId,
        }),
      });

      if (response.ok) {
        setFormData({ name: '', description: '', maxMembers: 5 });
        setShowCreateForm(false);
        fetchTeams();
      }
    } catch (error) {
      console.error('Create team error:', error);
    }
  };

  const handleJoinTeam = async (teamId: string) => {
    try {
      const response = await fetch(`/api/v1/social/teams/${teamId}/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        fetchTeams();
      }
    } catch (error) {
      console.error('Join team error:', error);
    }
  };

  if (loading) {
    return (
      <div className='flex justify-center py-8'>
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <h2 className='text-xl font-bold text-gray-900'>Teams</h2>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
        >
          Create Team
        </button>
      </div>

      {showCreateForm && (
        <Card className='p-4'>
          <form onSubmit={handleCreateTeam} className='space-y-3'>
            <input
              type='text'
              placeholder='Team name'
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'
              required
            />
            <textarea
              placeholder='Team description (optional)'
              value={formData.description}
              onChange={e =>
                setFormData({ ...formData, description: e.target.value })
              }
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'
              rows={3}
            />
            <div>
              <label className='block text-sm font-medium text-gray-700'>
                Max Members
              </label>
              <input
                type='number'
                min='2'
                max='20'
                value={formData.maxMembers}
                onChange={e =>
                  setFormData({
                    ...formData,
                    maxMembers: parseInt(e.target.value),
                  })
                }
                className='mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none'
              />
            </div>
            <div className='flex gap-2'>
              <button
                type='submit'
                className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
              >
                Create Team
              </button>
              <button
                type='button'
                onClick={() => setShowCreateForm(false)}
                className='rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300'
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {teams.length === 0 ? (
        <Card className='p-6 text-center'>
          <p className='text-gray-600'>
            No teams yet. Create one to collaborate with others!
          </p>
        </Card>
      ) : (
        <div className='space-y-3'>
          {teams.map(team => (
            <Card key={team.id} className='p-4'>
              <div className='flex items-start justify-between'>
                <div className='flex-1'>
                  <h3 className='font-semibold text-gray-900'>{team.name}</h3>
                  {team.description && (
                    <p className='mt-1 text-sm text-gray-600'>
                      {team.description}
                    </p>
                  )}
                  <div className='mt-2 flex items-center gap-4 text-xs text-gray-500'>
                    <span>by {team.creator.name}</span>
                    <span>
                      {team.memberCount}/{team.maxMembers} members
                    </span>
                  </div>
                </div>
                {team.memberCount < team.maxMembers && (
                  <button
                    onClick={() => handleJoinTeam(team.id)}
                    className='rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700'
                  >
                    Join
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
