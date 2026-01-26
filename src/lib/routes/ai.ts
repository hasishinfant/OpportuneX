import type { Response } from 'express';
import { Router } from 'express';
import { body, param } from 'express-validator';
import type { ApiResponse, RoadmapResponse } from '../../types';
import type { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { validate } from '../middleware/validation';
import type { RoadmapRequest } from '../services/ai-instructor.service';
import { aiInstructorService } from '../services/ai-instructor.service';
import { userService } from '../services/user.service';

const router = Router();

/**
 * Generate AI roadmap for an opportunity
 */
router.post(
  '/roadmap',
  validate([
    body('opportunityId').isUUID().withMessage('Invalid opportunity ID'),
    body('targetDate')
      .optional()
      .isISO8601()
      .withMessage('Target date must be a valid ISO 8601 date'),
    body('customGoals')
      .optional()
      .isArray()
      .withMessage('Custom goals must be an array'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { opportunityId, targetDate, customGoals } = req.body;

    // Get user profile from database
    const userProfileResult = await userService.getUserProfile(userId);
    if (!userProfileResult.success) {
      return res.status(404).json({
        success: false,
        error: 'User profile not found',
      });
    }

    const roadmapRequest: RoadmapRequest = {
      opportunityId,
      userProfile: userProfileResult.data!,
      targetDate: targetDate ? new Date(targetDate) : undefined,
      customGoals,
    };

    // Generate roadmap using AI Instructor Service
    const result = await aiInstructorService.generateRoadmap(roadmapRequest);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate roadmap',
      });
    }

    const response: ApiResponse<RoadmapResponse> = {
      success: true,
      data: result.data!,
      message: result.message || 'AI roadmap generated successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Get existing roadmap for user
 */
router.get(
  '/roadmap/:opportunityId',
  validate([
    param('opportunityId').isUUID().withMessage('Invalid opportunity ID'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { opportunityId } = req.params;

    // Get user roadmaps from AI Instructor Service
    const result = await aiInstructorService.getUserRoadmaps(userId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to retrieve roadmaps',
      });
    }

    // Find roadmap for specific opportunity
    const roadmap = result.data!.find(r => r.opportunityId === opportunityId);

    if (!roadmap) {
      return res.status(404).json({
        success: false,
        error: 'Roadmap not found for this opportunity',
      });
    }

    const response: ApiResponse<typeof roadmap> = {
      success: true,
      data: roadmap,
      message: 'Roadmap retrieved successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Get all roadmaps for user
 */
router.get(
  '/roadmaps',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    // Get all user roadmaps from AI Instructor Service
    const result = await aiInstructorService.getUserRoadmaps(userId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to retrieve roadmaps',
      });
    }

    const response: ApiResponse<typeof result.data> = {
      success: true,
      data: result.data!,
      message: result.message || 'Roadmaps retrieved successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Update roadmap based on progress and feedback
 */
router.patch(
  '/roadmap/:roadmapId',
  validate([
    param('roadmapId').isString().withMessage('Invalid roadmap ID'),
    body('completedTasks')
      .optional()
      .isArray()
      .withMessage('Completed tasks must be an array'),
    body('strugglingWith')
      .optional()
      .isArray()
      .withMessage('Struggling with must be an array'),
    body('additionalGoals')
      .optional()
      .isArray()
      .withMessage('Additional goals must be an array'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const roadmapId = Array.isArray(req.params.roadmapId)
      ? req.params.roadmapId[0]
      : req.params.roadmapId;
    const { completedTasks, strugglingWith, additionalGoals } = req.body;

    // Update roadmap using AI Instructor Service
    const result = await aiInstructorService.updateRoadmap(roadmapId, {
      completedTasks: completedTasks || [],
      strugglingWith: strugglingWith || [],
      additionalGoals: additionalGoals || [],
    });

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to update roadmap',
      });
    }

    const response: ApiResponse<typeof result.data> = {
      success: true,
      data: result.data!,
      message: result.message || 'Roadmap updated successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Update roadmap progress
 */
router.patch(
  '/roadmap/:roadmapId/progress',
  validate([
    param('roadmapId').isString().withMessage('Invalid roadmap ID'),
    body('taskId').isString().withMessage('Task ID is required'),
    body('completed')
      .isBoolean()
      .withMessage('Completed status must be a boolean'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const roadmapId = Array.isArray(req.params.roadmapId)
      ? req.params.roadmapId[0]
      : req.params.roadmapId;
    const { taskId, completed } = req.body;

    // Update progress using AI Instructor Service
    const result = await aiInstructorService.trackProgress(
      roadmapId,
      taskId,
      completed
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to update progress',
      });
    }

    const response: ApiResponse<null> = {
      success: true,
      message: result.message || 'Roadmap progress updated successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Get AI recommendations based on user profile
 */
router.get(
  '/recommendations',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    // TODO: Implement actual AI recommendations
    const mockRecommendations = [
      {
        id: 'rec-1',
        type: 'opportunity',
        title: 'AI Hackathon 2024',
        reason: 'Matches your machine learning interests',
        confidence: 0.85,
      },
      {
        id: 'rec-2',
        type: 'skill',
        title: 'Learn TensorFlow',
        reason: 'Popular skill for AI opportunities',
        confidence: 0.78,
      },
    ];

    const response: ApiResponse<typeof mockRecommendations> = {
      success: true,
      data: mockRecommendations,
      message: 'AI recommendations retrieved successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Chat with AI instructor
 */
router.post(
  '/chat',
  validate([
    body('message')
      .isString()
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message must be between 1 and 1000 characters'),
    body('context')
      .optional()
      .isObject()
      .withMessage('Context must be an object'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { message, context } = req.body;

    // TODO: Implement actual AI chat functionality
    const mockChatResponse = {
      response: `I understand you're asking about "${message}". Based on your profile, I'd recommend focusing on practical projects to strengthen your skills.`,
      suggestions: [
        'Tell me more about your current skill level',
        'What specific areas would you like to improve?',
        'Would you like me to create a learning plan?',
      ],
      confidence: 0.9,
    };

    const response: ApiResponse<typeof mockChatResponse> = {
      success: true,
      data: mockChatResponse,
      message: 'AI chat response generated successfully',
    };

    res.status(200).json(response);
  })
);

export { router as aiRouter };
