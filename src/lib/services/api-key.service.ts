import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface CreateApiKeyInput {
  userId: string;
  name: string;
  scopes: string[];
  rateLimit?: number;
  rateLimitWindow?: number;
  expiresAt?: Date;
}

export interface ApiKeyResponse {
  id: string;
  name: string;
  key: string; // Only returned on creation
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  rateLimitWindow: number;
  isActive: boolean;
  expiresAt: Date | null;
  createdAt: Date;
}

export interface ApiKeyListItem {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  isActive: boolean;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  createdAt: Date;
}

export class ApiKeyService {
  /**
   * Generate a secure API key
   */
  private generateApiKey(): { key: string; hash: string; prefix: string } {
    const key = `opx_${crypto.randomBytes(32).toString('hex')}`;
    const hash = crypto.createHash('sha256').update(key).digest('hex');
    const prefix = key.substring(0, 12);
    return { key, hash, prefix };
  }

  /**
   * Hash an API key for storage
   */
  private hashApiKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Create a new API key
   */
  async createApiKey(input: CreateApiKeyInput): Promise<ApiKeyResponse> {
    const { key, hash, prefix } = this.generateApiKey();

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: input.userId,
        name: input.name,
        keyHash: hash,
        keyPrefix: prefix,
        scopes: input.scopes,
        rateLimit: input.rateLimit || 1000,
        rateLimitWindow: input.rateLimitWindow || 3600,
        expiresAt: input.expiresAt,
      },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      key, // Only returned on creation
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      rateLimit: apiKey.rateLimit,
      rateLimitWindow: apiKey.rateLimitWindow,
      isActive: apiKey.isActive,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  /**
   * Verify and retrieve API key details
   */
  async verifyApiKey(key: string): Promise<ApiKeyListItem | null> {
    const hash = this.hashApiKey(key);

    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash: hash },
    });

    if (!apiKey || !apiKey.isActive) {
      return null;
    }

    // Check expiration
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      return null;
    }

    // Update last used timestamp
    await prisma.apiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      rateLimit: apiKey.rateLimit,
      isActive: apiKey.isActive,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  /**
   * List all API keys for a user
   */
  async listApiKeys(userId: string): Promise<ApiKeyListItem[]> {
    const apiKeys = await prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return apiKeys.map(key => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
      rateLimit: key.rateLimit,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      expiresAt: key.expiresAt,
      createdAt: key.createdAt,
    }));
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(userId: string, keyId: string): Promise<void> {
    await prisma.apiKey.updateMany({
      where: {
        id: keyId,
        userId,
      },
      data: {
        isActive: false,
      },
    });
  }

  /**
   * Rotate an API key (create new, revoke old)
   */
  async rotateApiKey(userId: string, keyId: string): Promise<ApiKeyResponse> {
    const oldKey = await prisma.apiKey.findFirst({
      where: { id: keyId, userId },
    });

    if (!oldKey) {
      throw new Error('API key not found');
    }

    // Create new key with same settings
    const newKey = await this.createApiKey({
      userId,
      name: oldKey.name,
      scopes: oldKey.scopes,
      rateLimit: oldKey.rateLimit,
      rateLimitWindow: oldKey.rateLimitWindow,
      expiresAt: oldKey.expiresAt || undefined,
    });

    // Revoke old key
    await this.revokeApiKey(userId, keyId);

    return newKey;
  }

  /**
   * Update API key settings
   */
  async updateApiKey(
    userId: string,
    keyId: string,
    updates: {
      name?: string;
      scopes?: string[];
      rateLimit?: number;
      rateLimitWindow?: number;
      isActive?: boolean;
    }
  ): Promise<ApiKeyListItem> {
    const apiKey = await prisma.apiKey.updateMany({
      where: {
        id: keyId,
        userId,
      },
      data: updates,
    });

    const updated = await prisma.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!updated) {
      throw new Error('API key not found');
    }

    return {
      id: updated.id,
      name: updated.name,
      keyPrefix: updated.keyPrefix,
      scopes: updated.scopes,
      rateLimit: updated.rateLimit,
      isActive: updated.isActive,
      lastUsedAt: updated.lastUsedAt,
      expiresAt: updated.expiresAt,
      createdAt: updated.createdAt,
    };
  }

  /**
   * Log API usage
   */
  async logUsage(
    apiKeyId: string,
    endpoint: string,
    method: string,
    statusCode: number,
    responseTimeMs: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await prisma.apiUsageLog.create({
      data: {
        apiKeyId,
        endpoint,
        method,
        statusCode,
        responseTimeMs,
        ipAddress,
        userAgent,
      },
    });
  }

  /**
   * Get usage statistics for an API key
   */
  async getUsageStats(
    userId: string,
    keyId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    requestsByEndpoint: Record<string, number>;
    requestsByDay: Record<string, number>;
  }> {
    const where: any = {
      apiKeyId: keyId,
    };

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const logs = await prisma.apiUsageLog.findMany({
      where,
      select: {
        endpoint: true,
        statusCode: true,
        responseTimeMs: true,
        createdAt: true,
      },
    });

    const totalRequests = logs.length;
    const successfulRequests = logs.filter(
      log => log.statusCode >= 200 && log.statusCode < 300
    ).length;
    const failedRequests = totalRequests - successfulRequests;
    const averageResponseTime =
      logs.reduce((sum, log) => sum + log.responseTimeMs, 0) / totalRequests ||
      0;

    const requestsByEndpoint: Record<string, number> = {};
    const requestsByDay: Record<string, number> = {};

    logs.forEach(log => {
      // Count by endpoint
      requestsByEndpoint[log.endpoint] =
        (requestsByEndpoint[log.endpoint] || 0) + 1;

      // Count by day
      const day = log.createdAt.toISOString().split('T')[0];
      requestsByDay[day] = (requestsByDay[day] || 0) + 1;
    });

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      averageResponseTime: Math.round(averageResponseTime),
      requestsByEndpoint,
      requestsByDay,
    };
  }

  /**
   * Check rate limit for an API key
   */
  async checkRateLimit(apiKeyId: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  }> {
    const apiKey = await prisma.apiKey.findUnique({
      where: { id: apiKeyId },
    });

    if (!apiKey) {
      return { allowed: false, remaining: 0, resetAt: new Date() };
    }

    const windowStart = new Date(Date.now() - apiKey.rateLimitWindow * 1000);

    const requestCount = await prisma.apiUsageLog.count({
      where: {
        apiKeyId,
        createdAt: {
          gte: windowStart,
        },
      },
    });

    const remaining = Math.max(0, apiKey.rateLimit - requestCount);
    const resetAt = new Date(Date.now() + apiKey.rateLimitWindow * 1000);

    return {
      allowed: requestCount < apiKey.rateLimit,
      remaining,
      resetAt,
    };
  }
}

export const apiKeyService = new ApiKeyService();
