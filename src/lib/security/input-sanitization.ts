import type { Request } from 'express';
import DOMPurify from 'isomorphic-dompurify';
import validator from 'validator';

/**
 * Input sanitization utilities for security
 */
export class InputSanitizer {
  /**
   * Sanitize HTML content to prevent XSS attacks
   */
  static sanitizeHtml(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
    });
  }

  /**
   * Sanitize plain text input
   */
  static sanitizeText(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return validator.escape(input.trim());
  }

  /**
   * Sanitize search queries
   */
  static sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      return '';
    }

    // Remove potentially dangerous characters while preserving search functionality
    const sanitized = query
      .trim()
      .replace(/[<>'"]/g, '') // Remove HTML/script injection chars
      .replace(/[;\\]/g, '') // Remove SQL injection chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .substring(0, 500); // Limit length

    return sanitized;
  }

  /**
   * Sanitize email addresses
   */
  static sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      return '';
    }

    const sanitized =
      validator.normalizeEmail(email.trim().toLowerCase()) || '';
    return validator.isEmail(sanitized) ? sanitized : '';
  }

  /**
   * Sanitize phone numbers
   */
  static sanitizePhone(phone: string): string {
    if (!phone || typeof phone !== 'string') {
      return '';
    }

    // Remove all non-digit characters except + for international format
    return phone.replace(/[^\d+]/g, '').substring(0, 15);
  }

  /**
   * Sanitize URLs
   */
  static sanitizeUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      return '';
    }

    const trimmed = url.trim();

    // Check if it's a valid URL
    if (
      !validator.isURL(trimmed, {
        protocols: ['http', 'https'],
        require_protocol: true,
      })
    ) {
      return '';
    }

    return trimmed;
  }

  /**
   * Sanitize file names
   */
  static sanitizeFileName(fileName: string): string {
    if (!fileName || typeof fileName !== 'string') {
      return '';
    }

    return fileName
      .trim()
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace special chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .substring(0, 255); // Limit length
  }

  /**
   * Sanitize JSON input
   */
  static sanitizeJson(input: any): any {
    if (typeof input === 'string') {
      return this.sanitizeText(input);
    }

    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeJson(item));
    }

    if (input && typeof input === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(input)) {
        const sanitizedKey = this.sanitizeText(key);
        sanitized[sanitizedKey] = this.sanitizeJson(value);
      }
      return sanitized;
    }

    return input;
  }

  /**
   * Comprehensive request body sanitization
   */
  static sanitizeRequestBody(body: any): any {
    if (!body) return body;

    const sanitized: any = {};

    for (const [key, value] of Object.entries(body)) {
      const sanitizedKey = this.sanitizeText(key);

      if (typeof value === 'string') {
        // Apply specific sanitization based on field name
        if (key.toLowerCase().includes('email')) {
          sanitized[sanitizedKey] = this.sanitizeEmail(value);
        } else if (key.toLowerCase().includes('phone')) {
          sanitized[sanitizedKey] = this.sanitizePhone(value);
        } else if (
          key.toLowerCase().includes('url') ||
          key.toLowerCase().includes('link')
        ) {
          sanitized[sanitizedKey] = this.sanitizeUrl(value);
        } else if (
          key.toLowerCase().includes('query') ||
          key.toLowerCase().includes('search')
        ) {
          sanitized[sanitizedKey] = this.sanitizeSearchQuery(value);
        } else if (
          key.toLowerCase().includes('html') ||
          key.toLowerCase().includes('content')
        ) {
          sanitized[sanitizedKey] = this.sanitizeHtml(value);
        } else {
          sanitized[sanitizedKey] = this.sanitizeText(value);
        }
      } else if (Array.isArray(value)) {
        sanitized[sanitizedKey] = value.map(item =>
          typeof item === 'string' ? this.sanitizeText(item) : item
        );
      } else if (value && typeof value === 'object') {
        sanitized[sanitizedKey] = this.sanitizeRequestBody(value);
      } else {
        sanitized[sanitizedKey] = value;
      }
    }

    return sanitized;
  }
}

/**
 * Middleware for automatic request sanitization
 */
export const sanitizeRequest = (req: Request, res: any, next: any) => {
  try {
    // Sanitize request body
    if (req.body) {
      req.body = InputSanitizer.sanitizeRequestBody(req.body);
    }

    // Sanitize query parameters
    if (req.query) {
      const sanitizedQuery: any = {};
      for (const [key, value] of Object.entries(req.query)) {
        const sanitizedKey = InputSanitizer.sanitizeText(key);
        if (typeof value === 'string') {
          sanitizedQuery[sanitizedKey] = InputSanitizer.sanitizeText(value);
        } else if (Array.isArray(value)) {
          sanitizedQuery[sanitizedKey] = value.map(v =>
            typeof v === 'string' ? InputSanitizer.sanitizeText(v) : v
          );
        } else {
          sanitizedQuery[sanitizedKey] = value;
        }
      }
      req.query = sanitizedQuery;
    }

    // Sanitize URL parameters
    if (req.params) {
      const sanitizedParams: any = {};
      for (const [key, value] of Object.entries(req.params)) {
        const sanitizedKey = InputSanitizer.sanitizeText(key);
        sanitizedParams[sanitizedKey] =
          typeof value === 'string'
            ? InputSanitizer.sanitizeText(value)
            : value;
      }
      req.params = sanitizedParams;
    }

    next();
  } catch (error) {
    console.error('Error sanitizing request:', error);
    res.status(400).json({
      success: false,
      error: 'Invalid request format',
      message:
        'Request contains invalid data that could not be processed safely.',
    });
  }
};
