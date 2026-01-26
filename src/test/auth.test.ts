import type { PrismaClient } from '@prisma/client';
import type { Express } from 'express';
import request from 'supertest';
import { ApiGateway, defaultApiGatewayConfig } from '../lib/api-gateway';
import { authService } from '../lib/services/auth.service';

// Mock Prisma Client
jest.mock('@prisma/client');
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
} as unknown as PrismaClient;

// Mock the auth service to use our mock prisma
jest.mock('../lib/services/auth.service', () => {
  const originalModule = jest.requireActual('../lib/services/auth.service');
  return {
    ...originalModule,
    authService: new originalModule.AuthService(),
  };
});

describe('Authentication System', () => {
  let app: Express;
  let gateway: ApiGateway;

  beforeAll(async () => {
    // Set test environment variables
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
    process.env.REFRESH_TOKEN_SECRET =
      'test-refresh-token-secret-key-for-testing-only';
    process.env.JWT_EXPIRES_IN = '1h';
    process.env.REFRESH_TOKEN_EXPIRES_IN = '7d';

    gateway = new ApiGateway({
      ...defaultApiGatewayConfig,
      port: 0, // Use random port for testing
      enableLogging: false,
    });
    app = gateway.getApp();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null);
      mockPrisma.user.create = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
        password: 'TestPassword123!',
        name: 'Test User',
        phone: '+919876543210',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject registration with existing email', async () => {
      const existingUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Existing User',
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(existingUser);

      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
        password: 'TestPassword123!',
        name: 'Test User',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User with this email already exists');
    });

    it('should reject registration with weak password', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject registration with invalid email', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'invalid-email',
        password: 'TestPassword123!',
        name: 'Test User',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should reject registration with missing required fields', async () => {
      const response = await request(app).post('/api/v1/auth/register').send({
        email: 'test@example.com',
        // Missing password and name
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login user successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'salt:hash', // This will be mocked
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      // Mock password verification
      const originalVerifyPassword = authService['verifyPassword'];
      authService['verifyPassword'] = jest.fn().mockReturnValue(true);

      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: 'TestPassword123!',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe('test@example.com');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();

      // Restore original method
      authService['verifyPassword'] = originalVerifyPassword;
    });

    it('should reject login with invalid email', async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null);

      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'nonexistent@example.com',
        password: 'TestPassword123!',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid email or password');
    });

    it('should reject login with invalid password', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'salt:hash',
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      // Mock password verification to return false
      const originalVerifyPassword = authService['verifyPassword'];
      authService['verifyPassword'] = jest.fn().mockReturnValue(false);

      const response = await request(app).post('/api/v1/auth/login').send({
        email: 'test@example.com',
        password: 'WrongPassword123!',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid email or password');

      // Restore original method
      authService['verifyPassword'] = originalVerifyPassword;
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      // Generate a valid refresh token
      const refreshToken = authService['generateRefreshToken']({
        id: 'user-123',
        email: 'test@example.com',
      });

      const response = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app).post('/api/v1/auth/refresh').send({
        refreshToken: 'invalid-token',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid refresh token');
    });
  });

  describe('POST /api/v1/auth/change-password', () => {
    it('should change password successfully', async () => {
      const mockUser = {
        id: 'user-123',
        passwordHash: 'salt:hash',
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);
      mockPrisma.user.update = jest.fn().mockResolvedValue(mockUser);

      // Mock password verification
      const originalVerifyPassword = authService['verifyPassword'];
      authService['verifyPassword'] = jest.fn().mockReturnValue(true);

      // Generate a valid access token
      const accessToken = authService['generateAccessToken']({
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });

      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Password changed successfully');

      // Restore original method
      authService['verifyPassword'] = originalVerifyPassword;
    });

    it('should reject password change without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/auth/change-password')
        .send({
          currentPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authentication required');
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should initiate password reset successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      };

      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        'If the email exists, a password reset link has been sent'
      );
    });

    it('should not reveal if email does not exist', async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        'If the email exists, a password reset link has been sent'
      );
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user info', async () => {
      // Generate a valid access token
      const accessToken = authService['generateAccessToken']({
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
      });

      const response = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('user-123');
      expect(response.body.data.email).toBe('test@example.com');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app).get('/api/v1/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Authorization header is required');
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app).post('/api/v1/auth/logout');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Logged out successfully');
    });
  });

  describe('Password Security', () => {
    it('should hash passwords securely', () => {
      const password = 'TestPassword123!';
      const hash1 = authService['hashPassword'](password);
      const hash2 = authService['hashPassword'](password);

      // Hashes should be different due to random salt
      expect(hash1).not.toBe(hash2);

      // Both hashes should verify correctly
      expect(authService['verifyPassword'](password, hash1)).toBe(true);
      expect(authService['verifyPassword'](password, hash2)).toBe(true);

      // Wrong password should not verify
      expect(authService['verifyPassword']('WrongPassword', hash1)).toBe(false);
    });

    it('should generate secure tokens', () => {
      const payload = {
        id: 'user-123',
        email: 'test@example.com',
        role: 'user',
      };

      const token1 = authService['generateAccessToken'](payload);
      const token2 = authService['generateAccessToken'](payload);

      // Tokens should be different due to timestamps
      expect(token1).not.toBe(token2);

      // Both tokens should verify correctly
      const decoded1 = authService.verifyAccessToken(token1);
      const decoded2 = authService.verifyAccessToken(token2);

      expect(decoded1.id).toBe(payload.id);
      expect(decoded1.email).toBe(payload.email);
      expect(decoded2.id).toBe(payload.id);
      expect(decoded2.email).toBe(payload.email);
    });
  });
});
