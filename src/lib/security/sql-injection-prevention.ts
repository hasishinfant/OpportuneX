import { PrismaClient } from '@prisma/client';
import type { Request } from 'express';

/**
 * SQL Injection Prevention utilities
 */
export class SQLInjectionPrevention {
  /**
   * Sanitize SQL query parameters
   */
  static sanitizeQueryParams(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (typeof value === 'string') {
        // Remove SQL injection patterns
        sanitized[key] = value
          .replace(/[';\\]/g, '') // Remove semicolons and backslashes
          .replace(/--/g, '') // Remove SQL comments
          .replace(/\/\*/g, '') // Remove block comment start
          .replace(/\*\//g, '') // Remove block comment end
          .replace(/\bUNION\b/gi, '') // Remove UNION statements
          .replace(/\bSELECT\b/gi, '') // Remove SELECT statements
          .replace(/\bINSERT\b/gi, '') // Remove INSERT statements
          .replace(/\bUPDATE\b/gi, '') // Remove UPDATE statements
          .replace(/\bDELETE\b/gi, '') // Remove DELETE statements
          .replace(/\bDROP\b/gi, '') // Remove DROP statements
          .replace(/\bALTER\b/gi, '') // Remove ALTER statements
          .replace(/\bCREATE\b/gi, '') // Remove CREATE statements
          .replace(/\bEXEC\b/gi, '') // Remove EXEC statements
          .replace(/\bEXECUTE\b/gi, '') // Remove EXECUTE statements
          .trim();
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item => 
          typeof item === 'string' ? this.sanitizeQueryParams({ item }).item : item
        );
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Validate SQL query safety
   */
  static isSafeQuery(query: string): boolean {
    const dangerousPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|EXEC|EXECUTE)\b)/gi,
      /(\b(UNION|OR|AND)\s+\d+\s*=\s*\d+)/gi,
      /(;|\-\-|\/\*|\*\/)/g,
      /(\b(SCRIPT|JAVASCRIPT|VBSCRIPT)\b)/gi,
      /(\b(ONLOAD|ONERROR|ONCLICK)\b)/gi,
    ];

    return !dangerousPatterns.some(pattern => pattern.test(query));
  }

  /**
   * Create safe database query builder
   */
  static createSafeQueryBuilder(prisma: PrismaClient) {
    return {
      /**
       * Safe user search with parameterized queries
       */
      searchUsers: async (searchTerm: string, limit: number = 10) => {
        // Validate inputs
        if (!this.isSafeQuery(searchTerm)) {
          throw new Error('Invalid search query detected');
        }

        const sanitizedTerm = searchTerm.trim().substring(0, 100);
        const safeLimit = Math.min(Math.max(1, limit), 100);

        return prisma.user.findMany({
          where: {
            OR: [
              { name: { contains: sanitizedTerm, mode: 'insensitive' } },
              { email: { contains: sanitizedTerm, mode: 'insensitive' } },
            ],
          },
          take: safeLimit,
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        });
      },

      /**
       * Safe opportunity search with parameterized queries
       */
      searchOpportunities: async (filters: {
        query?: string;
        type?: string;
        skills?: string[];
        location?: string;
        limit?: number;
        offset?: number;
      }) => {
        const {
          query = '',
          type,
          skills = [],
          location,
          limit = 20,
          offset = 0,
        } = filters;

        // Validate all inputs
        if (query && !this.isSafeQuery(query)) {
          throw new Error('Invalid search query detected');
        }

        const sanitizedQuery = query.trim().substring(0, 500);
        const safeLimit = Math.min(Math.max(1, limit), 100);
        const safeOffset = Math.max(0, offset);

        const whereClause: any = {
          isActive: true,
        };

        // Add search query filter
        if (sanitizedQuery) {
          whereClause.OR = [
            { title: { contains: sanitizedQuery, mode: 'insensitive' } },
            { description: { contains: sanitizedQuery, mode: 'insensitive' } },
            { tags: { hasSome: [sanitizedQuery] } },
          ];
        }

        // Add type filter
        if (type && ['hackathon', 'internship', 'workshop'].includes(type)) {
          whereClause.type = type;
        }

        // Add skills filter
        if (skills.length > 0) {
          const sanitizedSkills = skills
            .filter(skill => typeof skill === 'string' && skill.length <= 50)
            .map(skill => skill.trim())
            .slice(0, 10); // Limit to 10 skills

          if (sanitizedSkills.length > 0) {
            whereClause.requirements = {
              path: ['skills'],
              array_contains: sanitizedSkills,
            };
          }
        }

        // Add location filter
        if (location && location.length <= 100) {
          const sanitizedLocation = location.trim();
          whereClause.OR = whereClause.OR || [];
          whereClause.OR.push({
            details: {
              path: ['location'],
              string_contains: sanitizedLocation,
            },
          });
        }

        return prisma.opportunity.findMany({
          where: whereClause,
          take: safeLimit,
          skip: safeOffset,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            organizer: true,
            requirements: true,
            details: true,
            timeline: true,
            externalUrl: true,
            tags: true,
            createdAt: true,
          },
        });
      },

      /**
       * Safe user profile update
       */
      updateUserProfile: async (userId: string, updates: Record<string, any>) => {
        // Validate UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userId)) {
          throw new Error('Invalid user ID format');
        }

        // Sanitize updates
        const sanitizedUpdates = this.sanitizeQueryParams(updates);

        // Only allow specific fields to be updated
        const allowedFields = [
          'name', 'phone', 'location', 'academic', 'skills', 'preferences'
        ];

        const safeUpdates: any = {};
        for (const [key, value] of Object.entries(sanitizedUpdates)) {
          if (allowedFields.includes(key)) {
            safeUpdates[key] = value;
          }
        }

        return prisma.user.update({
          where: { id: userId },
          data: {
            ...safeUpdates,
            updatedAt: new Date(),
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            location: true,
            academic: true,
            skills: true,
            preferences: true,
            updatedAt: true,
          },
        });
      },

      /**
       * Safe search history logging
       */
      logSearchQuery: async (userId: string, query: string, filters: any) => {
        // Validate inputs
        if (!this.isSafeQuery(query)) {
          return; // Don't log potentially malicious queries
        }

        const sanitizedQuery = query.trim().substring(0, 500);
        const sanitizedFilters = this.sanitizeQueryParams(filters);

        return prisma.userSearch.create({
          data: {
            userId,
            query: sanitizedQuery,
            filters: sanitizedFilters,
            timestamp: new Date(),
          },
        });
      },
    };
  }

  /**
   * Middleware to prevent SQL injection in request parameters
   */
  static preventSQLInjection = (req: Request, res: any, next: any) => {
    try {
      // Check query parameters
      if (req.query) {
        for (const [key, value] of Object.entries(req.query)) {
          if (typeof value === 'string' && !this.isSafeQuery(value)) {
            console.warn('Potential SQL injection attempt detected:', {
              ip: req.ip,
              userAgent: req.get('User-Agent'),
              path: req.path,
              parameter: key,
              value: value.substring(0, 100), // Log only first 100 chars
            });

            return res.status(400).json({
              success: false,
              error: 'Invalid request',
              message: 'Request contains potentially unsafe content.',
            });
          }
        }
      }

      // Check body parameters
      if (req.body) {
        const checkObject = (obj: any, path: string = '') => {
          for (const [key, value] of Object.entries(obj)) {
            const currentPath = path ? `${path}.${key}` : key;
            
            if (typeof value === 'string' && !this.isSafeQuery(value)) {
              console.warn('Potential SQL injection attempt detected in body:', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
                path: req.path,
                parameter: currentPath,
                value: value.substring(0, 100),
              });

              throw new Error('Unsafe content detected');
            } else if (value && typeof value === 'object' && !Array.isArray(value)) {
              checkObject(value, currentPath);
            } else if (Array.isArray(value)) {
              value.forEach((item, index) => {
                if (typeof item === 'string' && !this.isSafeQuery(item)) {
                  throw new Error('Unsafe content detected in array');
                } else if (item && typeof item === 'object') {
                  checkObject(item, `${currentPath}[${index}]`);
                }
              });
            }
          }
        };

        try {
          checkObject(req.body);
        } catch (error) {
          return res.status(400).json({
            success: false,
            error: 'Invalid request',
            message: 'Request contains potentially unsafe content.',
          });
        }
      }

      next();
    } catch (error) {
      console.error('Error in SQL injection prevention middleware:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: 'An error occurred while processing your request.',
      });
    }
  };

  /**
   * Database connection security configuration
   */
  static getDatabaseSecurityConfig() {
    return {
      // Connection pool settings
      connectionLimit: 10,
      acquireTimeout: 60000,
      timeout: 60000,
      
      // Security settings
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: true,
        ca: process.env.DATABASE_CA_CERT,
      } : false,
      
      // Query timeout
      statement_timeout: 30000,
      
      // Prevent multiple statements
      multipleStatements: false,
      
      // Escape query values
      escapeQueryValues: true,
    };
  }
}

/**
 * Prisma middleware for additional security
 */
export const createSecurePrismaMiddleware = () => {
  return async (params: any, next: any) => {
    // Log all database operations in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Database operation:', {
        model: params.model,
        action: params.action,
        args: JSON.stringify(params.args, null, 2).substring(0, 200),
      });
    }

    // Add security checks for sensitive operations
    if (['delete', 'deleteMany', 'update', 'updateMany'].includes(params.action)) {
      // Ensure where clause exists for delete/update operations
      if (!params.args.where) {
        throw new Error('Delete/Update operations must include where clause');
      }

      // Log sensitive operations
      console.warn('Sensitive database operation:', {
        model: params.model,
        action: params.action,
        timestamp: new Date().toISOString(),
      });
    }

    const result = await next(params);

    // Log query execution time for performance monitoring
    const executionTime = Date.now() - params.timestamp;
    if (executionTime > 1000) {
      console.warn('Slow database query detected:', {
        model: params.model,
        action: params.action,
        executionTime: `${executionTime}ms`,
      });
    }

    return result;
  };
};