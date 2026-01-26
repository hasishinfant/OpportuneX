import type { Response } from 'express';
import { Router } from 'express';
import { body, param } from 'express-validator';
import type { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { validate } from '../middleware/validation';
import type { UpdateUserProfileRequest } from '../services/user.service';
import { userService } from '../services/user.service';

const router = Router();

/**
 * Get current user profile
 */
router.get(
  '/profile',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const result = await userService.getUserProfile(userId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  })
);

/**
 * Update user profile
 */
router.put(
  '/profile',
  validate([
    body('name')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    body('phone')
      .optional()
      .isMobilePhone('en-IN')
      .withMessage('Invalid Indian phone number'),
    body('city')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('City must be between 2 and 50 characters'),
    body('state')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('State must be between 2 and 50 characters'),
    body('tier').optional().isIn([2, 3]).withMessage('Tier must be 2 or 3'),
    body('institution')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2, max: 200 })
      .withMessage('Institution must be between 2 and 200 characters'),
    body('degree')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Degree must be between 2 and 100 characters'),
    body('year')
      .optional()
      .isInt({ min: 1, max: 6 })
      .withMessage('Year must be between 1 and 6'),
    body('cgpa')
      .optional()
      .isFloat({ min: 0, max: 10 })
      .withMessage('CGPA must be between 0 and 10'),
    body('technicalSkills')
      .optional()
      .isArray()
      .withMessage('Technical skills must be an array'),
    body('domains')
      .optional()
      .isArray()
      .withMessage('Domains must be an array'),
    body('proficiencyLevel')
      .optional()
      .isIn(['beginner', 'intermediate', 'advanced'])
      .withMessage('Invalid proficiency level'),
    body('preferredOpportunityTypes')
      .optional()
      .isArray()
      .withMessage('Preferred opportunity types must be an array'),
    body('preferredMode')
      .optional()
      .isIn(['online', 'offline', 'hybrid'])
      .withMessage('Invalid preferred mode'),
    body('maxDistance')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Max distance must be a positive integer'),
    body('emailNotifications')
      .optional()
      .isBoolean()
      .withMessage('Email notifications must be a boolean'),
    body('smsNotifications')
      .optional()
      .isBoolean()
      .withMessage('SMS notifications must be a boolean'),
    body('inAppNotifications')
      .optional()
      .isBoolean()
      .withMessage('In-app notifications must be a boolean'),
    body('notificationFrequency')
      .optional()
      .isIn(['immediate', 'daily', 'weekly'])
      .withMessage('Invalid notification frequency'),
    body('notificationTypes')
      .optional()
      .isArray()
      .withMessage('Notification types must be an array'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const updateData: UpdateUserProfileRequest = req.body;

    const result = await userService.updateUserProfile(userId, updateData);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Delete user profile
 */
router.delete(
  '/profile',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const result = await userService.deleteUserProfile(userId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Get user search history
 */
router.get(
  '/search-history',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await userService.getUserSearchHistory(userId, limit);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Clear user search history
 */
router.delete(
  '/search-history',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const result = await userService.clearSearchHistory(userId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Get user favorite opportunities
 */
router.get(
  '/favorites',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const result = await userService.getUserFavorites(userId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Add opportunity to favorites
 */
router.post(
  '/favorites/:opportunityId',
  validate([
    param('opportunityId').isUUID().withMessage('Invalid opportunity ID'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { opportunityId } = req.params;

    const result = await userService.addToFavorites(userId, opportunityId);

    if (result.success) {
      res.status(201).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Remove opportunity from favorites
 */
router.delete(
  '/favorites/:opportunityId',
  validate([
    param('opportunityId').isUUID().withMessage('Invalid opportunity ID'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { opportunityId } = req.params;

    const result = await userService.removeFromFavorites(userId, opportunityId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Get user analytics
 */
router.get(
  '/analytics',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const result = await analyticsService.getUserAnalytics(userId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Get user engagement trends
 */
router.get(
  '/analytics/trends',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const days = parseInt(req.query.days as string) || 30;

    const result = await analyticsService.getUserEngagementTrends(userId, days);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

export { router as userRouter };
