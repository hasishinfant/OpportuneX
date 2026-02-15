'use client';

import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  Award,
  Building,
  Calendar,
  CheckCircle,
  Search,
  User,
  XCircle,
} from 'lucide-react';
import React, { useState } from 'react';

interface VerificationResult {
  isValid: boolean;
  credential: {
    credentialType: string;
    issuedAt: number;
    expiresAt: number;
    status: number;
    recipient: string;
    issuer: string;
    metadataURI: string;
  };
  metadata?: {
    title: string;
    description: string;
    recipientName: string;
    issuerName: string;
    completionDate: string;
    skills?: string[];
    opportunityTitle?: string;
  };
}

export const VerificationPortal: React.FC = () => {
  const [credentialId, setCredentialId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!credentialId.trim()) {
      setError('Please enter a credential ID');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const response = await fetch('/api/blockchain/credentials/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credentialId: credentialId.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to verify credential');
      }

      const data = await response.json();
      setResult(data.data);
    } catch (err: any) {
      setError(err.message || 'Failed to verify credential');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusText = (status: number) => {
    const statuses = ['Active', 'Revoked', 'Expired'];
    return statuses[status] || 'Unknown';
  };

  return (
    <div className='max-w-4xl mx-auto space-y-6'>
      {/* Search form */}
      <Card className='p-6'>
        <h2 className='text-2xl font-bold mb-4'>Verify Credential</h2>
        <p className='text-gray-600 mb-6'>
          Enter a credential ID to verify its authenticity on the blockchain
        </p>

        <form onSubmit={handleVerify} className='space-y-4'>
          <div>
            <label
              htmlFor='credentialId'
              className='block text-sm font-medium mb-2'
            >
              Credential ID
            </label>
            <div className='flex gap-2'>
              <input
                id='credentialId'
                type='text'
                value={credentialId}
                onChange={e => setCredentialId(e.target.value)}
                placeholder='0x...'
                className='flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
              <button
                type='submit'
                disabled={loading}
                className='px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2'
              >
                {loading ? (
                  <LoadingSpinner />
                ) : (
                  <>
                    <Search className='w-5 h-5' />
                    Verify
                  </>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className='flex items-center gap-2 p-4 bg-red-50 text-red-700 rounded-lg'>
              <XCircle className='w-5 h-5' />
              <span>{error}</span>
            </div>
          )}
        </form>
      </Card>

      {/* Verification result */}
      {result && (
        <Card className='p-6'>
          <div className='flex items-center gap-3 mb-6'>
            {result.isValid ? (
              <>
                <CheckCircle className='w-8 h-8 text-green-500' />
                <div>
                  <h3 className='text-xl font-bold text-green-700'>
                    Valid Credential
                  </h3>
                  <p className='text-gray-600'>
                    This credential is verified on the blockchain
                  </p>
                </div>
              </>
            ) : (
              <>
                <XCircle className='w-8 h-8 text-red-500' />
                <div>
                  <h3 className='text-xl font-bold text-red-700'>
                    Invalid Credential
                  </h3>
                  <p className='text-gray-600'>
                    This credential could not be verified
                  </p>
                </div>
              </>
            )}
          </div>

          {result.metadata && (
            <div className='space-y-4 border-t pt-6'>
              <div className='flex items-start gap-3'>
                <Award className='w-5 h-5 text-gray-400 mt-1' />
                <div>
                  <p className='text-sm text-gray-600'>Credential Title</p>
                  <p className='font-semibold'>{result.metadata.title}</p>
                </div>
              </div>

              <div className='flex items-start gap-3'>
                <User className='w-5 h-5 text-gray-400 mt-1' />
                <div>
                  <p className='text-sm text-gray-600'>Recipient</p>
                  <p className='font-semibold'>
                    {result.metadata.recipientName}
                  </p>
                </div>
              </div>

              <div className='flex items-start gap-3'>
                <Building className='w-5 h-5 text-gray-400 mt-1' />
                <div>
                  <p className='text-sm text-gray-600'>Issued By</p>
                  <p className='font-semibold'>{result.metadata.issuerName}</p>
                </div>
              </div>

              {result.metadata.opportunityTitle && (
                <div className='flex items-start gap-3'>
                  <Award className='w-5 h-5 text-gray-400 mt-1' />
                  <div>
                    <p className='text-sm text-gray-600'>Opportunity</p>
                    <p className='font-semibold'>
                      {result.metadata.opportunityTitle}
                    </p>
                  </div>
                </div>
              )}

              <div className='flex items-start gap-3'>
                <Calendar className='w-5 h-5 text-gray-400 mt-1' />
                <div>
                  <p className='text-sm text-gray-600'>Issued Date</p>
                  <p className='font-semibold'>
                    {formatDate(result.credential.issuedAt)}
                  </p>
                </div>
              </div>

              {result.credential.expiresAt > 0 && (
                <div className='flex items-start gap-3'>
                  <Calendar className='w-5 h-5 text-gray-400 mt-1' />
                  <div>
                    <p className='text-sm text-gray-600'>Expires</p>
                    <p className='font-semibold'>
                      {formatDate(result.credential.expiresAt)}
                    </p>
                  </div>
                </div>
              )}

              {result.metadata.skills && result.metadata.skills.length > 0 && (
                <div>
                  <p className='text-sm text-gray-600 mb-2'>Skills</p>
                  <div className='flex flex-wrap gap-2'>
                    {result.metadata.skills.map((skill, index) => (
                      <span
                        key={index}
                        className='px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm'
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className='border-t pt-4 mt-4'>
                <p className='text-sm text-gray-600 mb-2'>Blockchain Details</p>
                <div className='space-y-2 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-gray-600'>Status:</span>
                    <span className='font-medium'>
                      {getStatusText(result.credential.status)}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-gray-600'>Credential ID:</span>
                    <span className='font-mono text-xs truncate max-w-[300px]'>
                      {credentialId}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-gray-600'>Recipient Address:</span>
                    <span className='font-mono text-xs truncate max-w-[300px]'>
                      {result.credential.recipient}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
