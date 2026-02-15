import type { NextFunction, Request, Response } from 'express';
import { AuditLogger } from './audit-logging';
import { apiCSRFProtection, csrfProtectionStack } from './csrf-protection';
import { sanitizeRequest } from './input-sanitization';
import { RateLimiting, applyRateLimit } from './rate-limiting';
import { SecurityHeaders } from './security-headers';
import { SQLInjectionPrevention } from './sql-injection-prevention';
import { XSSProtection, sanitizeResponse } from './xss-protection';

/**
 * Comprehensive security middleware stack for OpportuneX
 */
export class SecurityMiddleware {
  /**
   * Complete security middleware stack for web routes
   */
  static webSecurityStack = [
    // HTTPS enforcement
    SecurityHeaders.enforceHTTPS,

    // Security headers
    SecurityHeaders.helmetConfig,
    SecurityHeaders.customSecurityHeaders,

    // Rate limiting
    RateLimiting.generalApiLimit,

    // Input sanitization
    sanitizeRequest,

    // SQL injection prevention
    SQLInjectionPrevention.preventSQLInjection,

    // XSS protection
    XSSProtection.setXSSHeaders,
    XSSProtection.sanitizeRequest,

    // CSRF protection
    ...csrfProtectionStack,

    // Response sanitization
    sanitizeResponse,

    // Audit logging
    AuditLogger.auditMiddleware,
  ];

  /**
   * API-specific security middleware stack
   */
  static apiSecurityStack = [
    // HTTPS enforcement
    SecurityHeaders.enforceHTTPS,

    // API security headers
    SecurityHeaders.apiSecurityHeaders,

    // Rate limiting (adaptive)
    RateLimiting.adaptiveLimit,

    // Input sanitization
    sanitizeRequest,

    // SQL injection prevention
    SQLInjectionPrevention.preventSQLInjection,

    // XSS protection
    XSSProtection.sanitizeRequest,

    // CSRF protection for APIs
    ...apiCSRFProtection,

    // Response sanitization
    sanitizeResponse,

    // Audit logging
    AuditLogger.auditMiddleware,
  ];

  /**
   * Authentication endpoint security
   */
  static authSecurityStack = [
    SecurityHeaders.enforceHTTPS,
    SecurityHeaders.customSecurityHeaders,
    applyRateLimit('auth'),
    sanitizeRequest,
    SQLInjectionPrevention.preventSQLInjection,
    XSSProtection.sanitizeRequest,
    AuditLogger.auditMiddleware,
  ];

  /**
   * Search endpoint security
   */
  static searchSecurityStack = [
    SecurityHeaders.enforceHTTPS,
    applyRateLimit('search'),
    sanitizeRequest,
    SQLInjectionPrevention.preventSQLInjection,
    XSSProtection.sanitizeRequest,
    sanitizeResponse,
    AuditLogger.auditMiddleware,
  ];

  /**
   * Voice processing security
   */
  static voiceSecurityStack = [
    SecurityHeaders.enforceHTTPS,
    applyRateLimit('voice'),
    SecurityMiddleware.validateVoiceInput,
    sanitizeRequest,
    AuditLogger.auditMiddleware,
  ];

  /**
   * AI processing security
   */
  static aiSecurityStack = [
    SecurityHeaders.enforceHTTPS,
    applyRateLimit('ai'),
    sanitizeRequest,
    SecurityMiddleware.validateAIInput,
    AuditLogger.auditMiddleware,
  ];

  /**
   * File upload security
   */
  static uploadSecurityStack = [
    SecurityHeaders.enforceHTTPS,
    SecurityHeaders.uploadSecurityHeaders,
    applyRateLimit('upload'),
    SecurityMiddleware.validateFileUpload,
    AuditLogger.auditMiddleware,
  ];

  /**
   * Admin panel security
   */
  static adminSecurityStack = [
    SecurityHeaders.enforceHTTPS,
    SecurityHeaders.customSecurityHeaders,
    RateLimiting.generalApiLimit,
    SecurityMiddleware.requireAdminAuth,
    sanitizeRequest,
    SQLInjectionPrevention.preventSQLInjection,
    XSSProtection.sanitizeRequest,
    AuditLogger.auditMiddleware,
  ];

  /**
   * Privacy/GDPR endpoint security
   */
  static privacySecurityStack = [
    SecurityHeaders.enforceHTTPS,
    SecurityHeaders.customSecurityHeaders,
    RateLimiting.generalApiLimit,
    SecurityMiddleware.requireUserAuth,
    sanitizeRequest,
    SQLInjectionPrevention.preventSQLInjection,
    XSSProtection.sanitizeRequest,
    AuditLogger.auditMiddleware,
  ];

  /**
   * Validate voice input
   */
  static validateVoiceInput = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { audioData, language } = req.body;

      // Validate audio data
      if (!audioData) {
        return res.status(400).json({
          success: false,
          error: 'Audio data required',
          message: 'Voice input requires audio data.',
        });
      }

      // Validate language
      if (language && !['en', 'hi'].includes(language)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid language',
          message: 'Supported languages are English (en) and Hindi (hi).',
        });
      }

      // Check audio data size (limit to 10MB)
      const audioSize = Buffer.byteLength(audioData, 'base64');
      if (audioSize > 10 * 1024 * 1024) {
        return res.status(400).json({
          success: false,
          error: 'Audio too large',
          message: 'Audio file must be smaller than 10MB.',
        });
      }

      // Log voice processing attempt
      AuditLogger.logEvent({
        eventType: 'voice_processing_request',
        userId: req.user?.id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        resource: 'voice',
        action: 'process',
        details: {
          language,
          audioSize,
        },
        riskLevel: AuditLogger.RISK_LEVELS.LOW,
        success: true,
      });

      next();
    } catch (error) {
      console.error('Voice input validation error:', error);
      res.status(400).json({
        success: false,
        error: 'Invalid voice input',
        message: 'Voice input validation failed.',
      });
    }
  };

  /**
   * Validate AI processing input
   */
  static validateAIInput = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      const { opportunityId, userProfile, targetDate } = req.body;

      // Validate opportunity ID
      if (
        opportunityId &&
        !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          opportunityId
        )
      ) {
        return res.status(400).json({
          success: false,
          error: 'Invalid opportunity ID',
          message: 'Opportunity ID must be a valid UUID.',
        });
      }

      // Validate target date
      if (targetDate) {
        const date = new Date(targetDate);
        if (isNaN(date.getTime()) || date <= new Date()) {
          return res.status(400).json({
            success: false,
            error: 'Invalid target date',
            message: 'Target date must be a valid future date.',
          });
        }
      }

      // Log AI processing attempt
      AuditLogger.logEvent({
        eventType: 'ai_processing_request',
        userId: req.user?.id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        resource: 'ai',
        action: 'generate_roadmap',
        details: {
          opportunityId,
          hasUserProfile: !!userProfile,
          targetDate,
        },
        riskLevel: AuditLogger.RISK_LEVELS.LOW,
        success: true,
      });

      next();
    } catch (error) {
      console.error('AI input validation error:', error);
      res.status(400).json({
        success: false,
        error: 'Invalid AI input',
        message: 'AI processing input validation failed.',
      });
    }
  };

  /**
   * Validate file uploads
   */
  static validateFileUpload = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      if (!req.file && !req.files) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded',
          message: 'File upload is required.',
        });
      }

      const file =
        req.file || (Array.isArray(req.files) ? req.files[0] : req.files);

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file',
          message: 'File upload failed.',
        });
      }

      // Validate file using XSS protection
      const validation = XSSProtection.validateFileUpload(file);
      if (!validation.isValid) {
        return res.status(400).json({
          success: false,
          error: 'File validation failed',
          message: validation.error,
        });
      }

      // Log file upload attempt
      AuditLogger.logEvent({
        eventType: 'file_upload',
        userId: req.user?.id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        resource: 'upload',
        action: 'upload',
        details: {
          fileName: file.originalname,
          fileSize: file.size,
          mimeType: file.mimetype,
        },
        riskLevel: AuditLogger.RISK_LEVELS.MEDIUM,
        success: true,
      });

      next();
    } catch (error) {
      console.error('File upload validation error:', error);
      res.status(400).json({
        success: false,
        error: 'File validation failed',
        message: 'File upload validation failed.',
      });
    }
  };

  /**
   * Require user authentication
   */
  static requireUserAuth = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      AuditLogger.logEvent({
        eventType: AuditLogger.EVENT_TYPES.UNAUTHORIZED_ACCESS,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        resource: req.path,
        action: req.method,
        riskLevel: AuditLogger.RISK_LEVELS.MEDIUM,
        success: false,
        errorMessage: 'Authentication required',
      });

      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'You must be logged in to access this resource.',
      });
    }

    next();
  };

  /**
   * Require admin authentication
   */
  static requireAdminAuth = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      AuditLogger.logEvent({
        eventType: AuditLogger.EVENT_TYPES.UNAUTHORIZED_ACCESS,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        resource: req.path,
        action: req.method,
        riskLevel: AuditLogger.RISK_LEVELS.HIGH,
        success: false,
        errorMessage: 'Admin authentication required',
      });

      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'Admin authentication required.',
      });
    }

    if (!req.user.isAdmin) {
      AuditLogger.logEvent({
        eventType: AuditLogger.EVENT_TYPES.UNAUTHORIZED_ACCESS,
        userId: req.user.id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        resource: req.path,
        action: req.method,
        riskLevel: AuditLogger.RISK_LEVELS.HIGH,
        success: false,
        errorMessage: 'Admin privileges required',
      });

      return res.status(403).json({
        success: false,
        error: 'Insufficient privileges',
        message: 'Admin privileges required to access this resource.',
      });
    }

    next();
  };

  /**
   * Security monitoring middleware
   */
  static securityMonitoring = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    const startTime = Date.now();

    // Monitor for suspicious patterns
    const suspiciousPatterns = [
      /\b(union|select|insert|delete|drop|alter|create|exec|execute)\b/gi,
      /<script|javascript:|on\w+\s*=/gi,
      /\.\.\//g,
      /\/etc\/passwd/gi,
      /cmd\.exe|powershell/gi,
    ];

    const requestString = JSON.stringify({
      url: req.url,
      body: req.body,
      query: req.query,
      headers: req.headers,
    });

    const suspiciousActivity = suspiciousPatterns.some(pattern =>
      pattern.test(requestString)
    );

    if (suspiciousActivity) {
      AuditLogger.logEvent({
        eventType: AuditLogger.EVENT_TYPES.SUSPICIOUS_ACTIVITY,
        userId: req.user?.id,
        sessionId: req.sessionID,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        resource: req.path,
        action: req.method,
        details: {
          suspiciousPatterns: suspiciousPatterns.map(p => p.toString()),
          requestData: requestString.substring(0, 500), // Limit logged data
        },
        riskLevel: AuditLogger.RISK_LEVELS.HIGH,
        success: false,
        errorMessage: 'Suspicious activity detected',
      });

      return res.status(400).json({
        success: false,
        error: 'Suspicious activity detected',
        message: 'Request contains potentially malicious content.',
      });
    }

    // Monitor response time
    res.on('finish', () => {
      const duration = Date.now() - startTime;

      if (duration > 5000) {
        // Log slow requests
        AuditLogger.logEvent({
          eventType: 'slow_request',
          userId: req.user?.id,
          sessionId: req.sessionID,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          resource: req.path,
          action: req.method,
          details: {
            duration,
            statusCode: res.statusCode,
          },
          riskLevel: AuditLogger.RISK_LEVELS.LOW,
          success: res.statusCode < 400,
        });
      }
    });

    next();
  };

  /**
   * Apply security middleware based on route type
   */
  static applySecurityForRoute(routeType: string) {
    switch (routeType) {
      case 'web':
        return this.webSecurityStack;
      case 'api':
        return this.apiSecurityStack;
      case 'auth':
        return this.authSecurityStack;
      case 'search':
        return this.searchSecurityStack;
      case 'voice':
        return this.voiceSecurityStack;
      case 'ai':
        return this.aiSecurityStack;
      case 'upload':
        return this.uploadSecurityStack;
      case 'admin':
        return this.adminSecurityStack;
      case 'privacy':
        return this.privacySecurityStack;
      default:
        return this.webSecurityStack;
    }
  }
}

/**
 * Security configuration for different environments
 */
export const getSecurityMiddlewareConfig = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    // Enable all security features in production
    enableCSRF: isProduction,
    enableRateLimit: true,
    enableAuditLogging: true,
    enableSecurityHeaders: true,
    enableInputSanitization: true,
    enableSQLInjectionPrevention: true,
    enableXSSProtection: true,

    // Development-specific settings
    logLevel: isProduction ? 'warn' : 'debug',
    enableSecurityMonitoring: true,

    // Rate limiting settings
    rateLimits: {
      general: isProduction ? 100 : 1000,
      auth: isProduction ? 5 : 50,
      search: isProduction ? 30 : 300,
      voice: isProduction ? 10 : 100,
      ai: isProduction ? 3 : 30,
    },
  };
};
