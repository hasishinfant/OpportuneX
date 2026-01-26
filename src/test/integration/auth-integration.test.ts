import { PrismaClient } from '@prisma/client';
import type { Express } from 'express';
import request from 'supertest';
import { ApiGateway, defaultApiGatewayConfig } from '../../lib/api-gateway';

describe('Authentication Integration Tests', () => {
  let app: Express;
  let gateway: ApiGateway;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Set test environment variables
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-integration-testing';
    process.env.REFRESH_TOKEN_SECRET =
      'test-refresh-token-secret-key-for-integration-testing';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';
    process.env.DATABASE_URL =
      process.env.TEST_DATABASE_URL ||
      'postgresql://test:test@localhost:5432/opportunex_test';

    // Initialize Prisma client for testing
    prisma = new PrismaClient();

    gateway = new ApiGateway({
      ...defaultApiGatewayConfig,
      port: 0, // Use random port for testing
      enableLogging: false,
    });
    app = gateway.getApp();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    try {
      await prisma.user.deleteMany({
        where: {
          email: {
            contains: 'test',
          },
        },
      });
    } catch (error) {
      // Ignore errors if tables don't exist yet
      console.log('Cleanup warning:', error);
    }
  });

  afterAll(async () => {
    // Clean up after all tests
    try {
      await prisma.user.deleteMany({
        where: {
          email: {
            contains: 'test',
          },
        },
      });
    } catch (error) {
      // Ignore cleanup errors
    }
    await prisma.$disconnect();
  });

  describe('Complete Authentication Flow', () => {
    it('should handle complete user registration and login flow', async () => {
      const userData = {
        email: 'integration.test@example.com',
        password: 'TestPassword123!',
        name: 'Integration Test User',
        phone: '+919876543210',
      };

      // Step 1: Register user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.success).toBe(true);
      expect(registerResponse.body.data.user.email).toBe(userData.email);
      expect(registerResponse.body.data.accessToken).toBeDefined();
      expect(registerResponse.body.data.refreshToken).toBeDefined();

      const { accessToken: registerAccessToken, refreshToken } =
        registerResponse.body.data;

      // Step 2: Use access token to access protected route
      const meResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${registerAccessToken}`);

      expect(meResponse.status).toBe(200);
      expect(meResponse.body.success).toBe(true);
      expect(meResponse.body.data.email).toBe(userData.email);

      // Step 3: Login with same credentials
      const loginResponse = await request(app).post('/api/v1/auth/login').send({
        email: userData.email,
        password: userData.password,
      });

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.user.email).toBe(userData.email);
      expect(loginResponse.body.data.accessToken).toBeDefined();
      expect(loginResponse.body.data.refreshToken).toBeDefined();

      // Step 4: Refresh token
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.success).toBe(true);
      expect(refreshResponse.body.data.accessToken).toBeDefined();
      expect(refreshResponse.body.data.refreshToken).toBeDefined();

      // Step 5: Change password
      const changePasswordResponse = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${registerAccessToken}`)
        .send({
          currentPassword: userData.password,
          newPassword: 'NewTestPassword123!',
        });

      expect(changePasswordResponse.status).toBe(200);
      expect(changePasswordResponse.body.success).toBe(true);

      // Step 6: Login with new password
      const newLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: 'NewTestPassword123!',
        });

      expect(newLoginResponse.status).toBe(200);
      expect(newLoginResponse.body.success).toBe(true);

      // Step 7: Old password should not work
      const oldPasswordResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: userData.email,
          password: userData.password,
        });

      expect(oldPasswordResponse.status).toBe(401);
      expect(oldPasswordResponse.body.success).toBe(false);
    });

    it('should handle password reset flow', async () => {
      const userData = {
        email: 'reset.test@example.com',
        password: 'TestPassword123!',
        name: 'Reset Test User',
      };

      // Step 1: Register user
      await request(app).post('/api/v1/auth/register').send(userData);

      // Step 2: Request password reset
      const forgotResponse = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: userData.email });

      expect(forgotResponse.status).toBe(200);
      expect(forgotResponse.body.success).toBe(true);

      // In a real scenario, we would get the reset token from email
      // For testing, we'll generate a valid reset token
      const jwt = require('jsonwebtoken');
      const resetToken = jwt.sign(
        { id: 'test-id', email: userData.email, type: 'password_reset' },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      // Step 3: Reset password with token
      const resetResponse = await request(app)
        .post('/api/v1/auth/reset-password')
        .send({
          token: resetToken,
          newPassword: 'ResetPassword123!',
        });

      expect(resetResponse.status).toBe(200);
      expect(resetResponse.body.success).toBe(true);
    });
  });

  describe('Authentication Middleware Integration', () => {
    let accessToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create a test user and get access token
      const userData = {
        email: 'middleware.test@example.com',
        password: 'TestPassword123!',
        name: 'Middleware Test User',
      };

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      accessToken = registerResponse.body.data.accessToken;
      userId = registerResponse.body.data.user.id;
    });

    it('should protect user routes with authentication', async () => {
      // Test protected user profile route
      const profileResponse = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(profileResponse.status).toBe(200);
      expect(profileResponse.body.success).toBe(true);
    });

    it('should reject requests without authentication', async () => {
      const profileResponse = await request(app).get('/api/v1/users/profile');

      expect(profileResponse.status).toBe(401);
      expect(profileResponse.body.success).toBe(false);
    });

    it('should reject requests with invalid tokens', async () => {
      const profileResponse = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(profileResponse.status).toBe(401);
      expect(profileResponse.body.success).toBe(false);
    });

    it('should handle expired tokens', async () => {
      // Generate an expired token
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { id: userId, email: 'test@example.com', role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' } // Expired 1 hour ago
      );

      const profileResponse = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(profileResponse.status).toBe(401);
      expect(profileResponse.body.success).toBe(false);
      expect(profileResponse.body.error).toBe('Token has expired');
    });
  });

  describe('Security Integration Tests', () => {
    it('should prevent SQL injection in authentication', async () => {
      const maliciousData = {
        email: "test@example.com'; DROP TABLE users; --",
        password: 'TestPassword123!',
        name: 'Malicious User',
      };

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(maliciousData);

      // Should either fail validation or handle safely
      expect([400, 201]).toContain(response.status);

      // If it succeeds, the malicious SQL should not have executed
      if (response.status === 201) {
        expect(response.body.data.user.email).toBe(maliciousData.email);
      }
    });

    it('should handle concurrent registration attempts', async () => {
      const userData = {
        email: 'concurrent.test@example.com',
        password: 'TestPassword123!',
        name: 'Concurrent Test User',
      };

      // Make multiple concurrent registration requests
      const promises = Array(5)
        .fill(null)
        .map(() => request(app).post('/api/v1/auth/register').send(userData));

      const responses = await Promise.all(promises);

      // Only one should succeed, others should fail with "user exists" error
      const successCount = responses.filter(r => r.status === 201).length;
      const failureCount = responses.filter(r => r.status === 400).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(4);
    });

    it('should rate limit authentication attempts', async () => {
      const userData = {
        email: 'ratelimit.test@example.com',
        password: 'TestPassword123!',
      };

      // Make many rapid login attempts
      const promises = Array(150)
        .fill(null)
        .map(() => request(app).post('/api/v1/auth/login').send(userData));

      const responses = await Promise.all(promises);

      // Some requests should be rate limited (429 status)
      const rateLimitedCount = responses.filter(r => r.status === 429).length;
      expect(rateLimitedCount).toBeGreaterThan(0);
    });
  });

  describe('Token Lifecycle Integration', () => {
    it('should handle token refresh lifecycle', async () => {
      const userData = {
        email: 'lifecycle.test@example.com',
        password: 'TestPassword123!',
        name: 'Lifecycle Test User',
      };

      // Register user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(userData);

      let { accessToken, refreshToken } = registerResponse.body.data;

      // Use access token multiple times
      for (let i = 0; i < 3; i++) {
        const meResponse = await request(app)
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(meResponse.status).toBe(200);
      }

      // Refresh token
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(refreshResponse.status).toBe(200);

      // Update tokens
      accessToken = refreshResponse.body.data.accessToken;
      refreshToken = refreshResponse.body.data.refreshToken;

      // Use new access token
      const meResponse = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(meResponse.status).toBe(200);
    });
  });
});
