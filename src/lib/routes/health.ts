import type { Request, Response } from 'express';
import { Router } from 'express';
import type { ApiResponse } from '../../types';
import { asyncHandler } from '../middleware/error-handler';

const router = Router();

/**
 * Basic health check endpoint
 */
router.get(
  '/',
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime: `${Date.now() - startTime}ms`,
      services: {
        database: 'checking',
        redis: 'checking',
        elasticsearch: 'checking',
      },
    };

    const response: ApiResponse<typeof healthData> = {
      success: true,
      data: healthData,
      message: 'API Gateway is healthy',
    };

    res.status(200).json(response);
  })
);

/**
 * Detailed health check with service status
 */
router.get(
  '/detailed',
  asyncHandler(async (req: Request, res: Response) => {
    const startTime = Date.now();

    // TODO: Implement actual service health checks
    const services = {
      database: {
        status: 'healthy',
        responseTime: '5ms',
        lastChecked: new Date().toISOString(),
      },
      redis: {
        status: 'healthy',
        responseTime: '2ms',
        lastChecked: new Date().toISOString(),
      },
      elasticsearch: {
        status: 'healthy',
        responseTime: '8ms',
        lastChecked: new Date().toISOString(),
      },
      external_apis: {
        openai: process.env.OPENAI_API_KEY ? 'configured' : 'not_configured',
        sendgrid: process.env.SENDGRID_API_KEY
          ? 'configured'
          : 'not_configured',
        twilio: process.env.TWILIO_ACCOUNT_SID
          ? 'configured'
          : 'not_configured',
      },
    };

    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      responseTime: `${Date.now() - startTime}ms`,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      services,
    };

    const response: ApiResponse<typeof healthData> = {
      success: true,
      data: healthData,
      message: 'Detailed health check completed',
    };

    res.status(200).json(response);
  })
);

/**
 * Readiness probe for Kubernetes
 */
router.get(
  '/ready',
  asyncHandler(async (req: Request, res: Response) => {
    // TODO: Check if all required services are ready
    const isReady = true; // Placeholder

    if (isReady) {
      res.status(200).json({
        status: 'ready',
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
      });
    }
  })
);

/**
 * Liveness probe for Kubernetes
 */
router.get(
  '/live',
  asyncHandler(async (req: Request, res: Response) => {
    res.status(200).json({
      status: 'alive',
      timestamp: new Date().toISOString(),
    });
  })
);

export { router as healthRouter };
