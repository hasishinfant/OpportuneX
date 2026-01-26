import type { Request, Response } from 'express';
import { Router } from 'express';
import { body, query } from 'express-validator';
import type { ApiResponse, SearchRequest } from '../../types';
import type { AuthenticatedRequest } from '../middleware/auth';
import { optionalAuthMiddleware } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { validate } from '../middleware/validation';
import { analyticsService } from '../services/analytics.service';
import { searchService } from '../services/search.service';

const router = Router();

// Apply optional auth to all search routes
router.use(optionalAuthMiddleware);

/**
 * Search opportunities endpoint
 */
router.post(
  '/opportunities',
  validate([
    body('query')
      .isString()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Search query must be between 1 and 500 characters'),
    body('filters.skills')
      .optional()
      .isArray()
      .withMessage('Skills filter must be an array'),
    body('filters.organizerType')
      .optional()
      .isIn(['corporate', 'startup', 'government', 'academic'])
      .withMessage('Invalid organizer type'),
    body('filters.mode')
      .optional()
      .isIn(['online', 'offline', 'hybrid'])
      .withMessage('Invalid mode'),
    body('filters.type')
      .optional()
      .isIn(['hackathon', 'internship', 'workshop'])
      .withMessage('Invalid opportunity type'),
    body('pagination.page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    body('pagination.limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const searchRequest: SearchRequest = {
      query: req.body.query,
      filters: req.body.filters,
      pagination: req.body.pagination || { page: 1, limit: 20 },
      userId: req.user?.id,
    };

    const result = await searchService.searchOpportunities(searchRequest);

    // Track search analytics if user is authenticated
    if (req.user?.id && result.success && result.data) {
      await analyticsService.trackSearch(
        req.user.id,
        searchRequest.query,
        searchRequest.filters,
        result.data.totalCount
      );
    }

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Get search suggestions endpoint
 */
router.get(
  '/suggestions',
  validate([
    query('q')
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Query must be between 1 and 100 characters'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 10 })
      .withMessage('Limit must be between 1 and 10'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const query = req.query.q as string;
    const limit = parseInt(req.query.limit as string) || 5;

    const result = await searchService.getSearchSuggestions(query, limit);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Voice search endpoint
 */
router.post(
  '/voice',
  validate([
    body('language')
      .isIn(['en', 'hi'])
      .withMessage('Language must be either "en" or "hi"'),
    body('audioData').notEmpty().withMessage('Audio data is required'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { audioData, language } = req.body;

    // TODO: Implement actual voice processing
    const mockVoiceResponse = {
      transcription: 'Find AI hackathons in Mumbai',
      searchQuery: 'AI hackathons Mumbai',
      confidence: 0.95,
      followUpQuestions: [
        'Would you like to filter by skill level?',
        'Are you interested in remote opportunities?',
      ],
    };

    const response: ApiResponse<typeof mockVoiceResponse> = {
      success: true,
      data: mockVoiceResponse,
      message: 'Voice search processed successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Popular searches endpoint
 */
router.get(
  '/popular',
  asyncHandler(async (req: Request, res: Response) => {
    // TODO: Get popular searches from analytics
    const popularSearches = [
      'AI hackathon',
      'remote internship',
      'web development workshop',
      'machine learning competition',
      'startup internship',
      'data science hackathon',
      'mobile app development',
      'blockchain workshop',
    ];

    const response: ApiResponse<string[]> = {
      success: true,
      data: popularSearches,
      message: 'Popular searches retrieved successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Initialize search indices (admin endpoint)
 */
router.post(
  '/admin/init-indices',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await searchService.initializeIndices();

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  })
);

/**
 * Sync opportunities from database to search index (admin endpoint)
 */
router.post(
  '/admin/sync',
  asyncHandler(async (req: Request, res: Response) => {
    const result = await searchService.syncOpportunities();

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  })
);

export { router as searchRouter };
