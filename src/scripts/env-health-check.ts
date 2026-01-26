#!/usr/bin/env tsx

/**
 * Environment Health Check Script for OpportuneX
 * Provides comprehensive health monitoring for environment configuration
 */

import { Client } from '@elastic/elasticsearch';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { env, validateEnv } from '../lib/env';
import { getSecretsAudit, secretsManager } from '../lib/secrets';

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  message: string;
  responseTime?: number;
  details?: any;
  lastChecked: Date;
}

class EnvironmentHealthChecker {
  private results: HealthCheckResult[] = [];

  /**
   * Add health check result
   */
  private addResult(
    service: string,
    status: 'healthy' | 'degraded' | 'unhealthy',
    message: string,
    responseTime?: number,
    details?: any
  ) {
    this.results.push({
      service,
      status,
      message,
      responseTime,
      details,
      lastChecked: new Date(),
    });
  }

  /**
   * Measure execution time of async function
   */
  private async measureTime<T>(
    fn: () => Promise<T>
  ): Promise<{ result: T; time: number }> {
    const start = Date.now();
    const result = await fn();
    const time = Date.now() - start;
    return { result, time };
  }

  /**
   * Check environment configuration health
   */
  async checkEnvironmentConfig(): Promise<void> {
    try {
      const healthCheck = validateEnv.getHealthCheck();

      if (healthCheck.status === 'healthy') {
        this.addResult(
          'Environment Config',
          'healthy',
          `Configuration is valid (${env.NODE_ENV})`
        );
      } else if (healthCheck.status === 'warning') {
        this.addResult(
          'Environment Config',
          'degraded',
          'Configuration has warnings',
          undefined,
          healthCheck
        );
      } else {
        this.addResult(
          'Environment Config',
          'unhealthy',
          'Configuration validation failed',
          undefined,
          healthCheck
        );
      }
    } catch (error) {
      this.addResult(
        'Environment Config',
        'unhealthy',
        `Configuration error: ${error}`
      );
    }
  }

  /**
   * Check secrets management health
   */
  async checkSecretsManagement(): Promise<void> {
    try {
      const validation = secretsManager.validateSecrets();
      const audit = getSecretsAudit();

      if (validation.valid && validation.warnings.length === 0) {
        this.addResult(
          'Secrets Management',
          'healthy',
          `All secrets valid (${audit.configured}/${audit.total})`
        );
      } else if (validation.valid && validation.warnings.length > 0) {
        this.addResult(
          'Secrets Management',
          'degraded',
          `Secrets valid with warnings (${validation.warnings.length})`,
          undefined,
          validation.warnings
        );
      } else {
        this.addResult(
          'Secrets Management',
          'unhealthy',
          `Missing secrets: ${validation.missing.join(', ')}`,
          undefined,
          validation
        );
      }
    } catch (error) {
      this.addResult(
        'Secrets Management',
        'unhealthy',
        `Secrets management error: ${error}`
      );
    }
  }

  /**
   * Check database health
   */
  async checkDatabase(): Promise<void> {
    try {
      const { result, time } = await this.measureTime(async () => {
        const prisma = new PrismaClient();
        await prisma.$connect();

        // Test basic query
        const result = await prisma.$queryRaw`SELECT 1 as test`;

        // Test connection pool
        const connectionInfo = (await prisma.$queryRaw`
          SELECT 
            count(*) as total_connections,
            count(*) FILTER (WHERE state = 'active') as active_connections
          FROM pg_stat_activity 
          WHERE datname = current_database()
        `) as any[];

        await prisma.$disconnect();

        return { queryResult: result, connectionInfo: connectionInfo[0] };
      });

      if (time < 1000) {
        this.addResult(
          'Database',
          'healthy',
          'Database connection healthy',
          time,
          result.connectionInfo
        );
      } else if (time < 5000) {
        this.addResult(
          'Database',
          'degraded',
          'Database connection slow',
          time,
          result.connectionInfo
        );
      } else {
        this.addResult(
          'Database',
          'unhealthy',
          'Database connection very slow',
          time,
          result.connectionInfo
        );
      }
    } catch (error) {
      this.addResult(
        'Database',
        'unhealthy',
        `Database connection failed: ${error}`
      );
    }
  }

  /**
   * Check Redis health
   */
  async checkRedis(): Promise<void> {
    try {
      const { result, time } = await this.measureTime(async () => {
        const redis = createClient({ url: env.REDIS_URL });
        await redis.connect();

        // Test basic operations
        const pingResult = await redis.ping();
        await redis.set('health_check', 'test', { EX: 10 });
        const getValue = await redis.get('health_check');
        await redis.del('health_check');

        // Get Redis info
        const info = await redis.info('memory');
        const memoryInfo = this.parseRedisInfo(info);

        await redis.disconnect();

        return { ping: pingResult, getValue, memoryInfo };
      });

      if (time < 100) {
        this.addResult(
          'Redis',
          'healthy',
          'Redis connection healthy',
          time,
          result.memoryInfo
        );
      } else if (time < 500) {
        this.addResult(
          'Redis',
          'degraded',
          'Redis connection slow',
          time,
          result.memoryInfo
        );
      } else {
        this.addResult(
          'Redis',
          'unhealthy',
          'Redis connection very slow',
          time,
          result.memoryInfo
        );
      }
    } catch (error) {
      this.addResult('Redis', 'unhealthy', `Redis connection failed: ${error}`);
    }
  }

  /**
   * Check Elasticsearch health
   */
  async checkElasticsearch(): Promise<void> {
    if (!env.ELASTICSEARCH_URL) {
      this.addResult(
        'Elasticsearch',
        'degraded',
        'Elasticsearch not configured'
      );
      return;
    }

    try {
      const { result, time } = await this.measureTime(async () => {
        const client = new Client({
          node: env.ELASTICSEARCH_URL!,
          auth:
            env.ELASTICSEARCH_USERNAME && env.ELASTICSEARCH_PASSWORD
              ? {
                  username: env.ELASTICSEARCH_USERNAME,
                  password: env.ELASTICSEARCH_PASSWORD,
                }
              : undefined,
          requestTimeout: 5000,
        });

        const health = await client.cluster.health();
        const stats = await client.cluster.stats();

        return { health, stats };
      });

      const { status } = result.health;
      if (status === 'green') {
        this.addResult(
          'Elasticsearch',
          'healthy',
          `Elasticsearch cluster healthy (${status})`,
          time,
          {
            nodes: result.stats.nodes.count.total,
            indices: result.stats.indices.count,
          }
        );
      } else if (status === 'yellow') {
        this.addResult(
          'Elasticsearch',
          'degraded',
          `Elasticsearch cluster degraded (${status})`,
          time,
          result.health
        );
      } else {
        this.addResult(
          'Elasticsearch',
          'unhealthy',
          `Elasticsearch cluster unhealthy (${status})`,
          time,
          result.health
        );
      }
    } catch (error) {
      this.addResult(
        'Elasticsearch',
        'unhealthy',
        `Elasticsearch connection failed: ${error}`
      );
    }
  }

  /**
   * Check external API connectivity
   */
  async checkExternalAPIs(): Promise<void> {
    const apis = [
      {
        name: 'OpenAI',
        key: env.OPENAI_API_KEY,
        testUrl: 'https://api.openai.com/v1/models',
      },
      {
        name: 'SendGrid',
        key: env.SENDGRID_API_KEY,
        testUrl: 'https://api.sendgrid.com/v3/user/profile',
      },
    ];

    let healthyCount = 0;
    let totalConfigured = 0;

    for (const api of apis) {
      if (!api.key) {
        continue;
      }

      totalConfigured++;

      try {
        const { time } = await this.measureTime(async () => {
          const response = await fetch(api.testUrl, {
            method: 'GET',
            headers: {
              Authorization:
                api.name === 'OpenAI'
                  ? `Bearer ${api.key}`
                  : `Bearer ${api.key}`,
              'User-Agent': 'OpportuneX-HealthCheck/1.0',
            },
            signal: AbortSignal.timeout(5000),
          });

          return response.status;
        });

        if (time < 2000) {
          this.addResult(
            'External APIs',
            'healthy',
            `${api.name} API accessible`,
            time
          );
          healthyCount++;
        } else {
          this.addResult(
            'External APIs',
            'degraded',
            `${api.name} API slow`,
            time
          );
        }
      } catch (error) {
        this.addResult(
          'External APIs',
          'unhealthy',
          `${api.name} API failed: ${error}`
        );
      }
    }

    if (totalConfigured === 0) {
      this.addResult(
        'External APIs',
        'degraded',
        'No external APIs configured'
      );
    } else if (healthyCount === totalConfigured) {
      this.addResult(
        'External APIs',
        'healthy',
        `All ${totalConfigured} configured APIs healthy`
      );
    } else if (healthyCount > 0) {
      this.addResult(
        'External APIs',
        'degraded',
        `${healthyCount}/${totalConfigured} APIs healthy`
      );
    }
  }

  /**
   * Check system resources
   */
  async checkSystemResources(): Promise<void> {
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      const memoryMB = {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024),
      };

      const heapUsagePercent =
        (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

      if (heapUsagePercent < 70) {
        this.addResult(
          'System Resources',
          'healthy',
          `Memory usage normal (${heapUsagePercent.toFixed(1)}%)`,
          undefined,
          memoryMB
        );
      } else if (heapUsagePercent < 90) {
        this.addResult(
          'System Resources',
          'degraded',
          `Memory usage high (${heapUsagePercent.toFixed(1)}%)`,
          undefined,
          memoryMB
        );
      } else {
        this.addResult(
          'System Resources',
          'unhealthy',
          `Memory usage critical (${heapUsagePercent.toFixed(1)}%)`,
          undefined,
          memoryMB
        );
      }
    } catch (error) {
      this.addResult(
        'System Resources',
        'unhealthy',
        `System resource check failed: ${error}`
      );
    }
  }

  /**
   * Parse Redis info string
   */
  private parseRedisInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    info.split('\r\n').forEach(line => {
      if (line.includes(':')) {
        const [key, value] = line.split(':');
        result[key] = value;
      }
    });
    return result;
  }

  /**
   * Run all health checks
   */
  async runAllChecks(): Promise<HealthCheckResult[]> {
    console.log('🏥 Starting comprehensive environment health check...\n');

    await this.checkEnvironmentConfig();
    await this.checkSecretsManagement();
    await this.checkDatabase();
    await this.checkRedis();
    await this.checkElasticsearch();
    await this.checkExternalAPIs();
    await this.checkSystemResources();

    return this.results;
  }

  /**
   * Get overall health status
   */
  getOverallHealth(): 'healthy' | 'degraded' | 'unhealthy' {
    const unhealthyCount = this.results.filter(
      r => r.status === 'unhealthy'
    ).length;
    const degradedCount = this.results.filter(
      r => r.status === 'degraded'
    ).length;

    if (unhealthyCount > 0) return 'unhealthy';
    if (degradedCount > 0) return 'degraded';
    return 'healthy';
  }

  /**
   * Print health check results
   */
  printResults(format: 'console' | 'json' = 'console'): void {
    if (format === 'json') {
      console.log(
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            environment: env.NODE_ENV,
            overallHealth: this.getOverallHealth(),
            results: this.results,
          },
          null,
          2
        )
      );
      return;
    }

    console.log('\n🏥 Environment Health Check Results');
    console.log('='.repeat(60));
    console.log(`Environment: ${env.NODE_ENV}`);
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Overall Status: ${this.getOverallHealth().toUpperCase()}`);
    console.log('');

    this.results.forEach(result => {
      const icon =
        result.status === 'healthy'
          ? '✅'
          : result.status === 'degraded'
            ? '⚠️'
            : '❌';
      const timeStr = result.responseTime ? ` (${result.responseTime}ms)` : '';

      console.log(`${icon} ${result.service}: ${result.message}${timeStr}`);

      if (
        result.details &&
        (result.status === 'degraded' || result.status === 'unhealthy')
      ) {
        console.log(
          `   Details: ${JSON.stringify(result.details, null, 2).replace(/\n/g, '\n   ')}`
        );
      }
    });

    // Summary
    const healthyCount = this.results.filter(
      r => r.status === 'healthy'
    ).length;
    const degradedCount = this.results.filter(
      r => r.status === 'degraded'
    ).length;
    const unhealthyCount = this.results.filter(
      r => r.status === 'unhealthy'
    ).length;
    const total = this.results.length;

    console.log(`\n${'='.repeat(60)}`);
    console.log(
      `Summary: ${healthyCount} healthy, ${degradedCount} degraded, ${unhealthyCount} unhealthy (${total} total)`
    );

    const overallHealth = this.getOverallHealth();
    if (overallHealth === 'unhealthy') {
      console.log(
        '\n❌ Environment is unhealthy. Immediate attention required.'
      );
    } else if (overallHealth === 'degraded') {
      console.log('\n⚠️  Environment is degraded. Some issues need attention.');
    } else {
      console.log('\n✅ Environment is healthy!');
    }
  }

  /**
   * Generate health check report for monitoring systems
   */
  generateMonitoringReport(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    environment: string;
    services: Record<
      string,
      {
        status: string;
        responseTime?: number;
        message: string;
      }
    >;
    summary: {
      total: number;
      healthy: number;
      degraded: number;
      unhealthy: number;
    };
  } {
    const services: Record<string, any> = {};

    this.results.forEach(result => {
      services[result.service] = {
        status: result.status,
        responseTime: result.responseTime,
        message: result.message,
      };
    });

    return {
      status: this.getOverallHealth(),
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      services,
      summary: {
        total: this.results.length,
        healthy: this.results.filter(r => r.status === 'healthy').length,
        degraded: this.results.filter(r => r.status === 'degraded').length,
        unhealthy: this.results.filter(r => r.status === 'unhealthy').length,
      },
    };
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const format = args.includes('--json') ? 'json' : 'console';
  const monitoring = args.includes('--monitoring');

  const checker = new EnvironmentHealthChecker();

  try {
    await checker.runAllChecks();

    if (monitoring) {
      const report = checker.generateMonitoringReport();
      console.log(JSON.stringify(report));
    } else {
      checker.printResults(format);
    }

    const overallHealth = checker.getOverallHealth();
    process.exit(overallHealth === 'unhealthy' ? 1 : 0);
  } catch (error) {
    console.error('❌ Health check failed with error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { EnvironmentHealthChecker };
