/**
 * Application Monitoring and Logging Service for OpportuneX
 * Provides comprehensive monitoring, logging, and alerting capabilities
 */

import { performance } from 'perf_hooks';

// Log levels
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4,
}

// Log entry interface
interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  error?: Error;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  component?: string;
  action?: string;
  duration?: number;
  metadata?: Record<string, any>;
}

// Performance metrics interface
interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  tags?: Record<string, string>;
}

// Application metrics interface
interface ApplicationMetrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    averageResponseTime: number;
  };
  database: {
    connections: number;
    queries: number;
    slowQueries: number;
    averageQueryTime: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
  search: {
    queries: number;
    averageResponseTime: number;
    slowQueries: number;
  };
  errors: {
    total: number;
    byType: Record<string, number>;
  };
  users: {
    active: number;
    sessions: number;
  };
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 10000;
  private logLevel: LogLevel;

  constructor() {
    this.logLevel = this.getLogLevelFromEnv();
  }

  private getLogLevelFromEnv(): LogLevel {
    const level = process.env.LOG_LEVEL?.toUpperCase() || 'INFO';
    return LogLevel[level as keyof typeof LogLevel] ?? LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  private addLog(entry: LogEntry) {
    if (!this.shouldLog(entry.level)) return;

    this.logs.push(entry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Output to console in development
    if (process.env.NODE_ENV === 'development') {
      this.outputToConsole(entry);
    }

    // Send to external logging service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(entry);
    }
  }

  private outputToConsole(entry: LogEntry) {
    const timestamp = entry.timestamp.toISOString();
    const level = LogLevel[entry.level];
    const message = `[${timestamp}] ${level}: ${entry.message}`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(message, entry.context);
        break;
      case LogLevel.INFO:
        console.info(message, entry.context);
        break;
      case LogLevel.WARN:
        console.warn(message, entry.context);
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(message, entry.error || entry.context);
        break;
    }
  }

  private async sendToExternalService(entry: LogEntry) {
    try {
      // This would integrate with services like DataDog, New Relic, or custom logging endpoint
      const logData = {
        timestamp: entry.timestamp.toISOString(),
        level: LogLevel[entry.level],
        message: entry.message,
        context: entry.context,
        error: entry.error
          ? {
              name: entry.error.name,
              message: entry.error.message,
              stack: entry.error.stack,
            }
          : undefined,
        userId: entry.userId,
        sessionId: entry.sessionId,
        requestId: entry.requestId,
        component: entry.component,
        action: entry.action,
        duration: entry.duration,
        metadata: entry.metadata,
        service: 'opportunex',
        environment: process.env.NODE_ENV,
      };

      // Example: Send to logging endpoint
      if (process.env.LOGGING_ENDPOINT) {
        await fetch(process.env.LOGGING_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.LOGGING_API_KEY}`,
          },
          body: JSON.stringify(logData),
        });
      }
    } catch (error) {
      console.error('Failed to send log to external service:', error);
    }
  }

  debug(message: string, context?: Record<string, any>) {
    this.addLog({
      timestamp: new Date(),
      level: LogLevel.DEBUG,
      message,
      context,
    });
  }

  info(message: string, context?: Record<string, any>) {
    this.addLog({
      timestamp: new Date(),
      level: LogLevel.INFO,
      message,
      context,
    });
  }

  warn(message: string, context?: Record<string, any>) {
    this.addLog({
      timestamp: new Date(),
      level: LogLevel.WARN,
      message,
      context,
    });
  }

  error(message: string, error?: Error, context?: Record<string, any>) {
    this.addLog({
      timestamp: new Date(),
      level: LogLevel.ERROR,
      message,
      error,
      context,
    });
  }

  fatal(message: string, error?: Error, context?: Record<string, any>) {
    this.addLog({
      timestamp: new Date(),
      level: LogLevel.FATAL,
      message,
      error,
      context,
    });
  }

  // Structured logging methods
  logRequest(requestId: string, method: string, url: string, userId?: string) {
    this.info('HTTP Request', {
      requestId,
      method,
      url,
      userId,
      component: 'http',
      action: 'request',
    });
  }

  logResponse(requestId: string, statusCode: number, duration: number) {
    this.info('HTTP Response', {
      requestId,
      statusCode,
      duration,
      component: 'http',
      action: 'response',
    });
  }

  logDatabaseQuery(query: string, duration: number, userId?: string) {
    this.debug('Database Query', {
      query: query.substring(0, 200), // Truncate long queries
      duration,
      userId,
      component: 'database',
      action: 'query',
    });
  }

  logSearchQuery(
    query: string,
    resultCount: number,
    duration: number,
    userId?: string
  ) {
    this.info('Search Query', {
      query,
      resultCount,
      duration,
      userId,
      component: 'search',
      action: 'query',
    });
  }

  logUserAction(userId: string, action: string, context?: Record<string, any>) {
    this.info('User Action', {
      userId,
      action,
      ...context,
      component: 'user',
    });
  }

  logCacheOperation(
    operation: string,
    key: string,
    hit: boolean,
    duration?: number
  ) {
    this.debug('Cache Operation', {
      operation,
      key,
      hit,
      duration,
      component: 'cache',
    });
  }

  // Get recent logs
  getRecentLogs(count = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  // Get logs by level
  getLogsByLevel(level: LogLevel, count = 100): LogEntry[] {
    return this.logs.filter(log => log.level === level).slice(-count);
  }

  // Get logs by component
  getLogsByComponent(component: string, count = 100): LogEntry[] {
    return this.logs.filter(log => log.component === component).slice(-count);
  }

  // Clear logs
  clearLogs() {
    this.logs = [];
  }
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 10000;
  private timers: Map<string, number> = new Map();

  // Start timing an operation
  startTimer(name: string): string {
    const timerId = `${name}_${Date.now()}_${Math.random()}`;
    this.timers.set(timerId, performance.now());
    return timerId;
  }

  // End timing and record metric
  endTimer(timerId: string, tags?: Record<string, string>) {
    const startTime = this.timers.get(timerId);
    if (!startTime) return;

    const duration = performance.now() - startTime;
    this.timers.delete(timerId);

    const name = timerId.split('_')[0];
    this.recordMetric(name, duration, 'ms', tags);

    return duration;
  }

  // Record a metric
  recordMetric(
    name: string,
    value: number,
    unit: string,
    tags?: Record<string, string>
  ) {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: new Date(),
      tags,
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendMetricToService(metric);
    }
  }

  private async sendMetricToService(metric: PerformanceMetric) {
    try {
      // This would integrate with services like DataDog, New Relic, or Prometheus
      if (process.env.METRICS_ENDPOINT) {
        await fetch(process.env.METRICS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.METRICS_API_KEY}`,
          },
          body: JSON.stringify({
            ...metric,
            service: 'opportunex',
            environment: process.env.NODE_ENV,
          }),
        });
      }
    } catch (error) {
      console.error('Failed to send metric to monitoring service:', error);
    }
  }

  // Get metrics by name
  getMetrics(name: string, limit = 100): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.name === name).slice(-limit);
  }

  // Get average value for a metric
  getAverageMetric(name: string, timeWindowMs = 300000): number {
    const cutoff = new Date(Date.now() - timeWindowMs);
    const recentMetrics = this.metrics.filter(
      metric => metric.name === name && metric.timestamp >= cutoff
    );

    if (recentMetrics.length === 0) return 0;

    const sum = recentMetrics.reduce((acc, metric) => acc + metric.value, 0);
    return sum / recentMetrics.length;
  }

  // Get percentile for a metric
  getPercentile(
    name: string,
    percentile: number,
    timeWindowMs = 300000
  ): number {
    const cutoff = new Date(Date.now() - timeWindowMs);
    const recentMetrics = this.metrics
      .filter(metric => metric.name === name && metric.timestamp >= cutoff)
      .map(metric => metric.value)
      .sort((a, b) => a - b);

    if (recentMetrics.length === 0) return 0;

    const index = Math.ceil((percentile / 100) * recentMetrics.length) - 1;
    return recentMetrics[Math.max(0, index)];
  }

  // Clear metrics
  clearMetrics() {
    this.metrics = [];
  }
}

class ApplicationMonitor {
  private metrics: ApplicationMetrics = {
    requests: { total: 0, successful: 0, failed: 0, averageResponseTime: 0 },
    database: {
      connections: 0,
      queries: 0,
      slowQueries: 0,
      averageQueryTime: 0,
    },
    cache: { hits: 0, misses: 0, hitRate: 0 },
    search: { queries: 0, averageResponseTime: 0, slowQueries: 0 },
    errors: { total: 0, byType: {} },
    users: { active: 0, sessions: 0 },
  };

  private responseTimes: number[] = [];
  private queryTimes: number[] = [];
  private searchTimes: number[] = [];

  // Record request metrics
  recordRequest(success: boolean, responseTime: number) {
    this.metrics.requests.total++;
    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }

    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }

    this.metrics.requests.averageResponseTime =
      this.responseTimes.reduce((sum, time) => sum + time, 0) /
      this.responseTimes.length;
  }

  // Record database metrics
  recordDatabaseQuery(queryTime: number, isSlow = false) {
    this.metrics.database.queries++;
    if (isSlow) {
      this.metrics.database.slowQueries++;
    }

    this.queryTimes.push(queryTime);
    if (this.queryTimes.length > 1000) {
      this.queryTimes = this.queryTimes.slice(-1000);
    }

    this.metrics.database.averageQueryTime =
      this.queryTimes.reduce((sum, time) => sum + time, 0) /
      this.queryTimes.length;
  }

  // Record cache metrics
  recordCacheOperation(hit: boolean) {
    if (hit) {
      this.metrics.cache.hits++;
    } else {
      this.metrics.cache.misses++;
    }

    const total = this.metrics.cache.hits + this.metrics.cache.misses;
    this.metrics.cache.hitRate =
      total > 0 ? (this.metrics.cache.hits / total) * 100 : 0;
  }

  // Record search metrics
  recordSearchQuery(responseTime: number, isSlow = false) {
    this.metrics.search.queries++;
    if (isSlow) {
      this.metrics.search.slowQueries++;
    }

    this.searchTimes.push(responseTime);
    if (this.searchTimes.length > 1000) {
      this.searchTimes = this.searchTimes.slice(-1000);
    }

    this.metrics.search.averageResponseTime =
      this.searchTimes.reduce((sum, time) => sum + time, 0) /
      this.searchTimes.length;
  }

  // Record error
  recordError(errorType: string) {
    this.metrics.errors.total++;
    this.metrics.errors.byType[errorType] =
      (this.metrics.errors.byType[errorType] || 0) + 1;
  }

  // Update user metrics
  updateUserMetrics(activeUsers: number, sessions: number) {
    this.metrics.users.active = activeUsers;
    this.metrics.users.sessions = sessions;
  }

  // Update database connections
  updateDatabaseConnections(connections: number) {
    this.metrics.database.connections = connections;
  }

  // Get current metrics
  getMetrics(): ApplicationMetrics {
    return { ...this.metrics };
  }

  // Reset metrics
  resetMetrics() {
    this.metrics = {
      requests: { total: 0, successful: 0, failed: 0, averageResponseTime: 0 },
      database: {
        connections: 0,
        queries: 0,
        slowQueries: 0,
        averageQueryTime: 0,
      },
      cache: { hits: 0, misses: 0, hitRate: 0 },
      search: { queries: 0, averageResponseTime: 0, slowQueries: 0 },
      errors: { total: 0, byType: {} },
      users: { active: 0, sessions: 0 },
    };
    this.responseTimes = [];
    this.queryTimes = [];
    this.searchTimes = [];
  }

  // Get health status
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    checks: Record<string, boolean>;
    metrics: ApplicationMetrics;
  } {
    const checks = {
      responseTime: this.metrics.requests.averageResponseTime < 1000, // < 1s
      errorRate:
        this.metrics.requests.failed /
          Math.max(this.metrics.requests.total, 1) <
        0.05, // < 5%
      databasePerformance: this.metrics.database.averageQueryTime < 500, // < 500ms
      cacheHitRate: this.metrics.cache.hitRate > 70, // > 70%
      searchPerformance: this.metrics.search.averageResponseTime < 2000, // < 2s
    };

    const healthyChecks = Object.values(checks).filter(Boolean).length;
    const totalChecks = Object.values(checks).length;

    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyChecks === totalChecks) {
      status = 'healthy';
    } else if (healthyChecks >= totalChecks * 0.7) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    return {
      status,
      checks,
      metrics: this.getMetrics(),
    };
  }
}

// Singleton instances
export const logger = new Logger();
export const performanceMonitor = new PerformanceMonitor();
export const applicationMonitor = new ApplicationMonitor();

// Monitoring middleware for Express
export function createMonitoringMiddleware() {
  return (req: any, res: any, next: any) => {
    const requestId =
      req.headers['x-request-id'] || `req_${Date.now()}_${Math.random()}`;
    const startTime = performance.now();

    // Add request ID to request object
    req.requestId = requestId;

    // Log request
    logger.logRequest(requestId, req.method, req.url, req.user?.id);

    // Override res.end to capture response
    const originalEnd = res.end;
    res.end = function (...args: any[]) {
      const duration = performance.now() - startTime;
      const success = res.statusCode < 400;

      // Log response
      logger.logResponse(requestId, res.statusCode, duration);

      // Record metrics
      applicationMonitor.recordRequest(success, duration);
      performanceMonitor.recordMetric('http_request_duration', duration, 'ms', {
        method: req.method,
        status: res.statusCode.toString(),
      });

      originalEnd.apply(this, args);
    };

    next();
  };
}

// Error monitoring middleware
export function createErrorMonitoringMiddleware() {
  return (error: Error, req: any, res: any, next: any) => {
    const requestId = req.requestId || 'unknown';

    // Log error
    logger.error('Unhandled request error', error, {
      requestId,
      method: req.method,
      url: req.url,
      userId: req.user?.id,
    });

    // Record error metrics
    applicationMonitor.recordError(error.name);
    performanceMonitor.recordMetric('error_count', 1, 'count', {
      type: error.name,
      endpoint: req.url,
    });

    next(error);
  };
}

export default {
  logger,
  performanceMonitor,
  applicationMonitor,
  createMonitoringMiddleware,
  createErrorMonitoringMiddleware,
};
