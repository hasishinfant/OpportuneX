import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { blockchainService } from '../services/blockchain.service';
import { credentialService } from '../services/credential.service';

const router = Router();

// Validation schemas
const issueCredentialSchema = z.object({
  opportunityId: z.string().uuid().optional(),
  credentialType: z.enum([
    'certificate',
    'badge',
    'achievement',
    'participation',
  ]),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  skills: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().optional(),
  transferable: z.boolean().optional(),
});

const verifyCredentialSchema = z.object({
  credentialId: z.string().min(1),
});

const shareCredentialSchema = z.object({
  credentialId: z.string().uuid(),
});

/**
 * @route POST /api/blockchain/credentials/issue
 * @desc Issue a new credential
 * @access Private
 */
router.post(
  '/credentials/issue',
  authMiddleware,
  validateRequest(issueCredentialSchema),
  async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const credential = await credentialService.issueCredential({
        userId,
        ...req.body,
        expiresAt: req.body.expiresAt
          ? new Date(req.body.expiresAt)
          : undefined,
      });

      res.json({
        success: true,
        data: credential,
      });
    } catch (error: any) {
      console.error('Failed to issue credential:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to issue credential',
      });
    }
  }
);

/**
 * @route GET /api/blockchain/credentials
 * @desc Get user's credentials
 * @access Private
 */
router.get('/credentials', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const credentials = await credentialService.getUserCredentials(userId);

    res.json({
      success: true,
      data: credentials,
    });
  } catch (error: any) {
    console.error('Failed to get credentials:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get credentials',
    });
  }
});

/**
 * @route GET /api/blockchain/credentials/:id
 * @desc Get credential by ID
 * @access Private
 */
router.get('/credentials/:id', authMiddleware, async (req, res) => {
  try {
    const credential = await credentialService.getCredentialById(req.params.id);

    if (!credential) {
      return res.status(404).json({
        success: false,
        error: 'Credential not found',
      });
    }

    res.json({
      success: true,
      data: credential,
    });
  } catch (error: any) {
    console.error('Failed to get credential:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get credential',
    });
  }
});

/**
 * @route POST /api/blockchain/credentials/verify
 * @desc Verify a credential
 * @access Public
 */
router.post(
  '/credentials/verify',
  validateRequest(verifyCredentialSchema),
  async (req, res) => {
    try {
      const { credentialId } = req.body;

      const verification =
        await credentialService.verifyCredential(credentialId);

      res.json({
        success: true,
        data: verification,
      });
    } catch (error: any) {
      console.error('Failed to verify credential:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to verify credential',
      });
    }
  }
);

/**
 * @route POST /api/blockchain/credentials/:id/share
 * @desc Share a credential
 * @access Private
 */
router.post('/credentials/:id/share', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const shareInfo = await credentialService.shareCredential(
      req.params.id,
      userId
    );

    res.json({
      success: true,
      data: shareInfo,
    });
  } catch (error: any) {
    console.error('Failed to share credential:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to share credential',
    });
  }
});

/**
 * @route POST /api/blockchain/credentials/:id/revoke
 * @desc Revoke a credential
 * @access Private
 */
router.post('/credentials/:id/revoke', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await credentialService.revokeCredential(req.params.id, userId);

    res.json({
      success: true,
      message: 'Credential revoked successfully',
    });
  } catch (error: any) {
    console.error('Failed to revoke credential:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to revoke credential',
    });
  }
});

/**
 * @route GET /api/blockchain/credentials/stats
 * @desc Get credential statistics
 * @access Private
 */
router.get('/credentials/stats', authMiddleware, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const stats = await credentialService.getCredentialStats(userId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    console.error('Failed to get credential stats:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get credential stats',
    });
  }
});

/**
 * @route GET /api/blockchain/share/:token
 * @desc Get credential by share token
 * @access Public
 */
router.get('/share/:token', async (req, res) => {
  try {
    const credential = await credentialService.getCredentialByShareToken(
      req.params.token
    );

    res.json({
      success: true,
      data: credential,
    });
  } catch (error: any) {
    console.error('Failed to get shared credential:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get shared credential',
    });
  }
});

/**
 * @route GET /api/blockchain/status
 * @desc Get blockchain service status
 * @access Public
 */
router.get('/status', async (req, res) => {
  try {
    const isAvailable = blockchainService.isAvailable();

    if (!isAvailable) {
      return res.json({
        success: true,
        data: {
          available: false,
          message: 'Blockchain service not configured',
        },
      });
    }

    const networkInfo = await blockchainService.getNetworkInfo();
    const contractAddress = blockchainService.getContractAddress();
    const blockNumber = await blockchainService.getCurrentBlockNumber();

    res.json({
      success: true,
      data: {
        available: true,
        network: networkInfo,
        contractAddress,
        blockNumber,
      },
    });
  } catch (error: any) {
    console.error('Failed to get blockchain status:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get blockchain status',
    });
  }
});

export default router;
