import type { NextFunction, Request, Response } from 'express';

export interface LogEntry {
  timestamp: string;
  method: string;
  url: string;
  statusCode?: number;
  responseTime?: number;
  userAgent?: string;
  ip: string;
  userId?: string;
  error?: string;
}

/**
 * Custom logging middleware for API requests
 */
export const loggingMiddleware = (
  req: Request & { user?: { id: string } },
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  // Log request
  const logEntry: LogEntry = {
    timestamp,
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
  };

  // Override res.end to capture response details
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any): any {
    const responseTime = Date.now() - startTime;

    logEntry.statusCode = res.statusCode;
    logEntry.responseTime = responseTime;

    // Log the completed request
    if (process.env.NODE_ENV !== 'test') {
      console.log(
        JSON.stringify({
          ...logEntry,
          level: res.statusCode >= 400 ? 'error' : 'info',
          message: `${req.method} ${req.url} - ${res.statusCode} - ${responseTime}ms`,
        })
      );
    }

    // Call original end method
    originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Error logging middleware
 */
export const errorLoggingMiddleware = (
  error: Error,
  req: Request & { user?: { id: string } },
  res: Response,
  next: NextFunction
): void => {
  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip || req.connection.remoteAddress || 'unknown',
    userAgent: req.get('User-Agent'),
    userId: req.user?.id,
    error: error.message,
  };

  // Log error details
  if (process.env.NODE_ENV !== 'test') {
    console.error(
      JSON.stringify({
        ...logEntry,
        level: 'error',
        message: `Error in ${req.method} ${req.url}: ${error.message}`,
        stack: error.stack,
      })
    );
  }

  next(error);
};

/**
 * Performance monitoring middleware
 */
export const performanceMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds

    // Log slow requests (> 1 second)
    if (duration > 1000 && process.env.NODE_ENV !== 'test') {
      console.warn(
        JSON.stringify({
          level: 'warn',
          message: `Slow request detected: ${req.method} ${req.url}`,
          duration: `${duration.toFixed(2)}ms`,
          timestamp: new Date().toISOString(),
        })
      );
    }

    // Add performance header
    res.set('X-Response-Time', `${duration.toFixed(2)}ms`);
  });

  next();
};

/**
 * Request ID middleware for tracing
 */
export const requestIdMiddleware = (
  req: Request & { requestId?: string },
  res: Response,
  next: NextFunction
): void => {
  // Generate unique request ID
  const requestId = req.get('X-Request-ID') || generateRequestId();

  req.requestId = requestId;
  res.set('X-Request-ID', requestId);

  next();
};

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
