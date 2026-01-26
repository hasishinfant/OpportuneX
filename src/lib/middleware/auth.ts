import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError } from './error-handler';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role?: string;
  };
}

/**
 * JWT Authentication middleware
 */
export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('Authorization header is required');
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      throw new UnauthorizedError('Token is required');
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is not configured');
    }

    // Verify and decode the token
    const decoded = jwt.verify(token, jwtSecret) as any;

    if (!decoded || !decoded.id || !decoded.email) {
      throw new UnauthorizedError('Invalid token payload');
    }

    // Attach user information to request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role || 'user',
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token has expired'));
    } else {
      next(error);
    }
  }
};

/**
 * Optional authentication middleware (doesn't fail if no token)
 */
export const optionalAuthMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      return next();
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next();
    }

    // Verify and decode the token
    const decoded = jwt.verify(token, jwtSecret) as any;

    if (decoded && decoded.id && decoded.email) {
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role || 'user',
      };
    }

    next();
  } catch (error) {
    // For optional auth, we don't fail on token errors
    next();
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (roles: string | string[]) => {
  const allowedRoles = Array.isArray(roles) ? roles : [roles];

  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const userRole = req.user.role || 'user';

    if (!allowedRoles.includes(userRole)) {
      throw new UnauthorizedError(
        `Access denied. Required roles: ${allowedRoles.join(', ')}`
      );
    }

    next();
  };
};

/**
 * Generate JWT token (deprecated - use authService instead)
 * @deprecated Use authService.generateAccessToken instead
 */
export const generateToken = (payload: {
  id: string;
  email: string;
  role?: string;
}): string => {
  console.warn(
    'generateToken is deprecated. Use authService.generateAccessToken instead.'
  );
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }

  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  return jwt.sign(payload, jwtSecret, { expiresIn } as jwt.SignOptions);
};

/**
 * Verify JWT token (deprecated - use direct jwt.verify instead)
 * @deprecated Use jwt.verify directly instead
 */
export const verifyToken = (token: string): any => {
  console.warn('verifyToken is deprecated. Use jwt.verify directly instead.');
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }

  return jwt.verify(token, jwtSecret);
};
