import type { NextFunction, Request, Response } from 'express';
import { apiKeyService } from '../services/api-key.service';
import { oauthService } from '../services/oauth.service';
import { UnauthorizedError } from './error-handler';

export interface ApiAuthenticatedRequest extends Request {
  apiKey?: {
    id: string;
    userId: string;
    scopes: string[];
    rateLimit: number;
  };
  oauth?: {
    userId: string;
    clientId: string;
    scopes: string[];
  };
}

/**
 * API Key authentication middleware
 * Supports both API keys and OAuth access tokens
 */
export const apiKeyAuthMiddleware = async (
  req: ApiAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedError('Authorization header is required');
    }

    // Check if it's a Bearer token (OAuth) or API key
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);

      // Try OAuth token first
      const oauthInfo = await oauthService.verifyAccessToken(token);
      if (oauthInfo) {
        req.oauth = oauthInfo;
        return next();
      }

      // If not OAuth, might be an API key with Bearer prefix
      const apiKey = await apiKeyService.verifyApiKey(token);
      if (apiKey) {
        // Check rate limit
        const rateLimit = await apiKeyService.checkRateLimit(apiKey.id);
        if (!rateLimit.allowed) {
          res.setHeader('X-RateLimit-Limit', apiKey.rateLimit.toString());
          res.setHeader('X-RateLimit-Remaining', '0');
          res.setHeader('X-RateLimit-Reset', rateLimit.resetAt.toISOString());

          res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
            retryAfter: rateLimit.resetAt.toISOString(),
          });
          return;
        }

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', apiKey.rateLimit.toString());
        res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
        res.setHeader('X-RateLimit-Reset', rateLimit.resetAt.toISOString());

        req.apiKey = {
          id: apiKey.id,
          userId: '', // API keys don't have direct user association in this context
          scopes: apiKey.scopes,
          rateLimit: apiKey.rateLimit,
        };

        return next();
      }

      throw new UnauthorizedError('Invalid token');
    } else {
      // Direct API key (without Bearer prefix)
      const apiKey = await apiKeyService.verifyApiKey(authHeader);

      if (!apiKey) {
        throw new UnauthorizedError('Invalid API key');
      }

      // Check rate limit
      const rateLimit = await apiKeyService.checkRateLimit(apiKey.id);
      if (!rateLimit.allowed) {
        res.setHeader('X-RateLimit-Limit', apiKey.rateLimit.toString());
        res.setHeader('X-RateLimit-Remaining', '0');
        res.setHeader('X-RateLimit-Reset', rateLimit.resetAt.toISOString());

        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          retryAfter: rateLimit.resetAt.toISOString(),
        });
        return;
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', apiKey.rateLimit.toString());
      res.setHeader('X-RateLimit-Remaining', rateLimit.remaining.toString());
      res.setHeader('X-RateLimit-Reset', rateLimit.resetAt.toISOString());

      req.apiKey = {
        id: apiKey.id,
        userId: '', // Will be populated from database if needed
        scopes: apiKey.scopes,
        rateLimit: apiKey.rateLimit,
      };

      next();
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Scope validation middleware
 * Checks if the authenticated API key or OAuth token has required scopes
 */
export const requireScopes = (requiredScopes: string | string[]) => {
  const scopes = Array.isArray(requiredScopes)
    ? requiredScopes
    : [requiredScopes];

  return (
    req: ApiAuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    const userScopes = req.apiKey?.scopes || req.oauth?.scopes || [];

    const hasAllScopes = scopes.every(scope => userScopes.includes(scope));

    if (!hasAllScopes) {
      throw new UnauthorizedError(
        `Insufficient permissions. Required scopes: ${scopes.join(', ')}`
      );
    }

    next();
  };
};

/**
 * Middleware to log API usage
 */
export const logApiUsage = async (
  req: ApiAuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const startTime = Date.now();

  // Store original send function
  const originalSend = res.send;

  // Override send to capture response
  res.send = function (data: any): Response {
    const responseTime = Date.now() - startTime;

    // Log usage asynchronously (don't wait)
    if (req.apiKey) {
      apiKeyService
        .logUsage(
          req.apiKey.id,
          req.path,
          req.method,
          res.statusCode,
          responseTime,
          req.ip,
          req.get('user-agent')
        )
        .catch(error => {
          console.error('Failed to log API usage:', error);
        });
    }

    // Call original send
    return originalSend.call(this, data);
  };

  next();
};

/**
 * Combined middleware for API authentication with logging
 */
export const apiAuth = [apiKeyAuthMiddleware, logApiUsage];
