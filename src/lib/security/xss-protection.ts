import type { NextFunction, Request, Response } from 'express';
import DOMPurify from 'isomorphic-dompurify';

/**
 * XSS Protection utilities
 */
export class XSSProtection {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHtml(
    html: string,
    options?: {
      allowedTags?: string[];
      allowedAttributes?: string[];
      allowedSchemes?: string[];
    }
  ): string {
    if (!html || typeof html !== 'string') {
      return '';
    }

    const defaultOptions = {
      allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
      allowedAttributes: [],
      allowedSchemes: ['http', 'https', 'mailto'],
    };

    const config = { ...defaultOptions, ...options };

    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: config.allowedTags,
      ALLOWED_ATTR: config.allowedAttributes,
      ALLOWED_URI_REGEXP: new RegExp(
        `^(${config.allowedSchemes.join('|')}):`,
        'i'
      ),
      KEEP_CONTENT: true,
      REMOVE_DATA_ATTRIBUTES: true,
      REMOVE_UNKNOWN_PROTOCOLS: true,
      USE_PROFILES: { html: true },
    });
  }

  /**
   * Escape HTML entities in text content
   */
  static escapeHtml(text: string): string {
    if (!text || typeof text !== 'string') {
      return '';
    }

    const entityMap: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;',
    };

    return text.replace(/[&<>"'`=\/]/g, char => entityMap[char]);
  }

  /**
   * Remove potentially dangerous JavaScript from strings
   */
  static removeJavaScript(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Remove script tags and their content
    let cleaned = input.replace(
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      ''
    );

    // Remove javascript: protocol
    cleaned = cleaned.replace(/javascript:/gi, '');

    // Remove on* event handlers
    cleaned = cleaned.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
    cleaned = cleaned.replace(/\s*on\w+\s*=\s*[^>\s]+/gi, '');

    // Remove data: URLs that could contain JavaScript
    cleaned = cleaned.replace(/data:\s*text\/html/gi, 'data:text/plain');

    // Remove vbscript: protocol
    cleaned = cleaned.replace(/vbscript:/gi, '');

    // Remove expression() CSS
    cleaned = cleaned.replace(/expression\s*\(/gi, '');

    return cleaned;
  }

  /**
   * Validate and sanitize URLs to prevent XSS
   */
  static sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      return '';
    }

    const trimmed = url.trim();

    // Block dangerous protocols
    const dangerousProtocols = [
      'javascript:',
      'data:',
      'vbscript:',
      'file:',
      'ftp:',
    ];

    const lowerUrl = trimmed.toLowerCase();
    if (dangerousProtocols.some(protocol => lowerUrl.startsWith(protocol))) {
      return '';
    }

    // Only allow http, https, and mailto
    if (!lowerUrl.match(/^(https?:\/\/|mailto:)/)) {
      return '';
    }

    // Remove any embedded scripts or dangerous characters
    return this.removeJavaScript(trimmed);
  }

  /**
   * Sanitize JSON data recursively
   */
  static sanitizeJsonData(data: any): any {
    if (typeof data === 'string') {
      return this.escapeHtml(data);
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeJsonData(item));
    }

    if (data && typeof data === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(data)) {
        const sanitizedKey = this.escapeHtml(key);
        sanitized[sanitizedKey] = this.sanitizeJsonData(value);
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Content Security Policy configuration
   */
  static getCSPConfig(): string {
    const directives = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://unpkg.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "media-src 'self' blob:",
      "connect-src 'self' https://api.openai.com https://speech.googleapis.com wss:",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ];

    return directives.join('; ');
  }

  /**
   * Middleware to set XSS protection headers
   */
  static setXSSHeaders = (req: Request, res: Response, next: NextFunction) => {
    // X-XSS-Protection header
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // X-Content-Type-Options header
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // X-Frame-Options header
    res.setHeader('X-Frame-Options', 'DENY');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy
    res.setHeader('Content-Security-Policy', XSSProtection.getCSPConfig());

    // Permissions Policy (formerly Feature Policy)
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
    );

    next();
  };

  /**
   * Middleware to sanitize request data
   */
  static sanitizeRequest = (
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    try {
      // Sanitize request body
      if (req.body) {
        req.body = this.sanitizeRequestBody(req.body);
      }

      // Sanitize query parameters
      if (req.query) {
        const sanitizedQuery: any = {};
        for (const [key, value] of Object.entries(req.query)) {
          const sanitizedKey = this.escapeHtml(key);
          if (typeof value === 'string') {
            sanitizedQuery[sanitizedKey] = this.escapeHtml(value);
          } else if (Array.isArray(value)) {
            sanitizedQuery[sanitizedKey] = value.map(v =>
              typeof v === 'string' ? this.escapeHtml(v) : v
            );
          } else {
            sanitizedQuery[sanitizedKey] = value;
          }
        }
        req.query = sanitizedQuery;
      }

      next();
    } catch (error) {
      console.error('Error in XSS protection middleware:', error);
      res.status(400).json({
        success: false,
        error: 'Invalid request format',
        message: 'Request contains potentially unsafe content.',
      });
    }
  };

  /**
   * Sanitize request body recursively
   */
  private static sanitizeRequestBody(body: any): any {
    if (typeof body === 'string') {
      return this.escapeHtml(body);
    }

    if (Array.isArray(body)) {
      return body.map(item => this.sanitizeRequestBody(item));
    }

    if (body && typeof body === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(body)) {
        const sanitizedKey = this.escapeHtml(key);

        // Special handling for different field types
        if (
          key.toLowerCase().includes('html') ||
          key.toLowerCase().includes('content')
        ) {
          // For HTML content fields, use HTML sanitization
          sanitized[sanitizedKey] =
            typeof value === 'string'
              ? this.sanitizeHtml(value)
              : this.sanitizeRequestBody(value);
        } else if (
          key.toLowerCase().includes('url') ||
          key.toLowerCase().includes('link')
        ) {
          // For URL fields, use URL sanitization
          sanitized[sanitizedKey] =
            typeof value === 'string'
              ? this.sanitizeUrl(value)
              : this.sanitizeRequestBody(value);
        } else {
          // For other fields, use standard escaping
          sanitized[sanitizedKey] = this.sanitizeRequestBody(value);
        }
      }
      return sanitized;
    }

    return body;
  }

  /**
   * Validate file uploads for XSS
   */
  static validateFileUpload(file: {
    originalname: string;
    mimetype: string;
    buffer: Buffer;
  }): { isValid: boolean; error?: string } {
    // Check file extension
    const allowedExtensions = [
      '.jpg',
      '.jpeg',
      '.png',
      '.gif',
      '.webp',
      '.pdf',
      '.txt',
    ];
    const fileExtension = file.originalname
      .toLowerCase()
      .substring(file.originalname.lastIndexOf('.'));

    if (!allowedExtensions.includes(fileExtension)) {
      return { isValid: false, error: 'File type not allowed' };
    }

    // Check MIME type
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
    ];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return { isValid: false, error: 'Invalid file type' };
    }

    // Check for embedded scripts in file content
    const fileContent = file.buffer.toString(
      'utf8',
      0,
      Math.min(1024, file.buffer.length)
    );
    const scriptPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
    ];

    if (scriptPatterns.some(pattern => pattern.test(fileContent))) {
      return {
        isValid: false,
        error: 'File contains potentially malicious content',
      };
    }

    return { isValid: true };
  }

  /**
   * Generate secure random nonce for CSP
   */
  static generateNonce(): string {
    const crypto = require('crypto');
    return crypto.randomBytes(16).toString('base64');
  }

  /**
   * Create CSP with nonce for inline scripts
   */
  static getCSPWithNonce(nonce: string): string {
    const directives = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' https://cdn.jsdelivr.net https://unpkg.com`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "media-src 'self' blob:",
      "connect-src 'self' https://api.openai.com https://speech.googleapis.com wss:",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      'upgrade-insecure-requests',
    ];

    return directives.join('; ');
  }
}

/**
 * Response sanitization middleware
 */
export const sanitizeResponse = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const originalJson = res.json;

  res.json = function (data: any) {
    // Sanitize response data
    const sanitizedData = XSSProtection.sanitizeJsonData(data);
    return originalJson.call(this, sanitizedData);
  };

  next();
};
