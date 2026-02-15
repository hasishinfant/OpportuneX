/**
 * Graceful Shutdown Handler for OpportuneX
 * Ensures clean shutdown of all services and connections
 */

import { EventEmitter } from 'events';
import { connectionPool } from './connection-pool';
import { prisma } from './database';
import { elasticsearch } from './elasticsearch';
import { metricsCollector } from './metrics-collector';
import { logger } from './monitoring';
import { closeRedisConnection } from './redis';

// Shutdown phases
enum ShutdownPhase {
  INITIATED = 'initiated',
  STOPPING_NEW_REQUESTS = 'stopping_new_requests',
  DRAINING_CONNECTIONS = 'draining_connections',
  CLOSING_DATABASES = 'closing_databases',
  CLEANING_UP = 'cleaning_up',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

// Shutdown hook interface
interface ShutdownHook {
  name: string;
  priority: number; // Lower numbers run first
  timeout: number; // Timeout in milliseconds
  hook: () => Promise<void>;
}

// Shutdown status interface
interface ShutdownStatus {
  phase: ShutdownPhase;
  startTime: Date;
  duration: number;
  completedHooks: string[];
  failedHooks: Array<{ name: string; error: string }>;
  isShuttingDown: boolean;
  forcedShutdown: boolean;
}

class GracefulShutdownManager extends EventEmitter {
  private hooks: ShutdownHook[] = [];
  private status: ShutdownStatus = {
    phase: ShutdownPhase.INITIATED,
    startTime: new Date(),
    duration: 0,
    completedHooks: [],
    failedHooks: [],
    isShuttingDown: false,
    forcedShutdown: false,
  };
  private shutdownTimeout = 30000; // 30 seconds default
  private forceShutdownTimeout = 10000; // 10 seconds for forced shutdown
  private shutdownTimer: NodeJS.Timeout | null = null;
  private forceShutdownTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.setupDefaultHooks();
    this.setupSignalHandlers();
  }

  /**
   * Add a shutdown hook
   */
  addHook(hook: ShutdownHook) {
    this.hooks.push(hook);
    // Sort by priority (lower numbers first)
    this.hooks.sort((a, b) => a.priority - b.priority);

    logger.info('Shutdown hook added', {
      name: hook.name,
      priority: hook.priority,
      timeout: hook.timeout,
    });
  }

  /**
   * Remove a shutdown hook
   */
  removeHook(name: string): boolean {
    const index = this.hooks.findIndex(hook => hook.name === name);
    if (index >= 0) {
      this.hooks.splice(index, 1);
      logger.info('Shutdown hook removed', { name });
      return true;
    }
    return false;
  }

  /**
   * Get shutdown status
   */
  getStatus(): ShutdownStatus {
    return {
      ...this.status,
      duration: Date.now() - this.status.startTime.getTime(),
    };
  }

  /**
   * Check if shutdown is in progress
   */
  isShuttingDown(): boolean {
    return this.status.isShuttingDown;
  }

  /**
   * Initiate graceful shutdown
   */
  async shutdown(reason = 'Manual shutdown'): Promise<void> {
    if (this.status.isShuttingDown) {
      logger.warn('Shutdown already in progress');
      return;
    }

    this.status.isShuttingDown = true;
    this.status.startTime = new Date();
    this.status.phase = ShutdownPhase.INITIATED;

    logger.info('Graceful shutdown initiated', { reason });
    this.emit('shutdownStarted', { reason });

    // Set overall shutdown timeout
    this.shutdownTimer = setTimeout(() => {
      logger.error('Shutdown timeout exceeded, forcing exit');
      this.forceShutdown();
    }, this.shutdownTimeout);

    try {
      await this.executeShutdownPhases();
      this.status.phase = ShutdownPhase.COMPLETED;

      logger.info('Graceful shutdown completed', {
        duration: Date.now() - this.status.startTime.getTime(),
        completedHooks: this.status.completedHooks.length,
        failedHooks: this.status.failedHooks.length,
      });

      this.emit('shutdownCompleted', this.getStatus());
    } catch (error) {
      this.status.phase = ShutdownPhase.FAILED;

      logger.error('Graceful shutdown failed', error as Error, {
        duration: Date.now() - this.status.startTime.getTime(),
        completedHooks: this.status.completedHooks.length,
        failedHooks: this.status.failedHooks.length,
      });

      this.emit('shutdownFailed', { error, status: this.getStatus() });
      throw error;
    } finally {
      if (this.shutdownTimer) {
        clearTimeout(this.shutdownTimer);
      }
    }
  }

  /**
   * Force immediate shutdown
   */
  forceShutdown(): void {
    this.status.forcedShutdown = true;

    logger.warn('Forcing immediate shutdown');
    this.emit('forceShutdown');

    // Give a brief moment for cleanup
    this.forceShutdownTimer = setTimeout(() => {
      process.exit(1);
    }, this.forceShutdownTimeout);
  }

  /**
   * Setup default shutdown hooks
   */
  private setupDefaultHooks() {
    // Stop accepting new requests (highest priority)
    this.addHook({
      name: 'stop_new_requests',
      priority: 1,
      timeout: 1000,
      hook: async () => {
        this.status.phase = ShutdownPhase.STOPPING_NEW_REQUESTS;
        // This would typically involve stopping HTTP servers from accepting new connections
        logger.info('Stopped accepting new requests');
      },
    });

    // Drain existing connections
    this.addHook({
      name: 'drain_connections',
      priority: 2,
      timeout: 15000,
      hook: async () => {
        this.status.phase = ShutdownPhase.DRAINING_CONNECTIONS;
        // Wait for existing requests to complete
        await this.waitForActiveConnections();
        logger.info('Drained active connections');
      },
    });

    // Close database connections
    this.addHook({
      name: 'close_database',
      priority: 3,
      timeout: 5000,
      hook: async () => {
        this.status.phase = ShutdownPhase.CLOSING_DATABASES;
        await prisma.$disconnect();
        logger.info('Closed database connections');
      },
    });

    // Close connection pool
    this.addHook({
      name: 'close_connection_pool',
      priority: 4,
      timeout: 5000,
      hook: async () => {
        await connectionPool.close();
        logger.info('Closed database connection pool');
      },
    });

    // Close Redis connection
    this.addHook({
      name: 'close_redis',
      priority: 5,
      timeout: 3000,
      hook: async () => {
        await closeRedisConnection();
        logger.info('Closed Redis connection');
      },
    });

    // Close Elasticsearch connection
    this.addHook({
      name: 'close_elasticsearch',
      priority: 6,
      timeout: 3000,
      hook: async () => {
        await elasticsearch.close();
        logger.info('Closed Elasticsearch connection');
      },
    });

    // Cleanup metrics collector
    this.addHook({
      name: 'cleanup_metrics',
      priority: 7,
      timeout: 2000,
      hook: async () => {
        this.status.phase = ShutdownPhase.CLEANING_UP;
        metricsCollector.cleanup();
        logger.info('Cleaned up metrics collector');
      },
    });

    // Final cleanup
    this.addHook({
      name: 'final_cleanup',
      priority: 10,
      timeout: 2000,
      hook: async () => {
        // Clear any remaining timers, intervals, etc.
        this.clearTimers();
        logger.info('Final cleanup completed');
      },
    });
  }

  /**
   * Setup signal handlers
   */
  private setupSignalHandlers() {
    // Graceful shutdown signals
    process.on('SIGTERM', () => {
      logger.info('Received SIGTERM signal');
      this.shutdown('SIGTERM signal').finally(() => {
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('Received SIGINT signal');
      this.shutdown('SIGINT signal').finally(() => {
        process.exit(0);
      });
    });

    // Force shutdown on second SIGINT
    let sigintCount = 0;
    process.on('SIGINT', () => {
      sigintCount++;
      if (sigintCount >= 2) {
        logger.warn('Received second SIGINT, forcing shutdown');
        this.forceShutdown();
      }
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', error => {
      logger.fatal('Uncaught exception, initiating emergency shutdown', error);
      this.shutdown('Uncaught exception').finally(() => {
        process.exit(1);
      });
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.fatal(
        'Unhandled promise rejection, initiating emergency shutdown',
        reason instanceof Error ? reason : new Error(String(reason))
      );
      this.shutdown('Unhandled promise rejection').finally(() => {
        process.exit(1);
      });
    });
  }

  /**
   * Execute shutdown phases
   */
  private async executeShutdownPhases() {
    for (const hook of this.hooks) {
      try {
        logger.debug('Executing shutdown hook', { name: hook.name });

        // Execute hook with timeout
        await this.executeWithTimeout(hook.hook, hook.timeout, hook.name);

        this.status.completedHooks.push(hook.name);
        logger.debug('Shutdown hook completed', { name: hook.name });

        this.emit('hookCompleted', { name: hook.name });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.status.failedHooks.push({ name: hook.name, error: errorMessage });

        logger.error('Shutdown hook failed', error as Error, {
          name: hook.name,
        });
        this.emit('hookFailed', { name: hook.name, error });

        // Continue with other hooks even if one fails
      }
    }
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeout: number,
    name: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout executing ${name} after ${timeout}ms`));
      }, timeout);

      fn()
        .then(resolve)
        .catch(reject)
        .finally(() => clearTimeout(timer));
    });
  }

  /**
   * Wait for active connections to drain
   */
  private async waitForActiveConnections(): Promise<void> {
    // This is a simplified implementation
    // In a real application, you'd track active HTTP connections
    const maxWait = 10000; // 10 seconds
    const checkInterval = 100; // 100ms
    let waited = 0;

    while (waited < maxWait) {
      // Check if there are active connections
      // For now, we'll just wait a bit to simulate draining
      const activeConnections = this.getActiveConnectionCount();

      if (activeConnections === 0) {
        break;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waited += checkInterval;
    }

    if (waited >= maxWait) {
      logger.warn('Timeout waiting for connections to drain');
    }
  }

  /**
   * Get active connection count (placeholder)
   */
  private getActiveConnectionCount(): number {
    // This would be implemented based on your HTTP server
    // For now, return 0 to simulate no active connections
    return 0;
  }

  /**
   * Clear any remaining timers
   */
  private clearTimers() {
    if (this.shutdownTimer) {
      clearTimeout(this.shutdownTimer);
      this.shutdownTimer = null;
    }

    if (this.forceShutdownTimer) {
      clearTimeout(this.forceShutdownTimer);
      this.forceShutdownTimer = null;
    }
  }

  /**
   * Set shutdown timeout
   */
  setShutdownTimeout(timeout: number) {
    this.shutdownTimeout = timeout;
  }

  /**
   * Set force shutdown timeout
   */
  setForceShutdownTimeout(timeout: number) {
    this.forceShutdownTimeout = timeout;
  }
}

// Singleton instance
export const gracefulShutdown = new GracefulShutdownManager();

// Health check integration
export function createShutdownHealthCheck() {
  return {
    name: 'shutdown_status',
    check: async () => {
      const status = gracefulShutdown.getStatus();

      return {
        healthy: !status.isShuttingDown,
        details: {
          isShuttingDown: status.isShuttingDown,
          phase: status.phase,
          duration: status.duration,
          completedHooks: status.completedHooks.length,
          failedHooks: status.failedHooks.length,
        },
      };
    },
  };
}

// Express middleware to reject requests during shutdown
export function createShutdownMiddleware() {
  return (req: any, res: any, next: any) => {
    if (gracefulShutdown.isShuttingDown()) {
      res.status(503).json({
        error: 'Service is shutting down',
        message:
          'The server is currently shutting down and not accepting new requests',
      });
      return;
    }
    next();
  };
}

export default gracefulShutdown;
