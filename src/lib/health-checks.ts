/**
 * Health Check Service for OpportuneX
 * Provides comprehensive health monitoring for all system components
 */

import { cacheService } from './cache-service';
import { connectionPool } from './connection-pool';
import { prisma } from './database';
import { elasticsearch } from './elasticsearch';
import { applicationMonitor, logger } from './monitoring';
import { getRedisClient } from './redis';

export interface HealthCheckResult {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: Record<string, any>;
  error?: string;
  timestamp: Date;
}

export interface SystemHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  uptime: number;
  version: string;
  environment: string;
  checks: HealthCheckResult[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

class HealthCheckService {
  private startTime: Date;
  private version: string;
  private environment: string;

  constructor() {
    this.startTime = new Date();
    this.version = process.env.APP_VERSION || '1.0.0';
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Check database health
   */
  async checkDatabase(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      await prisma.$queryRaw`SELECT 1`;
      
      // Get database stats
      const stats = await prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*) as count FROM opportunities WHERE is_active = true
      `;
      
      const responseTime = Date.now() - startTime;
      const activeOpportunities = Number(stats[0]?.count || 0);

      // Check connection pool if available
      const poolStats = connectionPool.getStats();

      return {
        name: 'database',
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        details: {
          activeOpportunities,
          connectionPool: poolStats,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Database connection failed',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check Redis cache health
   */
  async checkRedis(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const client = await getRedisClient();
      
      // Test basic connectivity
      const pong = await client.ping();
      
      // Test set/get operations
      const testKey = `health_check_${Date.now()}`;
      await client.set(testKey, 'test', { EX: 10 });
      const testValue = await client.get(testKey);
      await client.del(testKey);
      
      const responseTime = Date.now() - startTime;
      
      // Get Redis info
      const info = await client.info('memory');
      const memoryUsage = this.parseRedisInfo(info);

      return {
        name: 'redis',
        status: pong === 'PONG' && testValue === 'test' ? 'healthy' : 'degraded',
        responseTime,
        details: {
          ping: pong,
          testOperation: testValue === 'test',
          memoryUsage,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        name: 'redis',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Redis connection failed',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check Elasticsearch health
   */
  async checkElasticsearch(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test cluster health
      const clusterHealth = await elasticsearch.cluster.health();
      
      // Test search functionality
      const searchResult = await elasticsearch.search({
        index: 'opportunities',
        body: {
          query: { match_all: {} },
          size: 1,
        },
      });
      
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'elasticsearch',
        status: clusterHealth.status === 'red' ? 'unhealthy' : 
                clusterHealth.status === 'yellow' ? 'degraded' : 'healthy',
        responseTime,
        details: {
          clusterStatus: clusterHealth.status,
          numberOfNodes: clusterHealth.number_of_nodes,
          numberOfDataNodes: clusterHealth.number_of_data_nodes,
          activePrimaryShards: clusterHealth.active_primary_shards,
          activeShards: clusterHealth.active_shards,
          searchTest: searchResult.hits.total,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        name: 'elasticsearch',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Elasticsearch connection failed',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check external API dependencies
   */
  async checkExternalAPIs(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const results: Record<string, boolean> = {};
    
    try {
      // Check OpenAI API
      if (process.env.OPENAI_API_KEY) {
        try {
          const response = await fetch('https://api.openai.com/v1/models', {
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            signal: AbortSignal.timeout(5000),
          });
          results.openai = response.ok;
        } catch {
          results.openai = false;
        }
      }

      // Check SendGrid API
      if (process.env.SENDGRID_API_KEY) {
        try {
          const response = await fetch('https://api.sendgrid.com/v3/user/profile', {
            headers: {
              'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
            },
            signal: AbortSignal.timeout(5000),
          });
          results.sendgrid = response.ok;
        } catch {
          results.sendgrid = false;
        }
      }

      const responseTime = Date.now() - startTime;
      const healthyAPIs = Object.values(results).filter(Boolean).length;
      const totalAPIs = Object.values(results).length;
      
      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (totalAPIs === 0) {
        status = 'healthy'; // No external APIs configured
      } else if (healthyAPIs === totalAPIs) {
        status = 'healthy';
      } else if (healthyAPIs > 0) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }

      return {
        name: 'external_apis',
        status,
        responseTime,
        details: results,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        name: 'external_apis',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'External API check failed',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check application metrics
   */
  async checkApplicationMetrics(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const metrics = applicationMonitor.getMetrics();
      const healthStatus = applicationMonitor.getHealthStatus();
      
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'application_metrics',
        status: healthStatus.status,
        responseTime,
        details: {
          ...metrics,
          healthChecks: healthStatus.checks,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        name: 'application_metrics',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Metrics check failed',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check system resources
   */
  async checkSystemResources(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      const uptime = process.uptime();
      
      // Convert bytes to MB
      const memoryMB = {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      };
      
      // Check if memory usage is concerning
      const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      
      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (heapUsagePercent > 90) {
        status = 'unhealthy';
      } else if (heapUsagePercent > 75) {
        status = 'degraded';
      } else {
        status = 'healthy';
      }
      
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'system_resources',
        status,
        responseTime,
        details: {
          memory: memoryMB,
          heapUsagePercent: Math.round(heapUsagePercent),
          cpuUsage,
          uptime: Math.round(uptime),
        },
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        name: 'system_resources',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'System resources check failed',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Check cache service
   */
  async checkCacheService(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const healthCheck = await cacheService.healthCheck();
      const stats = cacheService.getStats();
      
      const responseTime = Date.now() - startTime;
      
      return {
        name: 'cache_service',
        status: healthCheck.healthy ? 'healthy' : 'unhealthy',
        responseTime,
        details: {
          ...stats,
          latency: healthCheck.latency,
        },
        error: healthCheck.error,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        name: 'cache_service',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Cache service check failed',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Run all health checks
   */
  async runAllChecks(): Promise<SystemHealthStatus> {
    const startTime = Date.now();
    
    try {
      // Run all checks in parallel
      const checks = await Promise.all([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkElasticsearch(),
        this.checkExternalAPIs(),
        this.checkApplicationMetrics(),
        this.checkSystemResources(),
        this.checkCacheService(),
      ]);

      // Calculate overall status
      const summary = {
        total: checks.length,
        healthy: checks.filter(c => c.status === 'healthy').length,
        degraded: checks.filter(c => c.status === 'degraded').length,
        unhealthy: checks.filter(c => c.status === 'unhealthy').length,
      };

      let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
      if (summary.unhealthy > 0) {
        overallStatus = 'unhealthy';
      } else if (summary.degraded > 0) {
        overallStatus = 'degraded';
      } else {
        overallStatus = 'healthy';
      }

      const uptime = Date.now() - this.startTime.getTime();

      const healthStatus: SystemHealthStatus = {
        status: overallStatus,
        timestamp: new Date(),
        uptime,
        version: this.version,
        environment: this.environment,
        checks,
        summary,
      };

      // Log health check results
      logger.info('Health check completed', {
        status: overallStatus,
        duration: Date.now() - startTime,
        summary,
      });

      return healthStatus;
    } catch (error) {
      logger.error('Health check failed', error);
      
      return {
        status: 'unhealthy',
        timestamp: new Date(),
        uptime: Date.now() - this.startTime.getTime(),
        version: this.version,
        environment: this.environment,
        checks: [],
        summary: { total: 0, healthy: 0, degraded: 0, unhealthy: 1 },
      };
    }
  }

  /**
   * Run a specific health check
   */
  async runCheck(checkName: string): Promise<HealthCheckResult> {
    switch (checkName) {
      case 'database':
        return this.checkDatabase();
      case 'redis':
        return this.checkRedis();
      case 'elasticsearch':
        return this.checkElasticsearch();
      case 'external_apis':
        return this.checkExternalAPIs();
      case 'application_metrics':
        return this.checkApplicationMetrics();
      case 'system_resources':
        return this.checkSystemResources();
      case 'cache_service':
        return this.checkCacheService();
      default:
        throw new Error(`Unknown health check: ${checkName}`);
    }
  }

  /**
   * Get readiness status (for Kubernetes readiness probe)
   */
  async getReadinessStatus(): Promise<{ ready: boolean; checks: string[] }> {
    const criticalChecks = ['database', 'redis', 'elasticsearch'];
    const results = await Promise.all(
      criticalChecks.map(check => this.runCheck(check))
    );

    const failedChecks = results
      .filter(result => result.status === 'unhealthy')
      .map(result => result.name);

    return {
      ready: failedChecks.length === 0,
      checks: failedChecks,
    };
  }

  /**
   * Get liveness status (for Kubernetes liveness probe)
   */
  async getLivenessStatus(): Promise<{ alive: boolean; uptime: number }> {
    try {
      // Simple check to ensure the process is responsive
      const uptime = Date.now() - this.startTime.getTime();
      return { alive: true, uptime };
    } catch {
      return { alive: false, uptime: 0 };
    }
  }

  /**
   * Parse Redis info string
   */
  private parseRedisInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = info.split('\r\n');
    
    for (const line of lines) {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    }
    
    return result;
  }
}

// Singleton instance
export const healthCheckService = new HealthCheckService();

// Health check routes for Express
export function createHealthCheckRoutes() {
  return {
    // Full health check
    async health(req: any, res: any) {
      try {
        const healthStatus = await healthCheckService.runAllChecks();
        const statusCode = healthStatus.status === 'healthy' ? 200 : 
                          healthStatus.status === 'degraded' ? 200 : 503;
        
        res.status(statusCode).json(healthStatus);
      } catch (error) {
        res.status(503).json({
          status: 'unhealthy',
          error: error instanceof Error ? error.message : 'Health check failed',
          timestamp: new Date(),
        });
      }
    },

    // Readiness probe
    async ready(req: any, res: any) {
      try {
        const readiness = await healthCheckService.getReadinessStatus();
        const statusCode = readiness.ready ? 200 : 503;
        
        res.status(statusCode).json(readiness);
      } catch (error) {
        res.status(503).json({
          ready: false,
          error: error instanceof Error ? error.message : 'Readiness check failed',
        });
      }
    },

    // Liveness probe
    async live(req: any, res: any) {
      try {
        const liveness = await healthCheckService.getLivenessStatus();
        const statusCode = liveness.alive ? 200 : 503;
        
        res.status(statusCode).json(liveness);
      } catch (error) {
        res.status(503).json({
          alive: false,
          error: error instanceof Error ? error.message : 'Liveness check failed',
        });
      }
    },

    // Individual component check
    async component(req: any, res: any) {
      try {
        const { component } = req.params;
        const result = await healthCheckService.runCheck(component);
        const statusCode = result.status === 'healthy' ? 200 : 
                          result.status === 'degraded' ? 200 : 503;
        
        res.status(statusCode).json(result);
      } catch (error) {
        res.status(404).json({
          error: error instanceof Error ? error.message : 'Component not found',
        });
      }
    },
  };
}

export default healthCheckService;