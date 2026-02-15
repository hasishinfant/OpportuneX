import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../redis';

/**
 * Rate limiting configurations and utilities
 */
export class RateLimiting {
  /**
   * General API rate limiting
   */
  static generalApiLimit = rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.call(...args),
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
      success: false,
      error: 'Too many requests',
      message: 'Too many requests from this IP, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise IP
      return req.user?.id || req.ip;
    },
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/health';
    },
    onLimitReached: (req: Request) => {
      console.warn('Rate limit reached:', {
        ip: req.ip,
        userId: req.user?.id,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
      });
    },
  });

  /**
   * Strict rate limiting for authentication endpoints
   */
  static authLimit = rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.call(...args),
    }),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 auth requests per windowMs
    message: {
      success: false,
      error: 'Too many authentication attempts',
      message: 'Too many authentication attempts, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => `auth:${req.ip}`,
    onLimitReached: (req: Request) => {
      console.warn('Auth rate limit reached:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
      });
    },
  });

  /**
   * Rate limiting for search endpoints
   */
  static searchLimit = rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.call(...args),
    }),
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 30, // Limit each user to 30 searches per minute
    message: {
      success: false,
      error: 'Too many search requests',
      message: 'Too many search requests, please slow down.',
    },
    keyGenerator: (req: Request) => {
      return req.user?.id || req.ip;
    },
    onLimitReached: (req: Request) => {
      console.warn('Search rate limit reached:', {
        ip: req.ip,
        userId: req.user?.id,
        userAgent: req.get('User-Agent'),
        query: req.query.q || req.body.query,
      });
    },
  });

  /**
   * Rate limiting for voice processing
   */
  static voiceLimit = rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.call(...args),
    }),
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 10, // Limit each user to 10 voice requests per minute
    message: {
      success: false,
      error: 'Too many voice requests',
      message:
        'Too many voice processing requests, please wait before trying again.',
    },
    keyGenerator: (req: Request) => {
      return req.user?.id || req.ip;
    },
    onLimitReached: (req: Request) => {
      console.warn('Voice processing rate limit reached:', {
        ip: req.ip,
        userId: req.user?.id,
        userAgent: req.get('User-Agent'),
      });
    },
  });

  /**
   * Rate limiting for AI roadmap generation
   */
  static aiLimit = rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.call(...args),
    }),
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 3, // Limit each user to 3 AI requests per 5 minutes
    message: {
      success: false,
      error: 'Too many AI requests',
      message:
        'AI processing is resource-intensive. Please wait before requesting another roadmap.',
    },
    keyGenerator: (req: Request) => {
      return req.user?.id || req.ip;
    },
    onLimitReached: (req: Request) => {
      console.warn('AI processing rate limit reached:', {
        ip: req.ip,
        userId: req.user?.id,
        userAgent: req.get('User-Agent'),
      });
    },
  });

  /**
   * Rate limiting for file uploads
   */
  static uploadLimit = rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.call(...args),
    }),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each user to 10 uploads per hour
    message: {
      success: false,
      error: 'Too many upload requests',
      message: 'Upload limit exceeded. Please try again later.',
    },
    keyGenerator: (req: Request) => {
      return req.user?.id || req.ip;
    },
  });

  /**
   * Rate limiting for password reset requests
   */
  static passwordResetLimit = rateLimit({
    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.call(...args),
    }),
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // Limit each IP to 3 password reset requests per hour
    message: {
      success: false,
      error: 'Too many password reset requests',
      message: 'Too many password reset attempts. Please try again later.',
    },
    keyGenerator: (req: Request) => `password-reset:${req.ip}`,
    onLimitReached: (req: Request) => {
      console.warn('Password reset rate limit reached:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        email: req.body.email,
      });
    },
  });

  /**
   * Custom rate limiting with sliding window
   */
  static createSlidingWindowLimit(options: {
    windowMs: number;
    maxRequests: number;
    keyPrefix: string;
  }) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const { windowMs, maxRequests, keyPrefix } = options;
      const key = `${keyPrefix}:${req.user?.id || req.ip}`;
      const now = Date.now();
      const windowStart = now - windowMs;

      try {
        // Remove old entries
        await redis.zremrangebyscore(key, 0, windowStart);

        // Count current requests in window
        const currentCount = await redis.zcard(key);

        if (currentCount >= maxRequests) {
          console.warn('Sliding window rate limit exceeded:', {
            key,
            currentCount,
            maxRequests,
            ip: req.ip,
            userId: req.user?.id,
          });

          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            message: 'Too many requests. Please try again later.',
          });
        }

        // Add current request
        await redis.zadd(key, now, `${now}-${Math.random()}`);
        await redis.expire(key, Math.ceil(windowMs / 1000));

        next();
      } catch (error) {
        console.error('Error in sliding window rate limiter:', error);
        // Fail open - allow request if Redis is down
        next();
      }
    };
  }

  /**
   * Adaptive rate limiting based on user behavior
   */
  static adaptiveLimit = async (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const userId = req.user?.id;
    const { ip } = req;

    if (!userId && !ip) {
      return next();
    }

    const key = userId ? `adaptive:user:${userId}` : `adaptive:ip:${ip}`;

    try {
      // Get user's recent behavior
      const recentRequests = await redis.lrange(`${key}:requests`, 0, -1);
      const recentErrors = await redis.lrange(`${key}:errors`, 0, -1);

      const now = Date.now();
      const fiveMinutesAgo = now - 5 * 60 * 1000;

      // Count recent requests and errors
      const recentRequestCount = recentRequests.filter(
        timestamp => parseInt(timestamp) > fiveMinutesAgo
      ).length;

      const recentErrorCount = recentErrors.filter(
        timestamp => parseInt(timestamp) > fiveMinutesAgo
      ).length;

      // Calculate dynamic limit based on behavior
      let maxRequests = 60; // Base limit per 5 minutes

      // Reduce limit if user has many errors (potential abuse)
      if (recentErrorCount > 10) {
        maxRequests = 20;
      } else if (recentErrorCount > 5) {
        maxRequests = 40;
      }

      // Increase limit for authenticated users with good behavior
      if (userId && recentErrorCount < 2) {
        maxRequests = 100;
      }

      if (recentRequestCount >= maxRequests) {
        console.warn('Adaptive rate limit exceeded:', {
          key,
          recentRequestCount,
          maxRequests,
          recentErrorCount,
          ip,
          userId,
        });

        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          message: 'Request rate too high. Please slow down.',
        });
      }

      // Record this request
      await redis.lpush(`${key}:requests`, now.toString());
      await redis.ltrim(`${key}:requests`, 0, 99); // Keep last 100 requests
      await redis.expire(`${key}:requests`, 3600); // 1 hour TTL

      next();
    } catch (error) {
      console.error('Error in adaptive rate limiter:', error);
      // Fail open
      next();
    }
  };

  /**
   * Record error for adaptive rate limiting
   */
  static recordError = async (req: Request, statusCode: number) => {
    if (statusCode < 400) return;

    const userId = req.user?.id;
    const { ip } = req;
    const key = userId ? `adaptive:user:${userId}` : `adaptive:ip:${ip}`;

    try {
      await redis.lpush(`${key}:errors`, Date.now().toString());
      await redis.ltrim(`${key}:errors`, 0, 49); // Keep last 50 errors
      await redis.expire(`${key}:errors`, 3600); // 1 hour TTL
    } catch (error) {
      console.error('Error recording error for adaptive rate limiting:', error);
    }
  };

  /**
   * Whitelist certain IPs or users from rate limiting
   */
  static createWhitelistMiddleware(whitelist: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
      const { ip } = req;
      const userId = req.user?.id;

      if (whitelist.includes(ip) || (userId && whitelist.includes(userId))) {
        // Skip rate limiting for whitelisted IPs/users
        return next();
      }

      // Continue with normal rate limiting
      next();
    };
  }

  /**
   * Global rate limiting with different tiers
   */
  static tieredRateLimit = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const userAgent = req.get('User-Agent') || '';
    const isBot = /bot|crawler|spider|scraper/i.test(userAgent);
    const isAuthenticated = !!req.user;

    let limit: any;

    if (isBot) {
      // Very restrictive for bots
      limit = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 10,
        message: {
          success: false,
          error: 'Bot rate limit exceeded',
          message:
            'Automated requests are limited. Please contact support for API access.',
        },
      });
    } else if (isAuthenticated) {
      // More generous for authenticated users
      limit = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 200,
        keyGenerator: (req: Request) => req.user.id,
      });
    } else {
      // Standard limit for anonymous users
      limit = rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 50,
      });
    }

    limit(req, res, next);
  };
}

/**
 * Middleware to apply appropriate rate limiting based on endpoint
 */
export const applyRateLimit = (endpoint: string) => {
  switch (endpoint) {
    case 'auth':
      return RateLimiting.authLimit;
    case 'search':
      return RateLimiting.searchLimit;
    case 'voice':
      return RateLimiting.voiceLimit;
    case 'ai':
      return RateLimiting.aiLimit;
    case 'upload':
      return RateLimiting.uploadLimit;
    case 'password-reset':
      return RateLimiting.passwordResetLimit;
    default:
      return RateLimiting.generalApiLimit;
  }
};
