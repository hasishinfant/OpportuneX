import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { advancedAnalyticsService } from '../services/advanced-analytics.service';

const router = Router();

// Validation schemas
const dateRangeSchema = z.object({
  start: z.string().transform(str => new Date(str)),
  end: z.string().transform(str => new Date(str)),
});

const exportSchema = z.object({
  format: z.enum(['csv', 'json', 'pdf']),
  dateRange: dateRangeSchema,
  metrics: z.array(z.string()).optional(),
});

/**
 * GET /analytics/dashboard
 * Get comprehensive dashboard metrics
 * Admin only
 */
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    // Check if user is admin
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const { start, end } = req.query;
    const dateRange =
      start && end
        ? {
            start: new Date(start as string),
            end: new Date(end as string),
          }
        : undefined;

    const result = await advancedAnalyticsService.getDashboardMetrics(
      req.user.id,
      dateRange
    );

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  } catch (error) {
    console.error('Dashboard metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard metrics',
    });
  }
});

/**
 * GET /analytics/user-engagement
 * Get user engagement metrics
 * Admin only
 */
router.get('/user-engagement', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const { start, end } = req.query;
    const dateRange = {
      start: start
        ? new Date(start as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: end ? new Date(end as string) : new Date(),
    };

    const result = await advancedAnalyticsService.getDashboardMetrics(
      req.user.id,
      dateRange
    );

    if (!result.success || !result.data) {
      return res.status(500).json(result);
    }

    res.json({
      success: true,
      data: result.data.userEngagement,
    });
  } catch (error) {
    console.error('User engagement metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve user engagement metrics',
    });
  }
});

/**
 * GET /analytics/opportunities
 * Get opportunity analytics
 * Admin only
 */
router.get('/opportunities', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const { start, end } = req.query;
    const dateRange = {
      start: start
        ? new Date(start as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: end ? new Date(end as string) : new Date(),
    };

    const result = await advancedAnalyticsService.getDashboardMetrics(
      req.user.id,
      dateRange
    );

    if (!result.success || !result.data) {
      return res.status(500).json(result);
    }

    res.json({
      success: true,
      data: result.data.opportunityAnalytics,
    });
  } catch (error) {
    console.error('Opportunity analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve opportunity analytics',
    });
  }
});

/**
 * GET /analytics/platform-usage
 * Get platform usage statistics
 * Admin only
 */
router.get('/platform-usage', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const { start, end } = req.query;
    const dateRange = {
      start: start
        ? new Date(start as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: end ? new Date(end as string) : new Date(),
    };

    const result = await advancedAnalyticsService.getDashboardMetrics(
      req.user.id,
      dateRange
    );

    if (!result.success || !result.data) {
      return res.status(500).json(result);
    }

    res.json({
      success: true,
      data: result.data.platformUsage,
    });
  } catch (error) {
    console.error('Platform usage stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve platform usage statistics',
    });
  }
});

/**
 * GET /analytics/insights
 * Get personalized insights
 * Admin only
 */
router.get('/insights', authMiddleware, async (req, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
      });
    }

    const { start, end } = req.query;
    const dateRange = {
      start: start
        ? new Date(start as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: end ? new Date(end as string) : new Date(),
    };

    const result = await advancedAnalyticsService.getDashboardMetrics(
      req.user.id,
      dateRange
    );

    if (!result.success || !result.data) {
      return res.status(500).json(result);
    }

    res.json({
      success: true,
      data: result.data.insights,
    });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve insights',
    });
  }
});

/**
 * POST /analytics/export
 * Export analytics data
 * Admin only
 */
router.post(
  '/export',
  authMiddleware,
  validateRequest(exportSchema),
  async (req, res) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Admin access required',
        });
      }

      const result = await advancedAnalyticsService.exportAnalytics(
        req.body,
        req.user.id
      );

      if (!result.success) {
        return res.status(500).json(result);
      }

      // Set appropriate headers based on format
      const { format } = req.body;
      const filename = `analytics-${Date.now()}.${format}`;

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${filename}"`
        );
      } else if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader(
          'Content-Disposition',
          `attachment; filename="${filename}"`
        );
      }

      res.send(result.data);
    } catch (error) {
      console.error('Export analytics error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export analytics',
      });
    }
  }
);

export default router;
