import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';

/**
 * CSRF Protection utilities
 */
export class CSRFProtection {
  private static readonly SECRET_KEY =
    process.env.CSRF_SECRET || 'default-csrf-secret-key';
  private static readonly TOKEN_LENGTH = 32;
  private static readonly TOKEN_EXPIRY = 3600000; // 1 hour in milliseconds

  /**
   * Generate CSRF token
   */
  static generateToken(sessionId?: string): string {
    const timestamp = Date.now().toString();
    const randomBytes = crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
    const payload = `${timestamp}:${sessionId || 'anonymous'}:${randomBytes}`;

    const hmac = crypto.createHmac('sha256', this.SECRET_KEY);
    hmac.update(payload);
    const signature = hmac.digest('hex');

    return Buffer.from(`${payload}:${signature}`).toString('base64');
  }

  /**
   * Verify CSRF token
   */
  static verifyToken(token: string, sessionId?: string): boolean {
    try {
      if (!token) {
        return false;
      }

      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const parts = decoded.split(':');

      if (parts.length !== 4) {
        return false;
      }

      const [timestamp, tokenSessionId, randomBytes, signature] = parts;
      const payload = `${timestamp}:${tokenSessionId}:${randomBytes}`;

      // Verify signature
      const hmac = crypto.createHmac('sha256', this.SECRET_KEY);
      hmac.update(payload);
      const expectedSignature = hmac.digest('hex');

      if (signature !== expectedSignature) {
        return false;
      }

      // Check if token is expired
      const tokenTime = parseInt(timestamp, 10);
      const currentTime = Date.now();

      if (currentTime - tokenTime > this.TOKEN_EXPIRY) {
        return false;
      }

      // Check session ID match (if provided)
      if (
        sessionId &&
        tokenSessionId !== sessionId &&
        tokenSessionId !== 'anonymous'
      ) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error verifying CSRF token:', error);
      return false;
    }
  }

  /**
   * Extract session ID from request
   */
  private static getSessionId(req: Request): string {
    // Try to get session ID from various sources
    if (req.session?.id) {
      return req.session.id;
    }

    if (req.user?.id) {
      return req.user.id;
    }

    // Fallback to IP + User-Agent hash
    const userAgent = req.get('User-Agent') || '';
    const ip = req.ip || req.connection.remoteAddress || '';
    return crypto
      .createHash('sha256')
      .update(`${ip}:${userAgent}`)
      .digest('hex')
      .substring(0, 16);
  }

  /**
   * Middleware to generate and set CSRF token
   */
  static generateCSRFToken = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const sessionId = this.getSessionId(req);
    const token = this.generateToken(sessionId);

    // Set token in response header
    res.setHeader('X-CSRF-Token', token);

    // Also make it available in locals for templates
    res.locals.csrfToken = token;

    // Store in request for later use
    (req as any).csrfToken = token;

    next();
  };

  /**
   * Middleware to verify CSRF token
   */
  static verifyCSRFToken = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    // Skip CSRF check for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Skip CSRF check for API endpoints with proper authentication
    if (req.path.startsWith('/api/') && req.headers.authorization) {
      return next();
    }

    const sessionId = this.getSessionId(req);

    // Get token from various sources
    const token =
      (req.headers['x-csrf-token'] as string) ||
      (req.headers['csrf-token'] as string) ||
      req.body._csrf ||
      (req.query._csrf as string);

    if (!token) {
      console.warn('CSRF token missing:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        success: false,
        error: 'CSRF token missing',
        message: 'CSRF token is required for this request.',
      });
    }

    if (!this.verifyToken(token, sessionId)) {
      console.warn('Invalid CSRF token:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
        tokenProvided: !!token,
      });

      return res.status(403).json({
        success: false,
        error: 'Invalid CSRF token',
        message: 'CSRF token is invalid or expired.',
      });
    }

    next();
  };

  /**
   * Middleware for double submit cookie pattern
   */
  static doubleSubmitCookie = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const cookieName = 'csrf-token';
    const headerName = 'x-csrf-token';

    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      // For safe methods, generate and set cookie
      const token = crypto.randomBytes(32).toString('hex');

      res.cookie(cookieName, token, {
        httpOnly: false, // Client needs to read this for AJAX requests
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600000, // 1 hour
      });

      res.locals.csrfToken = token;
      return next();
    }

    // For unsafe methods, verify token
    const cookieToken = req.cookies[cookieName];
    const headerToken = req.headers[headerName] as string;

    if (!cookieToken || !headerToken) {
      return res.status(403).json({
        success: false,
        error: 'CSRF protection failed',
        message: 'CSRF tokens are missing.',
      });
    }

    if (cookieToken !== headerToken) {
      console.warn('CSRF double submit cookie mismatch:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
        method: req.method,
      });

      return res.status(403).json({
        success: false,
        error: 'CSRF protection failed',
        message: 'CSRF tokens do not match.',
      });
    }

    next();
  };

  /**
   * SameSite cookie configuration
   */
  static configureSameSiteCookies = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    // Override cookie method to enforce SameSite
    const originalCookie = res.cookie;

    res.cookie = function (name: string, value: any, options: any = {}) {
      const secureOptions = {
        ...options,
        sameSite: options.sameSite || 'strict',
        secure: process.env.NODE_ENV === 'production' ? true : options.secure,
        httpOnly: options.httpOnly !== false, // Default to true unless explicitly set to false
      };

      return originalCookie.call(this, name, value, secureOptions);
    };

    next();
  };

  /**
   * Origin validation middleware
   */
  static validateOrigin = (req: Request, res: Response, next: NextFunction) => {
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.APP_URL,
      'http://localhost:3000',
      'http://localhost:3001',
    ].filter(Boolean);

    const { origin } = req.headers;
    const { referer } = req.headers;

    // Skip origin check for same-origin requests
    if (!origin && !referer) {
      return next();
    }

    // Check origin header
    if (origin && !allowedOrigins.includes(origin)) {
      console.warn('Invalid origin detected:', {
        origin,
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        path: req.path,
      });

      return res.status(403).json({
        success: false,
        error: 'Invalid origin',
        message: 'Request origin is not allowed.',
      });
    }

    // Check referer header for additional validation
    if (referer) {
      const refererOrigin = new URL(referer).origin;
      if (!allowedOrigins.includes(refererOrigin)) {
        console.warn('Invalid referer detected:', {
          referer: refererOrigin,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
        });

        return res.status(403).json({
          success: false,
          error: 'Invalid referer',
          message: 'Request referer is not allowed.',
        });
      }
    }

    next();
  };

  /**
   * Custom header validation (for AJAX requests)
   */
  static validateCustomHeader = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    // Skip for safe methods
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // Require custom header for AJAX requests
    const customHeader = req.headers['x-requested-with'];

    if (!customHeader || customHeader !== 'XMLHttpRequest') {
      // Also accept Content-Type: application/json as valid AJAX indicator
      const contentType = req.headers['content-type'];
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Missing custom header for AJAX request:', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          path: req.path,
          method: req.method,
          contentType,
        });

        return res.status(403).json({
          success: false,
          error: 'Invalid request',
          message: 'Custom header required for AJAX requests.',
        });
      }
    }

    next();
  };

  /**
   * Rate limiting for CSRF token generation
   */
  static rateLimitTokenGeneration = (() => {
    const tokenRequests = new Map<
      string,
      { count: number; resetTime: number }
    >();
    const MAX_REQUESTS = 10;
    const WINDOW_MS = 60000; // 1 minute

    return (req: Request, res: Response, next: NextFunction) => {
      const clientId = req.ip || 'unknown';
      const now = Date.now();

      const clientData = tokenRequests.get(clientId);

      if (!clientData || now > clientData.resetTime) {
        tokenRequests.set(clientId, { count: 1, resetTime: now + WINDOW_MS });
        return next();
      }

      if (clientData.count >= MAX_REQUESTS) {
        console.warn('CSRF token generation rate limit exceeded:', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          count: clientData.count,
        });

        return res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          message: 'Too many token requests. Please try again later.',
        });
      }

      clientData.count++;
      next();
    };
  })();
}

/**
 * Complete CSRF protection middleware stack
 */
export const csrfProtectionStack = [
  CSRFProtection.configureSameSiteCookies,
  CSRFProtection.validateOrigin,
  CSRFProtection.rateLimitTokenGeneration,
  CSRFProtection.generateCSRFToken,
  CSRFProtection.verifyCSRFToken,
];

/**
 * Lightweight CSRF protection for API endpoints
 */
export const apiCSRFProtection = [
  CSRFProtection.validateOrigin,
  CSRFProtection.validateCustomHeader,
];
