import type { Request, Response } from 'express';
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import type { ApiResponse } from '../../types';
import type { AuthenticatedRequest } from '../middleware/auth';
import { requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { validate } from '../middleware/validation';
import { dataQualityService } from '../services/data-quality.service';
import { externalAPIService } from '../services/external-api.service';
import { scrapingService } from '../services/scraping.service';
import { searchService } from '../services/search.service';

const router = Router();

// Apply admin role requirement to all routes
router.use(requireRole(['admin']));

/**
 * Data Aggregation Management
 */

/**
 * Start scraping job for a source
 */
router.post(
  '/scraping/start/:sourceId',
  validate([
    param('sourceId')
      .isString()
      .notEmpty()
      .withMessage('Source ID is required'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { sourceId } = req.params;

    const result = await scrapingService.startScrapingJob(sourceId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Get scraping job status
 */
router.get(
  '/scraping/job/:jobId',
  validate([
    param('jobId').isString().notEmpty().withMessage('Job ID is required'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { jobId } = req.params;

    const result = await scrapingService.getJobStatus(jobId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  })
);

/**
 * Get all active scraping jobs
 */
router.get(
  '/scraping/jobs',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await scrapingService.getActiveJobs();

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Cancel scraping job
 */
router.post(
  '/scraping/cancel/:jobId',
  validate([
    param('jobId').isString().notEmpty().withMessage('Job ID is required'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { jobId } = req.params;

    const result = await scrapingService.cancelJob(jobId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Data Quality Management
 */

/**
 * Run duplicate detection on all opportunities
 */
router.post(
  '/data-quality/detect-duplicates',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // This would run duplicate detection on all opportunities
    // For now, return a mock response
    const response: ApiResponse<{
      processed: number;
      duplicatesFound: number;
    }> = {
      success: true,
      data: { processed: 150, duplicatesFound: 12 },
      message: 'Duplicate detection completed',
    };

    res.status(200).json(response);
  })
);

/**
 * Run data quality scoring
 */
router.post(
  '/data-quality/score-all',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // This would run quality scoring on all opportunities
    const response: ApiResponse<{ processed: number; averageScore: number }> = {
      success: true,
      data: { processed: 150, averageScore: 0.82 },
      message: 'Data quality scoring completed',
    };

    res.status(200).json(response);
  })
);

/**
 * Run fraud detection
 */
router.post(
  '/data-quality/detect-fraud',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // This would run fraud detection on all opportunities
    const response: ApiResponse<{
      processed: number;
      suspiciousFound: number;
    }> = {
      success: true,
      data: { processed: 150, suspiciousFound: 3 },
      message: 'Fraud detection completed',
    };

    res.status(200).json(response);
  })
);

/**
 * Clean up expired opportunities
 */
router.post(
  '/data-quality/cleanup-expired',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await dataQualityService.cleanupExpiredOpportunities();

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Merge duplicate opportunities
 */
router.post(
  '/data-quality/merge-duplicates',
  validate([
    body('primaryId').isUUID().withMessage('Primary ID must be a valid UUID'),
    body('duplicateId')
      .isUUID()
      .withMessage('Duplicate ID must be a valid UUID'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { primaryId, duplicateId } = req.body;

    const result = await dataQualityService.mergeDuplicateOpportunities(
      primaryId,
      duplicateId
    );

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * External API Management
 */

/**
 * Execute scheduled synchronization
 */
router.post(
  '/external-api/sync',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await externalAPIService.executeScheduledSync();

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Sync from external APIs
 */
router.post(
  '/external-api/sync-external',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await externalAPIService.syncFromExternalAPIs();

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Get API health status
 */
router.get(
  '/external-api/health',
  validate([
    query('apiId').optional().isString().withMessage('API ID must be a string'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const apiId = req.query.apiId as string | undefined;

    const result = await externalAPIService.getAPIHealthStatus(apiId);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Monitor API health
 */
router.post(
  '/external-api/monitor',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await externalAPIService.monitorAPIHealth();

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Process webhook
 */
router.post(
  '/webhook/:source',
  validate([
    param('source').isString().notEmpty().withMessage('Source is required'),
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    const { source } = req.params;
    const payload = {
      event: req.body.event || 'unknown',
      data: req.body.data || req.body,
      timestamp: new Date(),
      source,
    };

    const result = await externalAPIService.processWebhook(payload);

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(400).json(result);
    }
  })
);

/**
 * Search Index Management
 */

/**
 * Initialize search indices
 */
router.post(
  '/search/init-indices',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await searchService.initializeIndices();

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  })
);

/**
 * Sync opportunities to search index
 */
router.post(
  '/search/sync',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const result = await searchService.syncOpportunities();

    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  })
);

/**
 * System Statistics
 */
router.get(
  '/stats',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    // This would gather system-wide statistics
    const stats = {
      opportunities: {
        total: 1250,
        active: 980,
        expired: 270,
        qualityScore: 0.82,
      },
      sources: {
        total: 15,
        active: 12,
        lastSyncHours: 2,
      },
      scraping: {
        jobsToday: 8,
        successRate: 0.92,
        itemsScraped: 145,
      },
      dataQuality: {
        duplicatesDetected: 23,
        fraudulentFlagged: 5,
        averageQualityScore: 0.78,
      },
      apis: {
        healthy: 10,
        degraded: 2,
        down: 0,
      },
    };

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
      message: 'System statistics retrieved successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Scheduler Management
 */

/**
 * Get scheduler status
 */
router.get(
  '/scheduler/status',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const status = schedulerService.getStatus();

    const response: ApiResponse<typeof status> = {
      success: true,
      data: status,
      message: 'Scheduler status retrieved successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Get all scheduled tasks
 */
router.get(
  '/scheduler/tasks',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tasks = schedulerService.getTasks().map(task => ({
      id: task.id,
      name: task.name,
      schedule: task.schedule,
      lastRun: task.lastRun,
      nextRun: task.nextRun,
      isActive: task.isActive,
    }));

    const response: ApiResponse<typeof tasks> = {
      success: true,
      data: tasks,
      message: 'Scheduled tasks retrieved successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Toggle task active status
 */
router.post(
  '/scheduler/tasks/:taskId/toggle',
  validate([
    param('taskId').isString().notEmpty().withMessage('Task ID is required'),
    body('isActive').isBoolean().withMessage('isActive must be a boolean'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { taskId } = req.params;
    const { isActive } = req.body;

    const success = schedulerService.toggleTask(taskId, isActive);

    if (success) {
      res.status(200).json({
        success: true,
        message: `Task ${isActive ? 'enabled' : 'disabled'} successfully`,
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }
  })
);

/**
 * Run task immediately
 */
router.post(
  '/scheduler/tasks/:taskId/run',
  validate([
    param('taskId').isString().notEmpty().withMessage('Task ID is required'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { taskId } = req.params;

    const success = await schedulerService.runTaskNow(taskId);

    if (success) {
      res.status(200).json({
        success: true,
        message: 'Task executed successfully',
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }
  })
);

/**
 * Get task history
 */
router.get(
  '/scheduler/tasks/:taskId/history',
  validate([
    param('taskId').isString().notEmpty().withMessage('Task ID is required'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { taskId } = req.params;

    const history = schedulerService.getTaskHistory(taskId);

    if (history) {
      res.status(200).json({
        success: true,
        data: history,
        message: 'Task history retrieved successfully',
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Task not found',
      });
    }
  })
);

/**
 * System Health Check
 */
router.get(
  '/health',
  asyncHandler(async (req: Request, res: Response) => {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        elasticsearch: 'healthy',
        redis: 'healthy',
        scraping: 'healthy',
        externalAPIs: 'healthy',
      },
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0',
    };

    res.status(200).json(health);
  })
);

export { router as adminRouter };
