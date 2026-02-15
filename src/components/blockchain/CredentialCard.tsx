'use client';

import { Card } from '@/components/ui/Card';
import { Award, CheckCircle, Clock, Share2, XCircle } from 'lucide-react';
import React from 'react';

interface CredentialCardProps {
  credential: {
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
  };
  onShare?: (id: string) => void;
  onView?: (id: string) => void;
}

export const CredentialCard: React.FC<CredentialCardProps> = ({
  credential,
  onShare,
  onView,
}) => {
  const getStatusIcon = () => {
    switch (credential.status) {
      case 'active':
        return <CheckCircle className='w-5 h-5 text-green-500' />;
      case 'revoked':
        return <XCircle className='w-5 h-5 text-red-500' />;
      case 'expired':
        return <Clock className='w-5 h-5 text-gray-500' />;
      default:
        return null;
    }
  };

  const getTypeIcon = () => {
    return <Award className='w-6 h-6 text-blue-500' />;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Card className='p-6 hover:shadow-lg transition-shadow'>
      <div className='flex items-start justify-between mb-4'>
        <div className='flex items-center gap-3'>
          {getTypeIcon()}
          <div>
            <h3 className='font-semibold text-lg capitalize'>
              {credential.credentialType}
            </h3>
            {credential.opportunity && (
              <p className='text-sm text-gray-600'>
                {credential.opportunity.title}
              </p>
            )}
          </div>
        </div>
        <div className='flex items-center gap-2'>
          {getStatusIcon()}
          <span className='text-sm capitalize'>{credential.status}</span>
        </div>
      </div>

      {credential.opportunity && (
        <div className='mb-4'>
          <p className='text-sm text-gray-600'>
            Issued by:{' '}
            <span className='font-medium'>
              {credential.opportunity.organizerName}
            </span>
          </p>
        </div>
      )}

      <div className='space-y-2 mb-4'>
        <div className='flex justify-between text-sm'>
          <span className='text-gray-600'>Issued:</span>
          <span className='font-medium'>{formatDate(credential.issuedAt)}</span>
        </div>
        {credential.expiresAt && (
          <div className='flex justify-between text-sm'>
            <span className='text-gray-600'>Expires:</span>
            <span className='font-medium'>
              {formatDate(credential.expiresAt)}
            </span>
          </div>
        )}
        <div className='flex justify-between text-sm'>
          <span className='text-gray-600'>Blockchain ID:</span>
          <span className='font-mono text-xs truncate max-w-[200px]'>
            {credential.blockchainId}
          </span>
        </div>
      </div>

      <div className='flex gap-2'>
        <button
          onClick={() => onView?.(credential.id)}
          className='flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors'
        >
          View Details
        </button>
        {credential.status === 'active' && onShare && (
          <button
            onClick={() => onShare(credential.id)}
            className='px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors'
            aria-label='Share credential'
          >
            <Share2 className='w-5 h-5' />
          </button>
        )}
      </div>
    </Card>
  );
};
