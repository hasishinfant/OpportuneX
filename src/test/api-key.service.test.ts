import { PrismaClient } from '@prisma/client';
import { apiKeyService } from '../lib/services/api-key.service';

const prisma = new PrismaClient();

describe('ApiKeyService', () => {
  const testUserId = 'test-user-id';
  let createdKeyId: string;

  afterAll(async () => {
    // Cleanup
    await prisma.apiKey.deleteMany({
      where: { userId: testUserId },
    });
    await prisma.$disconnect();
  });

  describe('createApiKey', () => {
    it('should create a new API key with valid input', async () => {
      const result = await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Test API Key',
        scopes: ['opportunities:read', 'users:read'],
        rateLimit: 1000,
        rateLimitWindow: 3600,
      });

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('key');
      expect(result.key).toMatch(/^opx_[a-f0-9]{64}$/);
      expect(result.keyPrefix).toBe(result.key.substring(0, 12));
      expect(result.name).toBe('Test API Key');
      expect(result.scopes).toEqual(['opportunities:read', 'users:read']);
      expect(result.rateLimit).toBe(1000);
      expect(result.isActive).toBe(true);

      createdKeyId = result.id;
    });

    it('should create API key with default rate limits', async () => {
      const result = await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Default Limits Key',
        scopes: ['opportunities:read'],
      });

      expect(result.rateLimit).toBe(1000);
      expect(result.rateLimitWindow).toBe(3600);
    });

    it('should create API key with expiration date', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const result = await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Expiring Key',
        scopes: ['opportunities:read'],
        expiresAt,
      });

      expect(result.expiresAt).toEqual(expiresAt);
    });
  });

  describe('verifyApiKey', () => {
    let testKey: string;

    beforeAll(async () => {
      const result = await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Verification Test Key',
        scopes: ['opportunities:read'],
      });
      testKey = result.key;
    });

    it('should verify valid API key', async () => {
      const result = await apiKeyService.verifyApiKey(testKey);

      expect(result).not.toBeNull();
      expect(result?.name).toBe('Verification Test Key');
      expect(result?.isActive).toBe(true);
    });

    it('should return null for invalid API key', async () => {
      const result = await apiKeyService.verifyApiKey('opx_invalid_key');

      expect(result).toBeNull();
    });

    it('should return null for inactive API key', async () => {
      // Deactivate the key
      await prisma.apiKey.updateMany({
        where: { keyPrefix: testKey.substring(0, 12) },
        data: { isActive: false },
      });

      const result = await apiKeyService.verifyApiKey(testKey);

      expect(result).toBeNull();
    });
  });

  describe('listApiKeys', () => {
    it('should list all API keys for a user', async () => {
      const result = await apiKeyService.listApiKeys(testUserId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('keyPrefix');
      expect(result[0]).not.toHaveProperty('key'); // Full key should not be returned
    });

    it('should return empty array for user with no keys', async () => {
      const result = await apiKeyService.listApiKeys('non-existent-user');

      expect(result).toEqual([]);
    });
  });

  describe('revokeApiKey', () => {
    it('should revoke an API key', async () => {
      const key = await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Key to Revoke',
        scopes: ['opportunities:read'],
      });

      await apiKeyService.revokeApiKey(testUserId, key.id);

      const result = await apiKeyService.verifyApiKey(key.key);
      expect(result).toBeNull();
    });
  });

  describe('rotateApiKey', () => {
    it('should create new key and revoke old one', async () => {
      const oldKey = await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Key to Rotate',
        scopes: ['opportunities:read', 'users:read'],
        rateLimit: 2000,
      });

      const newKey = await apiKeyService.rotateApiKey(testUserId, oldKey.id);

      expect(newKey.id).not.toBe(oldKey.id);
      expect(newKey.key).not.toBe(oldKey.key);
      expect(newKey.name).toBe(oldKey.name);
      expect(newKey.scopes).toEqual(oldKey.scopes);
      expect(newKey.rateLimit).toBe(oldKey.rateLimit);

      // Old key should be revoked
      const oldKeyVerification = await apiKeyService.verifyApiKey(oldKey.key);
      expect(oldKeyVerification).toBeNull();

      // New key should be valid
      const newKeyVerification = await apiKeyService.verifyApiKey(newKey.key);
      expect(newKeyVerification).not.toBeNull();
    });
  });

  describe('updateApiKey', () => {
    it('should update API key settings', async () => {
      const key = await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Key to Update',
        scopes: ['opportunities:read'],
        rateLimit: 1000,
      });

      const updated = await apiKeyService.updateApiKey(testUserId, key.id, {
        name: 'Updated Key Name',
        scopes: ['opportunities:read', 'users:read'],
        rateLimit: 2000,
      });

      expect(updated.name).toBe('Updated Key Name');
      expect(updated.scopes).toEqual(['opportunities:read', 'users:read']);
      expect(updated.rateLimit).toBe(2000);
    });
  });

  describe('checkRateLimit', () => {
    it('should allow requests within rate limit', async () => {
      const key = await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Rate Limit Test',
        scopes: ['opportunities:read'],
        rateLimit: 10,
        rateLimitWindow: 3600,
      });

      const result = await apiKeyService.checkRateLimit(key.id);

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(10);
      expect(result.resetAt).toBeInstanceOf(Date);
    });

    it('should block requests exceeding rate limit', async () => {
      const key = await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Rate Limit Exceeded Test',
        scopes: ['opportunities:read'],
        rateLimit: 2,
        rateLimitWindow: 3600,
      });

      // Log 3 requests (exceeding limit of 2)
      await apiKeyService.logUsage(key.id, '/api/test', 'GET', 200, 100);
      await apiKeyService.logUsage(key.id, '/api/test', 'GET', 200, 100);
      await apiKeyService.logUsage(key.id, '/api/test', 'GET', 200, 100);

      const result = await apiKeyService.checkRateLimit(key.id);

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });

  describe('getUsageStats', () => {
    it('should return usage statistics', async () => {
      const key = await apiKeyService.createApiKey({
        userId: testUserId,
        name: 'Usage Stats Test',
        scopes: ['opportunities:read'],
      });

      // Log some usage
      await apiKeyService.logUsage(
        key.id,
        '/api/opportunities',
        'GET',
        200,
        150
      );
      await apiKeyService.logUsage(
        key.id,
        '/api/opportunities',
        'GET',
        200,
        120
      );
      await apiKeyService.logUsage(key.id, '/api/users', 'GET', 404, 50);

      const stats = await apiKeyService.getUsageStats(testUserId, key.id);

      expect(stats.totalRequests).toBe(3);
      expect(stats.successfulRequests).toBe(2);
      expect(stats.failedRequests).toBe(1);
      expect(stats.averageResponseTime).toBeGreaterThan(0);
      expect(stats.requestsByEndpoint).toHaveProperty('/api/opportunities');
      expect(stats.requestsByEndpoint['/api/opportunities']).toBe(2);
    });
  });
});
