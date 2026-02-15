import type { NextFunction, Request, Response } from 'express';
import type { ValidationChain } from 'express-validator';
import { validationResult } from 'express-validator';
import type { ApiResponse } from '../../types';

/**
 * Enhanced middleware to handle request validation with security checks
 */
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // Log validation failures for security monitoring
    console.warn('Validation failed for request:', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      path: req.path,
      method: req.method,
      errors: errors.array().map(error => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg,
      })),
    });

    const response: ApiResponse<null> = {
      success: false,
      error: 'Validation failed',
      message: 'Request validation failed. Please check your input.',
    };

    res.status(400).json({
      ...response,
      details: errors.array().map(error => ({
        field: error.type === 'field' ? error.path : 'unknown',
        message: error.msg,
        // Don't expose actual values in production for security
        value:
          process.env.NODE_ENV === 'development' && error.type === 'field'
            ? error.value
            : undefined,
      })),
    });
    return;
  }

  next();
};

/**
 * Helper function to run validation chains
 */
export const runValidation = async (
  validations: ValidationChain[],
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Run all validations
  await Promise.all(validations.map(validation => validation.run(req)));

  // Check for validation errors
  validateRequest(req, res, next);
};

/**
 * Middleware factory for validating specific routes
 */
export const validate = (validations: ValidationChain[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    await runValidation(validations, req, res, next);
  };
};

/**
 * Enhanced common validation patterns with security focus
 */
export const commonValidations = {
  pagination: {
    page: {
      in: ['query'],
      isInt: {
        options: { min: 1, max: 1000 },
        errorMessage: 'Page must be between 1 and 1000',
      },
      optional: true,
      toInt: true,
    },
    limit: {
      in: ['query'],
      isInt: {
        options: { min: 1, max: 100 },
        errorMessage: 'Limit must be between 1 and 100',
      },
      optional: true,
      toInt: true,
    },
  },

  search: {
    query: {
      in: ['body', 'query'],
      isString: true,
      trim: true,
      isLength: {
        options: { min: 1, max: 500 },
        errorMessage: 'Search query must be between 1 and 500 characters',
      },
    },
  },

  userId: {
    in: ['params'],
    isUUID: {
      errorMessage: 'User ID must be a valid UUID',
    },
  },

  email: {
    in: ['body'],
    isEmail: {
      errorMessage: 'Must be a valid email address',
    },
    normalizeEmail: true,
    isLength: {
      options: { max: 254 },
      errorMessage: 'Email must not exceed 254 characters',
    },
  },

  password: {
    in: ['body'],
    isLength: {
      options: { min: 8, max: 128 },
      errorMessage: 'Password must be between 8 and 128 characters',
    },
    matches: {
      options:
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
      errorMessage:
        'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character',
    },
  },

  safeText: {
    in: ['body'],
    isString: true,
    trim: true,
    escape: true,
    isLength: {
      options: { max: 1000 },
      errorMessage: 'Text must not exceed 1000 characters',
    },
  },
};
