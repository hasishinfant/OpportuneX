import { body, param, query, ValidationChain } from 'express-validator';
import validator from 'validator';

/**
 * Enhanced validation rules for security
 */
export class ValidationRules {
  /**
   * User registration validation
   */
  static userRegistration(): ValidationChain[] {
    return [
      body('email')
        .isEmail()
        .withMessage('Must be a valid email address')
        .normalizeEmail()
        .isLength({ max: 254 })
        .withMessage('Email must not exceed 254 characters'),
      
      body('password')
        .isLength({ min: 8, max: 128 })
        .withMessage('Password must be between 8 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character'),
      
      body('name')
        .isLength({ min: 1, max: 100 })
        .withMessage('Name must be between 1 and 100 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
      
      body('phone')
        .optional()
        .isMobilePhone('any')
        .withMessage('Must be a valid phone number'),
    ];
  }

  /**
   * User login validation
   */
  static userLogin(): ValidationChain[] {
    return [
      body('email')
        .isEmail()
        .withMessage('Must be a valid email address')
        .normalizeEmail(),
      
      body('password')
        .isLength({ min: 1 })
        .withMessage('Password is required'),
    ];
  }

  /**
   * Search query validation
   */
  static searchQuery(): ValidationChain[] {
    return [
      query('q')
        .optional()
        .isLength({ min: 1, max: 500 })
        .withMessage('Search query must be between 1 and 500 characters')
        .matches(/^[^<>'"\\;]*$/)
        .withMessage('Search query contains invalid characters'),
      
      query('type')
        .optional()
        .isIn(['hackathon', 'internship', 'workshop'])
        .withMessage('Type must be hackathon, internship, or workshop'),
      
      query('mode')
        .optional()
        .isIn(['online', 'offline', 'hybrid'])
        .withMessage('Mode must be online, offline, or hybrid'),
      
      query('location')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Location must not exceed 100 characters')
        .matches(/^[a-zA-Z\s,.-]+$/)
        .withMessage('Location contains invalid characters'),
      
      query('skills')
        .optional()
        .custom((value) => {
          if (Array.isArray(value)) {
            return value.every(skill => 
              typeof skill === 'string' && 
              skill.length <= 50 && 
              /^[a-zA-Z0-9\s+#.-]+$/.test(skill)
            );
          }
          return typeof value === 'string' && 
                 value.length <= 50 && 
                 /^[a-zA-Z0-9\s+#.-]+$/.test(value);
        })
        .withMessage('Skills must be valid technology names'),
    ];
  }

  /**
   * Voice search validation
   */
  static voiceSearch(): ValidationChain[] {
    return [
      body('language')
        .isIn(['en', 'hi'])
        .withMessage('Language must be en or hi'),
      
      body('audioData')
        .custom((value) => {
          // Check if it's a valid base64 string or blob
          if (typeof value === 'string') {
            return validator.isBase64(value);
          }
          return false;
        })
        .withMessage('Audio data must be valid base64 encoded'),
    ];
  }

  /**
   * User profile update validation
   */
  static userProfileUpdate(): ValidationChain[] {
    return [
      body('name')
        .optional()
        .isLength({ min: 1, max: 100 })
        .withMessage('Name must be between 1 and 100 characters')
        .matches(/^[a-zA-Z\s'-]+$/)
        .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
      
      body('phone')
        .optional()
        .isMobilePhone('any')
        .withMessage('Must be a valid phone number'),
      
      body('location.city')
        .optional()
        .isLength({ max: 100 })
        .withMessage('City must not exceed 100 characters')
        .matches(/^[a-zA-Z\s.-]+$/)
        .withMessage('City contains invalid characters'),
      
      body('location.state')
        .optional()
        .isLength({ max: 100 })
        .withMessage('State must not exceed 100 characters')
        .matches(/^[a-zA-Z\s.-]+$/)
        .withMessage('State contains invalid characters'),
      
      body('academic.institution')
        .optional()
        .isLength({ max: 200 })
        .withMessage('Institution name must not exceed 200 characters'),
      
      body('academic.degree')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Degree must not exceed 100 characters'),
      
      body('academic.year')
        .optional()
        .isInt({ min: 1, max: 6 })
        .withMessage('Academic year must be between 1 and 6'),
      
      body('skills.technical')
        .optional()
        .isArray({ max: 50 })
        .withMessage('Technical skills must be an array with maximum 50 items')
        .custom((skills) => {
          return skills.every((skill: string) => 
            typeof skill === 'string' && 
            skill.length <= 50 && 
            /^[a-zA-Z0-9\s+#.-]+$/.test(skill)
          );
        })
        .withMessage('Each technical skill must be valid'),
      
      body('preferences.opportunityTypes')
        .optional()
        .isArray()
        .withMessage('Opportunity types must be an array')
        .custom((types) => {
          const validTypes = ['hackathon', 'internship', 'workshop'];
          return types.every((type: string) => validTypes.includes(type));
        })
        .withMessage('Invalid opportunity type'),
    ];
  }

  /**
   * AI roadmap request validation
   */
  static aiRoadmapRequest(): ValidationChain[] {
    return [
      body('opportunityId')
        .isUUID()
        .withMessage('Opportunity ID must be a valid UUID'),
      
      body('targetDate')
        .optional()
        .isISO8601()
        .withMessage('Target date must be a valid ISO 8601 date')
        .custom((date) => {
          const targetDate = new Date(date);
          const now = new Date();
          return targetDate > now;
        })
        .withMessage('Target date must be in the future'),
    ];
  }

  /**
   * Notification preferences validation
   */
  static notificationPreferences(): ValidationChain[] {
    return [
      body('email')
        .optional()
        .isBoolean()
        .withMessage('Email preference must be boolean'),
      
      body('sms')
        .optional()
        .isBoolean()
        .withMessage('SMS preference must be boolean'),
      
      body('inApp')
        .optional()
        .isBoolean()
        .withMessage('In-app preference must be boolean'),
      
      body('frequency')
        .optional()
        .isIn(['immediate', 'daily', 'weekly'])
        .withMessage('Frequency must be immediate, daily, or weekly'),
      
      body('types')
        .optional()
        .isArray()
        .withMessage('Types must be an array')
        .custom((types) => {
          const validTypes = ['deadline', 'new_opportunity', 'roadmap_update'];
          return types.every((type: string) => validTypes.includes(type));
        })
        .withMessage('Invalid notification type'),
    ];
  }

  /**
   * File upload validation
   */
  static fileUpload(): ValidationChain[] {
    return [
      body('fileName')
        .isLength({ min: 1, max: 255 })
        .withMessage('File name must be between 1 and 255 characters')
        .matches(/^[a-zA-Z0-9._-]+$/)
        .withMessage('File name contains invalid characters'),
      
      body('fileType')
        .isIn(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
        .withMessage('Invalid file type'),
      
      body('fileSize')
        .isInt({ min: 1, max: 5242880 }) // 5MB max
        .withMessage('File size must be between 1 byte and 5MB'),
    ];
  }

  /**
   * Pagination validation
   */
  static pagination(): ValidationChain[] {
    return [
      query('page')
        .optional()
        .isInt({ min: 1, max: 1000 })
        .withMessage('Page must be between 1 and 1000')
        .toInt(),
      
      query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100')
        .toInt(),
    ];
  }

  /**
   * UUID parameter validation
   */
  static uuidParam(paramName: string): ValidationChain {
    return param(paramName)
      .isUUID()
      .withMessage(`${paramName} must be a valid UUID`);
  }

  /**
   * Rate limiting validation
   */
  static rateLimitHeaders(): ValidationChain[] {
    return [
      query('_t')
        .optional()
        .isInt({ min: 0 })
        .withMessage('Timestamp must be a valid integer')
        .toInt(),
    ];
  }

  /**
   * Admin operations validation
   */
  static adminOperation(): ValidationChain[] {
    return [
      body('action')
        .isIn(['approve', 'reject', 'delete', 'update'])
        .withMessage('Action must be approve, reject, delete, or update'),
      
      body('reason')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Reason must not exceed 500 characters'),
    ];
  }
}

/**
 * Custom validation helpers
 */
export const customValidators = {
  /**
   * Validate Indian phone number
   */
  isIndianPhone: (value: string) => {
    const indianPhoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
    return indianPhoneRegex.test(value.replace(/\s+/g, ''));
  },

  /**
   * Validate skill name
   */
  isValidSkill: (value: string) => {
    const skillRegex = /^[a-zA-Z0-9\s+#.-]{1,50}$/;
    return skillRegex.test(value);
  },

  /**
   * Validate opportunity type
   */
  isValidOpportunityType: (value: string) => {
    return ['hackathon', 'internship', 'workshop'].includes(value);
  },

  /**
   * Validate location string
   */
  isValidLocation: (value: string) => {
    const locationRegex = /^[a-zA-Z\s,.-]{1,100}$/;
    return locationRegex.test(value);
  },

  /**
   * Validate search query safety
   */
  isSafeSearchQuery: (value: string) => {
    // Check for potential injection patterns
    const dangerousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /['"]\s*;\s*\w+/,
      /union\s+select/i,
      /drop\s+table/i,
      /delete\s+from/i,
      /insert\s+into/i,
      /update\s+\w+\s+set/i,
    ];

    return !dangerousPatterns.some(pattern => pattern.test(value));
  },
};