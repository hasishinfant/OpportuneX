import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { socialService } from '../services/social.service';

const router = Router();

// Validation schemas
const followUserSchema = z.object({
  followingId: z.string().uuid(),
});

const createDiscussionSchema = z.object({
  opportunityId: z.string().uuid(),
  title: z.string().min(1).max(200),
  content: z.string().min(1),
});

const addCommentSchema = z.object({
  discussionId: z.string().uuid(),
  content: z.string().min(1),
  parentId: z.string().uuid().optional(),
});

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  opportunityId: z.string().uuid().optional(),
  maxMembers: z.number().int().min(2).max(20).default(5),
  isPublic: z.boolean().default(true),
});

const sendMessageSchema = z.object({
  receiverId: z.string().uuid(),
  content: z.string().min(1),
});

const shareContentSchema = z.object({
  contentType: z.enum(['opportunity', 'roadmap']),
  contentId: z.string().uuid(),
  sharedWithId: z.string().uuid().optional(),
  message: z.string().optional(),
  isPublic: z.boolean().default(false),
});

/**
 * GET /api/social/profile/:userId
 * Get public user profile
 */
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const viewerId = (req as any).user?.userId;

    const result = await socialService.getPublicProfile(userId, viewerId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Get public profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/social/follow
 * Follow a user
 */
router.post(
  '/follow',
  authMiddleware,
  validateRequest(followUserSchema),
  async (req, res) => {
    try {
      const { followingId } = req.body;
      const followerId = (req as any).user.userId;

      const result = await socialService.followUser(followerId, followingId);

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      console.error('Follow user error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * DELETE /api/social/follow/:followingId
 * Unfollow a user
 */
router.delete('/follow/:followingId', authMiddleware, async (req, res) => {
  try {
    const { followingId } = req.params;
    const followerId = (req as any).user.userId;

    const result = await socialService.unfollowUser(followerId, followingId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Unfollow user error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/social/followers/:userId
 * Get user's followers
 */
router.get('/followers/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await socialService.getFollowers(userId, page, limit);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/social/following/:userId
 * Get users that a user is following
 */
router.get('/following/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await socialService.getFollowing(userId, page, limit);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/social/feed
 * Get activity feed
 */
router.get('/feed', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await socialService.getActivityFeed(userId, page, limit);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Get activity feed error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/social/discussions/:opportunityId
 * Get discussions for an opportunity
 */
router.get('/discussions/:opportunityId', async (req, res) => {
  try {
    const { opportunityId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await socialService.getDiscussions(
      opportunityId,
      page,
      limit
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Get discussions error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/social/discussions
 * Create a discussion
 */
router.post(
  '/discussions',
  authMiddleware,
  validateRequest(createDiscussionSchema),
  async (req, res) => {
    try {
      const { opportunityId, title, content } = req.body;
      const userId = (req as any).user.userId;

      const result = await socialService.createDiscussion(
        opportunityId,
        userId,
        title,
        content
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('Create discussion error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/social/comments/:discussionId
 * Get comments for a discussion
 */
router.get('/comments/:discussionId', async (req, res) => {
  try {
    const { discussionId } = req.params;

    const result = await socialService.getComments(discussionId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/social/comments
 * Add a comment to a discussion
 */
router.post(
  '/comments',
  authMiddleware,
  validateRequest(addCommentSchema),
  async (req, res) => {
    try {
      const { discussionId, content, parentId } = req.body;
      const userId = (req as any).user.userId;

      const result = await socialService.addComment(
        discussionId,
        userId,
        content,
        parentId
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('Add comment error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/social/teams
 * Get teams
 */
router.get('/teams', async (req, res) => {
  try {
    const opportunityId = req.query.opportunityId as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await socialService.getTeams(opportunityId, page, limit);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Get teams error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/social/teams
 * Create a team
 */
router.post(
  '/teams',
  authMiddleware,
  validateRequest(createTeamSchema),
  async (req, res) => {
    try {
      const { name, description, opportunityId, maxMembers, isPublic } =
        req.body;
      const creatorId = (req as any).user.userId;

      const result = await socialService.createTeam(
        name,
        creatorId,
        description,
        opportunityId,
        maxMembers,
        isPublic
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('Create team error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * POST /api/social/teams/:teamId/join
 * Join a team
 */
router.post('/teams/:teamId/join', authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = (req as any).user.userId;

    const result = await socialService.joinTeam(teamId, userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Join team error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * DELETE /api/social/teams/:teamId/leave
 * Leave a team
 */
router.delete('/teams/:teamId/leave', authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = (req as any).user.userId;

    const result = await socialService.leaveTeam(teamId, userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Leave team error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/social/messages
 * Send a direct message
 */
router.post(
  '/messages',
  authMiddleware,
  validateRequest(sendMessageSchema),
  async (req, res) => {
    try {
      const { receiverId, content } = req.body;
      const senderId = (req as any).user.userId;

      const result = await socialService.sendDirectMessage(
        senderId,
        receiverId,
        content
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/social/messages/:otherUserId
 * Get direct messages with another user
 */
router.get('/messages/:otherUserId', authMiddleware, async (req, res) => {
  try {
    const { otherUserId } = req.params;
    const userId = (req as any).user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;

    const result = await socialService.getDirectMessages(
      userId,
      otherUserId,
      page,
      limit
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/social/share
 * Share content with another user
 */
router.post(
  '/share',
  authMiddleware,
  validateRequest(shareContentSchema),
  async (req, res) => {
    try {
      const { contentType, contentId, sharedWithId, message, isPublic } =
        req.body;
      const userId = (req as any).user.userId;

      const result = await socialService.shareContent(
        userId,
        contentType,
        contentId,
        sharedWithId,
        message,
        isPublic
      );

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.status(201).json(result);
    } catch (error) {
      console.error('Share content error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
      });
    }
  }
);

/**
 * GET /api/social/shared
 * Get shared content for a user
 */
router.get('/shared', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await socialService.getSharedContent(userId, page, limit);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Get shared content error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
