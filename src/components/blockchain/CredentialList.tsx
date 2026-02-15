'use client';

import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AlertCircle, Award } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { CredentialCard } from './CredentialCard';

interface Credential {
  id: string;
  credentialType: string;
  blockchainId: string;
  issuedAt: Date;
  expiresAt?: Date;
  status: string;
  opportunity?: {
    title: string;
    organizerName: string;
  };
}

export const CredentialList: React.FC = () => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/blockchain/credentials', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch credentials');
      }

      const result = await response.json();
      setCredentials(result.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (credentialId: string) => {
    try {
      const response = await fetch(
        `/api/blockchain/credentials/${credentialId}/share`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to share credential');
      }

      const result = await response.json();

      // Copy share URL to clipboard
      await navigator.clipboard.writeText(result.data.shareUrl);
      alert('Share link copied to clipboard!');
    } catch (err: any) {
      alert(`Failed to share credential: ${err.message}`);
    }
  };

  const handleView = (credentialId: string) => {
    window.location.href = `/credentials/${credentialId}`;
  };

  const filteredCredentials = credentials.filter(cred => {
    if (filter === 'all') return true;
    return cred.credentialType === filter;
  });

  if (loading) {
    return (
      <div className='flex justify-center items-center py-12'>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg'>
        <AlertCircle className='w-5 h-5' />
        <span>{error}</span>
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <div className='text-center py-12'>
        <Award className='w-16 h-16 mx-auto text-gray-400 mb-4' />
        <h3 className='text-lg font-semibold text-gray-700 mb-2'>
          No Credentials Yet
        </h3>
        <p className='text-gray-600'>
          Complete opportunities to earn verified credentials
        </p>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Filter tabs */}
      <div className='flex gap-2 border-b border-gray-200'>
        {['all', 'certificate', 'badge', 'achievement', 'participation'].map(
          type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={`px-4 py-2 capitalize ${
                filter === type
                  ? 'border-b-2 border-blue-600 text-blue-600 font-medium'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {type}
            </button>
          )
        )}
      </div>

      {/* Credentials grid */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
        {filteredCredentials.map(credential => (
          <CredentialCard
            key={credential.id}
            credential={credential}
            onShare={handleShare}
            onView={handleView}
          />
        ))}
      </div>

      {filteredCredentials.length === 0 && (
        <div className='text-center py-8 text-gray-600'>
          No {filter} credentials found
        </div>
      )}
    </div>
  );
};
