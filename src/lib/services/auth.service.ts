import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { ApiResponse } from '../../types';

const prisma = new PrismaClient();

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    role?: string;
  };
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export class AuthService {
  private readonly jwtSecret: string;
  private readonly refreshTokenSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly refreshTokenExpiresIn: string;

  constructor() {
    this.jwtSecret = process.env.JWT_SECRET!;
    this.refreshTokenSecret = process.env.REFRESH_TOKEN_SECRET!;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.refreshTokenExpiresIn = process.env.REFRESH_TOKEN_EXPIRES_IN || '30d';

    if (!this.jwtSecret || !this.refreshTokenSecret) {
      throw new Error('JWT secrets are not configured');
    }
  }

  /**
   * Hash password using PBKDF2
   */
  private hashPassword(password: string): string {
    const salt = crypto.randomBytes(32).toString('hex');
    const hash = crypto
      .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
      .toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verify password against hash
   */
  private verifyPassword(password: string, hashedPassword: string): boolean {
    const [salt, hash] = hashedPassword.split(':');
    const verifyHash = crypto
      .pbkdf2Sync(password, salt, 10000, 64, 'sha512')
      .toString('hex');
    return hash === verifyHash;
  }

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
      });

      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists',
        };
      }

      // Hash password
      const passwordHash = this.hashPassword(data.password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          name: data.name,
          phone: data.phone,
          passwordHash,
          // Set default preferences
          preferredOpportunityTypes: ['hackathon', 'internship'],
          preferredMode: 'online',
          emailNotifications: true,
          smsNotifications: false,
          inAppNotifications: true,
          notificationFrequency: 'daily',
          notificationTypes: ['new_opportunities', 'deadlines'],
        },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      // Generate tokens
      const accessToken = this.generateAccessToken({
        id: user.id,
        email: user.email,
        role: 'user',
      });

      const refreshToken = this.generateRefreshToken({
        id: user.id,
        email: user.email,
      });

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: 'user',
          },
          accessToken,
          refreshToken,
        },
        message: 'User registered successfully',
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Failed to register user',
      };
    }
  }

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    try {
      // Find user
      const user = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
        select: {
          id: true,
          email: true,
          name: true,
          passwordHash: true,
        },
      });

      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Verify password
      const isPasswordValid = this.verifyPassword(
        data.password,
        user.passwordHash
      );

      if (!isPasswordValid) {
        return {
          success: false,
          error: 'Invalid email or password',
        };
      }

      // Generate tokens
      const accessToken = this.generateAccessToken({
        id: user.id,
        email: user.email,
        role: 'user',
      });

      const refreshToken = this.generateRefreshToken({
        id: user.id,
        email: user.email,
      });

      return {
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            role: 'user',
          },
          accessToken,
          refreshToken,
        },
        message: 'Login successful',
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Failed to login',
      };
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(
    data: RefreshTokenRequest
  ): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    try {
      // Verify refresh token
      const decoded = jwt.verify(
        data.refreshToken,
        this.refreshTokenSecret
      ) as any;

      if (!decoded || !decoded.id || !decoded.email) {
        return {
          success: false,
          error: 'Invalid refresh token',
        };
      }

      // Verify user still exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Generate new tokens
      const accessToken = this.generateAccessToken({
        id: user.id,
        email: user.email,
        role: 'user',
      });

      const refreshToken = this.generateRefreshToken({
        id: user.id,
        email: user.email,
      });

      return {
        success: true,
        data: {
          accessToken,
          refreshToken,
        },
        message: 'Token refreshed successfully',
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        error: 'Invalid refresh token',
      };
    }
  }

  /**
   * Change user password
   */
  async changePassword(
    userId: string,
    data: ChangePasswordRequest
  ): Promise<ApiResponse<null>> {
    try {
      // Get user with current password
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          passwordHash: true,
        },
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Verify current password
      const isCurrentPasswordValid = this.verifyPassword(
        data.currentPassword,
        user.passwordHash
      );

      if (!isCurrentPasswordValid) {
        return {
          success: false,
          error: 'Current password is incorrect',
        };
      }

      // Hash new password
      const newPasswordHash = this.hashPassword(data.newPassword);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Password changed successfully',
      };
    } catch (error) {
      console.error('Change password error:', error);
      return {
        success: false,
        error: 'Failed to change password',
      };
    }
  }

  /**
   * Initiate password reset
   */
  async initiatePasswordReset(
    data: PasswordResetRequest
  ): Promise<ApiResponse<null>> {
    try {
      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { email: data.email.toLowerCase() },
        select: {
          id: true,
          email: true,
          name: true,
        },
      });

      if (!user) {
        // Don't reveal if email exists or not for security
        return {
          success: true,
          message: 'If the email exists, a password reset link has been sent',
        };
      }

      // Generate reset token (valid for 1 hour)
      const resetToken = jwt.sign(
        { id: user.id, email: user.email, type: 'password_reset' },
        this.jwtSecret,
        { expiresIn: '1h' }
      );

      // TODO: Send email with reset link
      // For now, we'll just log it (in production, integrate with email service)
      console.log(`Password reset token for ${user.email}: ${resetToken}`);
      console.log(
        `Reset link: ${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${resetToken}`
      );

      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent',
      };
    } catch (error) {
      console.error('Password reset initiation error:', error);
      return {
        success: false,
        error: 'Failed to initiate password reset',
      };
    }
  }

  /**
   * Confirm password reset
   */
  async confirmPasswordReset(
    data: PasswordResetConfirmRequest
  ): Promise<ApiResponse<null>> {
    try {
      // Verify reset token
      const decoded = jwt.verify(data.token, this.jwtSecret) as any;

      if (!decoded || !decoded.id || decoded.type !== 'password_reset') {
        return {
          success: false,
          error: 'Invalid or expired reset token',
        };
      }

      // Verify user still exists
      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        select: { id: true },
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Hash new password
      const newPasswordHash = this.hashPassword(data.newPassword);

      // Update password
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Password reset successfully',
      };
    } catch (error) {
      console.error('Password reset confirmation error:', error);
      return {
        success: false,
        error: 'Invalid or expired reset token',
      };
    }
  }

  /**
   * Verify JWT token
   */
  verifyAccessToken(token: string): any {
    try {
      return jwt.verify(token, this.jwtSecret);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Generate access token
   */
  private generateAccessToken(payload: {
    id: string;
    email: string;
    role?: string;
  }): string {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: this.jwtExpiresIn });
  }

  /**
   * Generate refresh token
   */
  private generateRefreshToken(payload: { id: string; email: string }): string {
    return jwt.sign(payload, this.refreshTokenSecret, {
      expiresIn: this.refreshTokenExpiresIn,
    });
  }
}

export const authService = new AuthService();
