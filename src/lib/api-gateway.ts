import compression from 'compression';
import cors from 'cors';
import type { Express, Request, Response } from 'express';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import { authMiddleware, optionalAuthMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error-handler';
import { loggingMiddleware } from './middleware/logging';
import { validateRequest } from './middleware/validation';
import { adminRouter } from './routes/admin';
import { aiRouter } from './routes/ai';
import analyticsRouter from './routes/analytics';
import { authRouter } from './routes/auth';
import developerRouter from './routes/developer';
import gamificationRouter from './routes/gamification';
import { healthRouter } from './routes/health';
import { notificationRouter } from './routes/notification';
import oauthRouter from './routes/oauth';
import { searchRouter } from './routes/search';
import socialRouter from './routes/social';
import { userRouter } from './routes/user';
import { voiceRouter } from './routes/voice';

export interface ApiGatewayConfig {
  port: number;
  corsOrigins: string[];
  rateLimitWindowMs: number;
  rateLimitMaxRequests: number;
  enableLogging: boolean;
  enableCompression: boolean;
  apiVersion: string;
}

export class ApiGateway {
  private app: Express;
  private config: ApiGatewayConfig;

  constructor(config: ApiGatewayConfig) {
    this.app = express();
    this.config = config;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    // Security middleware
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        },
        crossOriginEmbedderPolicy: false,
      })
    );

    // CORS configuration
    this.app.use(
      cors({
        origin: this.config.corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: [
          'Content-Type',
          'Authorization',
          'X-Requested-With',
          'X-API-Version',
        ],
        exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
      })
    );

    // Rate limiting
    const limiter = rateLimit({
      windowMs: this.config.rateLimitWindowMs,
      max: this.config.rateLimitMaxRequests,
      message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: Math.ceil(this.config.rateLimitWindowMs / 1000),
      },
      standardHeaders: true,
      legacyHeaders: false,
      handler: (req: Request, res: Response) => {
        res.status(429).json({
          success: false,
          error: 'Rate limit exceeded',
          message: 'Too many requests from this IP, please try again later.',
          retryAfter: Math.ceil(this.config.rateLimitWindowMs / 1000),
        });
      },
    });

    this.app.use(limiter);

    // Compression middleware
    if (this.config.enableCompression) {
      this.app.use(compression());
    }

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Logging middleware
    if (this.config.enableLogging) {
      this.app.use(morgan('combined'));
      this.app.use(loggingMiddleware);
    }

    // Request validation middleware
    this.app.use(validateRequest);
  }

  private setupRoutes(): void {
    const apiPrefix = `/api/${this.config.apiVersion}`;

    // Health check routes (no auth required)
    this.app.use(`${apiPrefix}/health`, healthRouter);

    // Authentication routes (no auth required)
    this.app.use(`${apiPrefix}/auth`, authRouter);

    // OAuth routes (mixed auth requirements)
    this.app.use(`${apiPrefix}/oauth`, oauthRouter);

    // Public routes (optional auth for personalization)
    this.app.use(`${apiPrefix}/search`, optionalAuthMiddleware, searchRouter);

    // Protected routes (auth required)
    this.app.use(`${apiPrefix}/users`, authMiddleware, userRouter);
    this.app.use(`${apiPrefix}/voice`, authMiddleware, voiceRouter);
    this.app.use(`${apiPrefix}/ai`, authMiddleware, aiRouter);
    this.app.use(
      `${apiPrefix}/notifications`,
      authMiddleware,
      notificationRouter
    );
    this.app.use(`${apiPrefix}/social`, authMiddleware, socialRouter);
    this.app.use(
      `${apiPrefix}/gamification`,
      authMiddleware,
      gamificationRouter
    );
    this.app.use(`${apiPrefix}/developer`, authMiddleware, developerRouter);

    // Admin routes (admin role required)
    this.app.use(`${apiPrefix}/admin`, authMiddleware, adminRouter);
    this.app.use(`${apiPrefix}/analytics`, authMiddleware, analyticsRouter);

    // API documentation route
    this.app.get(`${apiPrefix}/docs`, (req: Request, res: Response) => {
      res.json({
        name: 'OpportuneX API Gateway',
        version: this.config.apiVersion,
        description: 'AI-powered opportunity discovery platform API',
        endpoints: {
          health: `${apiPrefix}/health`,
          auth: `${apiPrefix}/auth`,
          search: `${apiPrefix}/search`,
          users: `${apiPrefix}/users`,
          voice: `${apiPrefix}/voice`,
          ai: `${apiPrefix}/ai`,
          notifications: `${apiPrefix}/notifications`,
          social: `${apiPrefix}/social`,
          gamification: `${apiPrefix}/gamification`,
          analytics: `${apiPrefix}/analytics`,
          admin: `${apiPrefix}/admin`,
          developer: `${apiPrefix}/developer`,
          oauth: `${apiPrefix}/oauth`,
        },
        documentation: 'https://docs.opportunex.com',
        openapi: `${apiPrefix}/openapi.yaml`,
      });
    });

    // Root API route
    this.app.get(apiPrefix, (req: Request, res: Response) => {
      res.json({
        message: 'OpportuneX API Gateway',
        version: this.config.apiVersion,
        status: 'operational',
        timestamp: new Date().toISOString(),
      });
    });
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public getApp(): Express {
    return this.app;
  }

  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.app.listen(this.config.port, () => {
          console.log(`🚀 API Gateway started on port ${this.config.port}`);
          console.log(
            `📚 API Documentation: http://localhost:${this.config.port}/api/${this.config.apiVersion}/docs`
          );
          resolve();
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}

// Default configuration
export const defaultApiGatewayConfig: ApiGatewayConfig = {
  port: parseInt(process.env.API_GATEWAY_PORT || '3001'),
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
  ],
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  enableLogging: process.env.NODE_ENV !== 'test',
  enableCompression: true,
  apiVersion: 'v1',
};
