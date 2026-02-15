'use client';

import { useEffect, useState } from 'react';

interface BlockchainStatus {
  available: boolean;
  network?: {
    name: string;
    chainId: number;
  };
  contractAddress?: string;
  blockNumber?: number;
  message?: string;
}

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

export const useBlockchain = () => {
  const [status, setStatus] = useState<BlockchainStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/blockchain/status');
      if (!response.ok) {
        throw new Error('Failed to fetch blockchain status');
      }
      const result = await response.json();
      setStatus(result.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const issueCredential = async (data: {
    opportunityId?: string;
    credentialType: 'certificate' | 'badge' | 'achievement' | 'participation';
    title: string;
    description: string;
    skills?: string[];
    expiresAt?: Date;
    transferable?: boolean;
  }) => {
    try {
      const response = await fetch('/api/blockchain/credentials/issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to issue credential');
      }

      return await response.json();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to issue credential');
    }
  };

  const verifyCredential = async (credentialId: string) => {
    try {
      const response = await fetch('/api/blockchain/credentials/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credentialId }),
      });

      if (!response.ok) {
        throw new Error('Failed to verify credential');
      }

      return await response.json();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to verify credential');
    }
  };

  const getCredentials = async (): Promise<Credential[]> => {
    try {
      const response = await fetch('/api/blockchain/credentials', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch credentials');
      }

      const result = await response.json();
      return result.data || [];
    } catch (err: any) {
      throw new Error(err.message || 'Failed to fetch credentials');
    }
  };

  const shareCredential = async (credentialId: string) => {
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

      return await response.json();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to share credential');
    }
  };

  const revokeCredential = async (credentialId: string) => {
    try {
      const response = await fetch(
        `/api/blockchain/credentials/${credentialId}/revoke`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to revoke credential');
      }

      return await response.json();
    } catch (err: any) {
      throw new Error(err.message || 'Failed to revoke credential');
    }
  };

  return {
    status,
    loading,
    error,
    issueCredential,
    verifyCredential,
    getCredentials,
    shareCredential,
    revokeCredential,
    refetchStatus: fetchStatus,
  };
};
