import { PrismaClient } from '@prisma/client';
import { blockchainService, CredentialMetadata } from './blockchain.service';
import { ipfsService } from './ipfs.service';

const prisma = new PrismaClient();

/**
 * Credential Service
 * Manages credential issuance, verification, and storage
 */

export interface IssueCredentialRequest {
  userId: string;
  opportunityId?: string;
  credentialType: 'certificate' | 'badge' | 'achievement' | 'participation';
  title: string;
  description: string;
  skills?: string[];
  expiresAt?: Date;
  transferable?: boolean;
}

export interface CredentialRecord {
  id: string;
  userId: string;
  opportunityId?: string;
  credentialType: string;
  blockchainId: string;
  metadataUri: string;
  transactionHash: string;
  issuedAt: Date;
  expiresAt?: Date;
  status: string;
}

class CredentialService {
  /**
   * Issue a new credential
   */
  async issueCredential(
    request: IssueCredentialRequest
  ): Promise<CredentialRecord> {
    try {
      // Get user details
      const user = await prisma.user.findUnique({
        where: { id: request.userId },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Get opportunity details if provided
      let opportunity = null;
      if (request.opportunityId) {
        opportunity = await prisma.opportunity.findUnique({
          where: { id: request.opportunityId },
          select: {
            id: true,
            title: true,
            organizerName: true,
          },
        });
      }

      // Prepare metadata
      const metadata: CredentialMetadata = {
        title: request.title,
        description: request.description,
        recipientName: user.name,
        recipientEmail: user.email,
        issuerName: opportunity?.organizerName || 'OpportuneX',
        credentialType: request.credentialType,
        opportunityId: request.opportunityId,
        opportunityTitle: opportunity?.title,
        completionDate: new Date().toISOString(),
        skills: request.skills,
      };

      // Upload metadata to IPFS
      const metadataUri = await ipfsService.uploadMetadata(metadata);

      // Get user's blockchain address (or create one)
      let userBlockchain = await prisma.userBlockchain.findUnique({
        where: { userId: request.userId },
      });

      if (!userBlockchain) {
        // Generate a new wallet for the user
        const wallet = await this.generateUserWallet();
        userBlockchain = await prisma.userBlockchain.create({
          data: {
            userId: request.userId,
            address: wallet.address,
            encryptedPrivateKey: wallet.encryptedPrivateKey,
          },
        });
      }

      // Issue credential on blockchain
      const expiresAtTimestamp = request.expiresAt
        ? Math.floor(request.expiresAt.getTime() / 1000)
        : 0;

      const blockchainId = await blockchainService.issueCredential(
        userBlockchain.address,
        request.credentialType,
        metadataUri,
        expiresAtTimestamp,
        request.transferable || false
      );

      // Store credential record in database
      const credential = await prisma.credential.create({
        data: {
          userId: request.userId,
          opportunityId: request.opportunityId,
          credentialType: request.credentialType,
          blockchainId,
          metadataUri,
          transactionHash: blockchainId, // In real implementation, get actual tx hash
          issuedAt: new Date(),
          expiresAt: request.expiresAt,
          status: 'active',
        },
      });

      return credential;
    } catch (error) {
      console.error('Failed to issue credential:', error);
      throw error;
    }
  }

  /**
   * Verify a credential
   */
  async verifyCredential(credentialId: string) {
    try {
      // Get credential from database
      const credential = await prisma.credential.findUnique({
        where: { blockchainId: credentialId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          opportunity: {
            select: {
              id: true,
              title: true,
              organizerName: true,
            },
          },
        },
      });

      if (!credential) {
        throw new Error('Credential not found in database');
      }

      // Verify on blockchain
      const verification =
        await blockchainService.verifyCredential(credentialId);

      // Get metadata from IPFS
      let metadata = null;
      try {
        metadata = await ipfsService.getMetadata(
          verification.credential.metadataURI
        );
      } catch (error) {
        console.warn('Failed to fetch metadata from IPFS:', error);
      }

      return {
        isValid: verification.isValid,
        credential: {
          ...credential,
          blockchain: verification.credential,
          metadata,
        },
      };
    } catch (error) {
      console.error('Failed to verify credential:', error);
      throw error;
    }
  }

  /**
   * Get user credentials
   */
  async getUserCredentials(userId: string) {
    try {
      const credentials = await prisma.credential.findMany({
        where: { userId },
        include: {
          opportunity: {
            select: {
              id: true,
              title: true,
              organizerName: true,
            },
          },
        },
        orderBy: {
          issuedAt: 'desc',
        },
      });

      return credentials;
    } catch (error) {
      console.error('Failed to get user credentials:', error);
      throw error;
    }
  }

  /**
   * Get credential by ID
   */
  async getCredentialById(id: string) {
    try {
      const credential = await prisma.credential.findUnique({
        where: { id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          opportunity: {
            select: {
              id: true,
              title: true,
              organizerName: true,
            },
          },
        },
      });

      return credential;
    } catch (error) {
      console.error('Failed to get credential:', error);
      throw error;
    }
  }

  /**
   * Revoke a credential
   */
  async revokeCredential(credentialId: string, userId: string) {
    try {
      // Get credential
      const credential = await prisma.credential.findUnique({
        where: { id: credentialId },
      });

      if (!credential) {
        throw new Error('Credential not found');
      }

      // Check if user is authorized to revoke
      if (credential.userId !== userId) {
        throw new Error('Unauthorized to revoke this credential');
      }

      // Revoke on blockchain
      await blockchainService.revokeCredential(credential.blockchainId);

      // Update database
      await prisma.credential.update({
        where: { id: credentialId },
        data: {
          status: 'revoked',
          revokedAt: new Date(),
        },
      });

      return { success: true };
    } catch (error) {
      console.error('Failed to revoke credential:', error);
      throw error;
    }
  }

  /**
   * Share credential
   */
  async shareCredential(credentialId: string, userId: string) {
    try {
      const credential = await this.getCredentialById(credentialId);

      if (!credential || credential.userId !== userId) {
        throw new Error('Credential not found or unauthorized');
      }

      // Generate shareable link
      const shareToken = await this.generateShareToken(credentialId);

      await prisma.credentialShare.create({
        data: {
          credentialId,
          shareToken,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      return {
        shareUrl: `${process.env.NEXT_PUBLIC_APP_URL}/verify/${shareToken}`,
        shareToken,
      };
    } catch (error) {
      console.error('Failed to share credential:', error);
      throw error;
    }
  }

  /**
   * Get credential by share token
   */
  async getCredentialByShareToken(shareToken: string) {
    try {
      const share = await prisma.credentialShare.findUnique({
        where: { shareToken },
        include: {
          credential: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
              opportunity: {
                select: {
                  id: true,
                  title: true,
                  organizerName: true,
                },
              },
            },
          },
        },
      });

      if (!share) {
        throw new Error('Share link not found');
      }

      if (share.expiresAt < new Date()) {
        throw new Error('Share link has expired');
      }

      // Increment view count
      await prisma.credentialShare.update({
        where: { shareToken },
        data: {
          viewCount: {
            increment: 1,
          },
        },
      });

      return share.credential;
    } catch (error) {
      console.error('Failed to get credential by share token:', error);
      throw error;
    }
  }

  /**
   * Generate user wallet
   */
  private async generateUserWallet() {
    const { ethers } = await import('ethers');
    const wallet = ethers.Wallet.createRandom();

    // In production, encrypt the private key with user's password
    const encryptedPrivateKey = await this.encryptPrivateKey(wallet.privateKey);

    return {
      address: wallet.address,
      encryptedPrivateKey,
    };
  }

  /**
   * Encrypt private key
   */
  private async encryptPrivateKey(privateKey: string): Promise<string> {
    // Simple encryption for demo - use proper encryption in production
    const crypto = await import('crypto');
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(
      process.env.ENCRYPTION_KEY || 'default-key',
      'salt',
      32
    );
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(privateKey, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return `${iv.toString('hex')}:${encrypted}`;
  }

  /**
   * Generate share token
   */
  private async generateShareToken(credentialId: string): Promise<string> {
    const crypto = await import('crypto');
    return crypto
      .createHash('sha256')
      .update(`${credentialId}-${Date.now()}-${Math.random()}`)
      .digest('hex')
      .substring(0, 32);
  }

  /**
   * Get credential statistics
   */
  async getCredentialStats(userId: string) {
    try {
      const stats = await prisma.credential.groupBy({
        by: ['credentialType', 'status'],
        where: { userId },
        _count: true,
      });

      const total = await prisma.credential.count({
        where: { userId },
      });

      return {
        total,
        byType: stats.reduce(
          (acc, stat) => {
            acc[stat.credentialType] =
              (acc[stat.credentialType] || 0) + stat._count;
            return acc;
          },
          {} as Record<string, number>
        ),
        byStatus: stats.reduce(
          (acc, stat) => {
            acc[stat.status] = (acc[stat.status] || 0) + stat._count;
            return acc;
          },
          {} as Record<string, number>
        ),
      };
    } catch (error) {
      console.error('Failed to get credential stats:', error);
      throw error;
    }
  }
}

export const credentialService = new CredentialService();
