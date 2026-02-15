import type { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

/**
 * Security headers configuration and utilities
 */
export class SecurityHeaders {
  /**
   * Comprehensive security headers using Helmet
   */
  static helmetConfig = helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Next.js in development
          "'unsafe-eval'", // Required for Next.js in development
          'https://cdn.jsdelivr.net',
          'https://unpkg.com',
          'https://www.googletagmanager.com',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          'https://fonts.googleapis.com',
          'https://cdn.jsdelivr.net',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        mediaSrc: ["'self'", 'blob:'],
        connectSrc: [
          "'self'",
          'https://api.openai.com',
          'https://speech.googleapis.com',
          'https://api.twilio.com',
          'wss:',
          'ws:',
        ],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests:
          process.env.NODE_ENV === 'production' ? [] : null,
      },
    },

    // Cross-Origin Embedder Policy
    crossOriginEmbedderPolicy: false, // Disabled for compatibility

    // Cross-Origin Opener Policy
    crossOriginOpenerPolicy: { policy: 'same-origin' },

    // Cross-Origin Resource Policy
    crossOriginResourcePolicy: { policy: 'cross-origin' },

    // DNS Prefetch Control
    dnsPrefetchControl: { allow: false },

    // Expect-CT (deprecated but still useful)
    expectCt: {
      maxAge: 86400,
      enforce: process.env.NODE_ENV === 'production',
    },

    // Feature Policy / Permissions Policy
    permissionsPolicy: {
      camera: [],
      microphone: ["'self'"], // Allow microphone for voice search
      geolocation: [],
      payment: [],
      usb: [],
      magnetometer: [],
      gyroscope: [],
      accelerometer: [],
    },

    // Hide X-Powered-By header
    hidePoweredBy: true,

    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },

    // IE No Open
    ieNoOpen: true,

    // No Sniff
    noSniff: true,

    // Origin Agent Cluster
    originAgentCluster: true,

    // Referrer Policy
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },

    // X-Frame-Options
    frameguard: { action: 'deny' },

    // X-XSS-Protection
    xssFilter: true,
  });

  /**
   * Custom security headers middleware
   */
  static customSecurityHeaders = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Remove server information
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');

    // Cache control for sensitive pages
    if (req.path.includes('/profile') || req.path.includes('/admin')) {
      res.setHeader(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, private'
      );
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    // CORS headers for API endpoints
    if (req.path.startsWith('/api/')) {
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        process.env.APP_URL,
        'http://localhost:3000',
        'http://localhost:3001',
      ].filter(Boolean);

      const { origin } = req.headers;
      if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
      }

      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, OPTIONS'
      );
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Content-Type, Authorization, X-Requested-With, X-CSRF-Token'
      );
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
    }

    next();
  };

  /**
   * HTTPS enforcement middleware
   */
  static enforceHTTPS = (req: Request, res: Response, next: NextFunction) => {
    // Skip HTTPS enforcement in development
    if (process.env.NODE_ENV !== 'production') {
      return next();
    }

    // Check if request is already HTTPS
    const isHTTPS =
      req.secure ||
      req.headers['x-forwarded-proto'] === 'https' ||
      req.headers['x-forwarded-ssl'] === 'on';

    if (!isHTTPS) {
      console.warn('HTTP request redirected to HTTPS:', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        headers: req.headers,
      });

      const httpsUrl = `https://${req.get('host')}${req.url}`;
      return res.redirect(301, httpsUrl);
    }

    next();
  };

  /**
   * Secure cookie configuration
   */
  static secureSessionConfig = {
    name: 'sessionId',
    secret: process.env.SESSION_SECRET || 'default-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      httpOnly: true, // Prevent XSS
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'strict' as const, // CSRF protection
    },
    rolling: true, // Reset expiry on activity
  };

  /**
   * Content Security Policy with nonce support
   */
  static cspWithNonce = (nonce: string) => {
    return helmet.contentSecurityPolicy({
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          `'nonce-${nonce}'`,
          'https://cdn.jsdelivr.net',
          'https://unpkg.com',
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for CSS-in-JS libraries
          'https://fonts.googleapis.com',
        ],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: [
          "'self'",
          'https://api.openai.com',
          'https://speech.googleapis.com',
          'wss:',
        ],
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: [],
      },
    });
  };

  /**
   * API-specific security headers
   */
  static apiSecurityHeaders = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    // JSON-specific headers
    res.setHeader('Content-Type', 'application/json; charset=utf-8');

    // Prevent caching of API responses
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, private'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // API versioning header
    res.setHeader('API-Version', '1.0');

    // Rate limiting headers (will be set by rate limiting middleware)
    res.setHeader('X-RateLimit-Limit', '100');

    next();
  };

  /**
   * Security headers for file uploads
   */
  static uploadSecurityHeaders = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    // Strict CSP for upload endpoints
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; form-action 'self'"
    );

    // Prevent file execution
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', 'attachment');

    next();
  };

  /**
   * Development-specific security headers
   */
  static developmentHeaders = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (process.env.NODE_ENV === 'development') {
      // More permissive CSP for development
      res.setHeader(
        'Content-Security-Policy',
        "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: ws: wss:; " +
          "connect-src 'self' ws: wss: http: https:;"
      );

      // Allow hot reloading
      res.setHeader('Access-Control-Allow-Origin', '*');
    }

    next();
  };

  /**
   * Security monitoring headers
   */
  static monitoringHeaders = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    // Add request ID for tracking
    const requestId =
      req.headers['x-request-id'] ||
      `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    res.setHeader('X-Request-ID', requestId);

    // Add timing information
    const startTime = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      console.log('Request completed:', {
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
    });

    next();
  };

  /**
   * Complete security middleware stack
   */
  static securityStack = [
    SecurityHeaders.enforceHTTPS,
    SecurityHeaders.helmetConfig,
    SecurityHeaders.customSecurityHeaders,
    SecurityHeaders.monitoringHeaders,
  ];

  /**
   * API-specific security stack
   */
  static apiSecurityStack = [
    SecurityHeaders.enforceHTTPS,
    SecurityHeaders.apiSecurityHeaders,
    SecurityHeaders.customSecurityHeaders,
    SecurityHeaders.monitoringHeaders,
  ];
}

/**
 * Security configuration for different environments
 */
export const getSecurityConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    // HTTPS enforcement
    enforceHTTPS: isProduction,

    // Strict Transport Security
    hsts: {
      maxAge: isProduction ? 31536000 : 0, // 1 year in production, disabled in dev
      includeSubDomains: isProduction,
      preload: isProduction,
    },

    // Content Security Policy
    csp: {
      reportOnly: !isProduction, // Report-only in development
      reportUri: process.env.CSP_REPORT_URI,
    },

    // Cookie security
    secureCookies: isProduction,

    // CORS
    cors: {
      origin: isProduction
        ? [process.env.FRONTEND_URL, process.env.APP_URL].filter(Boolean)
        : true, // Allow all origins in development
      credentials: true,
    },
  };
};
