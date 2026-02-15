import type { Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../middleware/auth';
import { apiKeyService } from '../services/api-key.service';
import { oauthService } from '../services/oauth.service';
import { webhookService } from '../services/webhook.service';

const router = Router();

// Validation schemas
const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()),
  rateLimit: z.number().int().positive().optional(),
  rateLimitWindow: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
});

const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  scopes: z.array(z.string()).optional(),
  rateLimit: z.number().int().positive().optional(),
  rateLimitWindow: z.number().int().positive().optional(),
  isActive: z.boolean().optional(),
});

const createWebhookSchema = z.object({
  apiKeyId: z.string().uuid(),
  url: z.string().url(),
  events: z.array(z.string()),
  retryCount: z.number().int().min(0).max(10).optional(),
  timeoutMs: z.number().int().min(1000).max(30000).optional(),
});

const updateWebhookSchema = z.object({
  url: z.string().url().optional(),
  events: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  retryCount: z.number().int().min(0).max(10).optional(),
  timeoutMs: z.number().int().min(1000).max(30000).optional(),
});

const createOAuthClientSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  redirectUris: z.array(z.string().url()),
  scopes: z.array(z.string()),
});

const updateOAuthClientSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  redirectUris: z.array(z.string().url()).optional(),
  scopes: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// API Key Management Routes
// ============================================================================

/**
 * GET /api/v1/developer/api-keys
 * List all API keys for the authenticated user
 */
router.get('/api-keys', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const apiKeys = await apiKeyService.listApiKeys(userId);

    res.json({
      success: true,
      data: apiKeys,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to list API keys',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/developer/api-keys
 * Create a new API key
 */
router.post('/api-keys', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const input = createApiKeySchema.parse(req.body);

    const apiKey = await apiKeyService.createApiKey({
      userId,
      ...input,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : undefined,
    });

    res.status(201).json({
      success: true,
      data: apiKey,
      message:
        'API key created successfully. Save the key securely - it will not be shown again.',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create API key',
        message: error.message,
      });
    }
  }
});

/**
 * PATCH /api/v1/developer/api-keys/:keyId
 * Update an API key
 */
router.patch(
  '/api-keys/:keyId',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { keyId } = req.params;
      const updates = updateApiKeySchema.parse(req.body);

      const apiKey = await apiKeyService.updateApiKey(userId, keyId, updates);

      res.json({
        success: true,
        data: apiKey,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update API key',
          message: error.message,
        });
      }
    }
  }
);

/**
 * POST /api/v1/developer/api-keys/:keyId/rotate
 * Rotate an API key
 */
router.post(
  '/api-keys/:keyId/rotate',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { keyId } = req.params;

      const newApiKey = await apiKeyService.rotateApiKey(userId, keyId);

      res.json({
        success: true,
        data: newApiKey,
        message:
          'API key rotated successfully. The old key has been revoked. Save the new key securely.',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to rotate API key',
        message: error.message,
      });
    }
  }
);

/**
 * DELETE /api/v1/developer/api-keys/:keyId
 * Revoke an API key
 */
router.delete(
  '/api-keys/:keyId',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { keyId } = req.params;

      await apiKeyService.revokeApiKey(userId, keyId);

      res.json({
        success: true,
        message: 'API key revoked successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to revoke API key',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/developer/api-keys/:keyId/usage
 * Get usage statistics for an API key
 */
router.get(
  '/api-keys/:keyId/usage',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { keyId } = req.params;
      const { startDate, endDate } = req.query;

      const stats = await apiKeyService.getUsageStats(
        userId,
        keyId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to get usage statistics',
        message: error.message,
      });
    }
  }
);

// ============================================================================
// Webhook Management Routes
// ============================================================================

/**
 * GET /api/v1/developer/webhooks
 * List all webhooks for the authenticated user
 */
router.get('/webhooks', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const webhooks = await webhookService.listWebhooks(userId);

    res.json({
      success: true,
      data: webhooks,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: 'Failed to list webhooks',
      message: error.message,
    });
  }
});

/**
 * POST /api/v1/developer/webhooks
 * Create a new webhook
 */
router.post('/webhooks', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const input = createWebhookSchema.parse(req.body);

    const webhook = await webhookService.createWebhook({
      userId,
      ...input,
    });

    res.status(201).json({
      success: true,
      data: webhook,
      message:
        'Webhook created successfully. Save the secret securely - it will not be shown again.',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: 'Validation error',
        details: error.errors,
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to create webhook',
        message: error.message,
      });
    }
  }
});

/**
 * PATCH /api/v1/developer/webhooks/:webhookId
 * Update a webhook
 */
router.patch(
  '/webhooks/:webhookId',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { webhookId } = req.params;
      const updates = updateWebhookSchema.parse(req.body);

      const webhook = await webhookService.updateWebhook(
        userId,
        webhookId,
        updates
      );

      res.json({
        success: true,
        data: webhook,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update webhook',
          message: error.message,
        });
      }
    }
  }
);

/**
 * DELETE /api/v1/developer/webhooks/:webhookId
 * Delete a webhook
 */
router.delete(
  '/webhooks/:webhookId',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { webhookId } = req.params;

      await webhookService.deleteWebhook(userId, webhookId);

      res.json({
        success: true,
        message: 'Webhook deleted successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete webhook',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/developer/webhooks/:webhookId/test
 * Test a webhook
 */
router.post(
  '/webhooks/:webhookId/test',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { webhookId } = req.params;

      const result = await webhookService.testWebhook(userId, webhookId);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to test webhook',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/developer/webhooks/:webhookId/deliveries
 * Get webhook delivery logs
 */
router.get(
  '/webhooks/:webhookId/deliveries',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { webhookId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;

      const deliveries = await webhookService.getDeliveryLogs(
        userId,
        webhookId,
        limit
      );

      res.json({
        success: true,
        data: deliveries,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to get delivery logs',
        message: error.message,
      });
    }
  }
);

// ============================================================================
// OAuth Client Management Routes
// ============================================================================

/**
 * GET /api/v1/developer/oauth/clients
 * List all OAuth clients for the authenticated user
 */
router.get(
  '/oauth/clients',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const clients = await oauthService.listClients(userId);

      res.json({
        success: true,
        data: clients,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to list OAuth clients',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/developer/oauth/clients
 * Create a new OAuth client
 */
router.post(
  '/oauth/clients',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const input = createOAuthClientSchema.parse(req.body);

      const client = await oauthService.createClient({
        userId,
        ...input,
      });

      res.status(201).json({
        success: true,
        data: client,
        message:
          'OAuth client created successfully. Save the client secret securely - it will not be shown again.',
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to create OAuth client',
          message: error.message,
        });
      }
    }
  }
);

/**
 * PATCH /api/v1/developer/oauth/clients/:clientId
 * Update an OAuth client
 */
router.patch(
  '/oauth/clients/:clientId',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { clientId } = req.params;
      const updates = updateOAuthClientSchema.parse(req.body);

      const client = await oauthService.updateClient(userId, clientId, updates);

      res.json({
        success: true,
        data: client,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to update OAuth client',
          message: error.message,
        });
      }
    }
  }
);

/**
 * DELETE /api/v1/developer/oauth/clients/:clientId
 * Delete an OAuth client
 */
router.delete(
  '/oauth/clients/:clientId',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { clientId } = req.params;

      await oauthService.deleteClient(userId, clientId);

      res.json({
        success: true,
        message: 'OAuth client deleted successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to delete OAuth client',
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/developer/oauth/clients/:clientId/revoke-tokens
 * Revoke all tokens for an OAuth client
 */
router.post(
  '/oauth/clients/:clientId/revoke-tokens',
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!.id;
      const { clientId } = req.params;

      await oauthService.revokeAllClientTokens(userId, clientId);

      res.json({
        success: true,
        message: 'All tokens revoked successfully',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to revoke tokens',
        message: error.message,
      });
    }
  }
);

export default router;
