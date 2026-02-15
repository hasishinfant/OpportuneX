/**
 * Horizontal Scaling Configuration for OpportuneX
 * Provides configuration and utilities for horizontal scaling
 */

import { metricsCollector } from './metrics-collector';
import { logger } from './monitoring';

// Scaling configuration interface
export interface ScalingConfig {
  // Instance configuration
  instance: {
    id: string;
    region: string;
    zone: string;
    type: 'web' | 'api' | 'worker' | 'scheduler';
    version: string;
  };

  // Load balancing configuration
  loadBalancer: {
    enabled: boolean;
    algorithm: 'round_robin' | 'least_connections' | 'ip_hash' | 'weighted';
    healthCheckPath: string;
    healthCheckInterval: number;
    healthCheckTimeout: number;
    maxRetries: number;
  };

  // Auto-scaling configuration
  autoScaling: {
    enabled: boolean;
    minInstances: number;
    maxInstances: number;
    targetCpuUtilization: number;
    targetMemoryUtilization: number;
    scaleUpCooldown: number; // seconds
    scaleDownCooldown: number; // seconds
    metrics: {
      cpuThreshold: number;
      memoryThreshold: number;
      responseTimeThreshold: number; // ms
      errorRateThreshold: number; // percentage
      requestRateThreshold: number; // requests per second
    };
  };

  // Session management for stateless scaling
  session: {
    store: 'redis' | 'database' | 'memory';
    ttl: number; // seconds
    prefix: string;
    secure: boolean;
  };

  // Distributed caching configuration
  cache: {
    distributed: boolean;
    consistency: 'eventual' | 'strong';
    replication: {
      enabled: boolean;
      factor: number; // number of replicas
    };
    partitioning: {
      enabled: boolean;
      strategy: 'hash' | 'range' | 'directory';
    };
  };

  // Database scaling configuration
  database: {
    readReplicas: {
      enabled: boolean;
      count: number;
      regions: string[];
    };
    connectionPooling: {
      enabled: boolean;
      maxConnections: number;
      minConnections: number;
      acquireTimeout: number;
      idleTimeout: number;
    };
    sharding: {
      enabled: boolean;
      strategy: 'user_id' | 'tenant_id' | 'geographic';
      shards: Array<{
        id: string;
        weight: number;
        region: string;
      }>;
    };
  };

  // Service discovery configuration
  serviceDiscovery: {
    enabled: boolean;
    provider: 'consul' | 'etcd' | 'kubernetes' | 'aws_ecs';
    namespace: string;
    tags: string[];
    healthCheck: {
      enabled: boolean;
      interval: number;
      timeout: number;
      deregisterAfter: number;
    };
  };

  // Circuit breaker configuration
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    recoveryTimeout: number;
    monitoringPeriod: number;
  };

  // Rate limiting configuration
  rateLimiting: {
    enabled: boolean;
    strategy: 'fixed_window' | 'sliding_window' | 'token_bucket';
    limits: Array<{
      path: string;
      method: string;
      limit: number;
      window: number; // seconds
      skipSuccessfulRequests: boolean;
      skipFailedRequests: boolean;
    }>;
  };
}

class ScalingManager {
  private config: ScalingConfig;
  private instanceMetrics: Map<string, any> = new Map();
  private lastScalingAction: Date | null = null;

  constructor() {
    this.config = this.loadScalingConfig();
    this.setupMetricsCollection();
    this.registerInstance();
  }

  /**
   * Load scaling configuration from environment
   */
  private loadScalingConfig(): ScalingConfig {
    return {
      instance: {
        id: process.env.INSTANCE_ID || `instance_${Date.now()}`,
        region: process.env.AWS_REGION || process.env.REGION || 'us-east-1',
        zone: process.env.AVAILABILITY_ZONE || 'us-east-1a',
        type: (process.env.INSTANCE_TYPE as any) || 'web',
        version: process.env.APP_VERSION || '1.0.0',
      },

      loadBalancer: {
        enabled: process.env.LOAD_BALANCER_ENABLED === 'true',
        algorithm: (process.env.LB_ALGORITHM as any) || 'round_robin',
        healthCheckPath: process.env.HEALTH_CHECK_PATH || '/api/health/live',
        healthCheckInterval: parseInt(
          process.env.HEALTH_CHECK_INTERVAL || '30'
        ),
        healthCheckTimeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5'),
        maxRetries: parseInt(process.env.HEALTH_CHECK_MAX_RETRIES || '3'),
      },

      autoScaling: {
        enabled: process.env.AUTO_SCALING_ENABLED === 'true',
        minInstances: parseInt(process.env.MIN_INSTANCES || '2'),
        maxInstances: parseInt(process.env.MAX_INSTANCES || '10'),
        targetCpuUtilization: parseInt(
          process.env.TARGET_CPU_UTILIZATION || '70'
        ),
        targetMemoryUtilization: parseInt(
          process.env.TARGET_MEMORY_UTILIZATION || '80'
        ),
        scaleUpCooldown: parseInt(process.env.SCALE_UP_COOLDOWN || '300'),
        scaleDownCooldown: parseInt(process.env.SCALE_DOWN_COOLDOWN || '600'),
        metrics: {
          cpuThreshold: parseInt(process.env.CPU_THRESHOLD || '80'),
          memoryThreshold: parseInt(process.env.MEMORY_THRESHOLD || '85'),
          responseTimeThreshold: parseInt(
            process.env.RESPONSE_TIME_THRESHOLD || '1000'
          ),
          errorRateThreshold: parseInt(process.env.ERROR_RATE_THRESHOLD || '5'),
          requestRateThreshold: parseInt(
            process.env.REQUEST_RATE_THRESHOLD || '1000'
          ),
        },
      },

      session: {
        store: (process.env.SESSION_STORE as any) || 'redis',
        ttl: parseInt(process.env.SESSION_TTL || '3600'),
        prefix: process.env.SESSION_PREFIX || 'opportunex:session:',
        secure: process.env.NODE_ENV === 'production',
      },

      cache: {
        distributed: process.env.DISTRIBUTED_CACHE === 'true',
        consistency: (process.env.CACHE_CONSISTENCY as any) || 'eventual',
        replication: {
          enabled: process.env.CACHE_REPLICATION === 'true',
          factor: parseInt(process.env.CACHE_REPLICATION_FACTOR || '2'),
        },
        partitioning: {
          enabled: process.env.CACHE_PARTITIONING === 'true',
          strategy: (process.env.CACHE_PARTITIONING_STRATEGY as any) || 'hash',
        },
      },

      database: {
        readReplicas: {
          enabled: process.env.DB_READ_REPLICAS === 'true',
          count: parseInt(process.env.DB_READ_REPLICA_COUNT || '2'),
          regions: (process.env.DB_READ_REPLICA_REGIONS || '')
            .split(',')
            .filter(Boolean),
        },
        connectionPooling: {
          enabled: process.env.DB_CONNECTION_POOLING === 'true',
          maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
          minConnections: parseInt(process.env.DB_MIN_CONNECTIONS || '5'),
          acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '10000'),
          idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
        },
        sharding: {
          enabled: process.env.DB_SHARDING === 'true',
          strategy: (process.env.DB_SHARDING_STRATEGY as any) || 'user_id',
          shards: this.parseShardConfig(process.env.DB_SHARDS || ''),
        },
      },

      serviceDiscovery: {
        enabled: process.env.SERVICE_DISCOVERY === 'true',
        provider:
          (process.env.SERVICE_DISCOVERY_PROVIDER as any) || 'kubernetes',
        namespace: process.env.SERVICE_DISCOVERY_NAMESPACE || 'default',
        tags: (process.env.SERVICE_DISCOVERY_TAGS || '')
          .split(',')
          .filter(Boolean),
        healthCheck: {
          enabled: process.env.SERVICE_DISCOVERY_HEALTH_CHECK === 'true',
          interval: parseInt(
            process.env.SERVICE_DISCOVERY_HEALTH_INTERVAL || '30'
          ),
          timeout: parseInt(
            process.env.SERVICE_DISCOVERY_HEALTH_TIMEOUT || '5'
          ),
          deregisterAfter: parseInt(
            process.env.SERVICE_DISCOVERY_DEREGISTER_AFTER || '90'
          ),
        },
      },

      circuitBreaker: {
        enabled: process.env.CIRCUIT_BREAKER === 'true',
        failureThreshold: parseInt(
          process.env.CIRCUIT_BREAKER_FAILURE_THRESHOLD || '5'
        ),
        recoveryTimeout: parseInt(
          process.env.CIRCUIT_BREAKER_RECOVERY_TIMEOUT || '60'
        ),
        monitoringPeriod: parseInt(
          process.env.CIRCUIT_BREAKER_MONITORING_PERIOD || '60'
        ),
      },

      rateLimiting: {
        enabled: process.env.RATE_LIMITING === 'true',
        strategy:
          (process.env.RATE_LIMITING_STRATEGY as any) || 'sliding_window',
        limits: this.parseRateLimits(process.env.RATE_LIMITS || ''),
      },
    };
  }

  /**
   * Parse shard configuration from environment
   */
  private parseShardConfig(
    shardsConfig: string
  ): Array<{ id: string; weight: number; region: string }> {
    if (!shardsConfig) return [];

    try {
      return JSON.parse(shardsConfig);
    } catch {
      return [];
    }
  }

  /**
   * Parse rate limits configuration from environment
   */
  private parseRateLimits(rateLimitsConfig: string): Array<{
    path: string;
    method: string;
    limit: number;
    window: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
  }> {
    if (!rateLimitsConfig) {
      return [
        {
          path: '/api/*',
          method: '*',
          limit: 100,
          window: 60,
          skipSuccessfulRequests: false,
          skipFailedRequests: false,
        },
      ];
    }

    try {
      return JSON.parse(rateLimitsConfig);
    } catch {
      return [];
    }
  }

  /**
   * Setup metrics collection for scaling decisions
   */
  private setupMetricsCollection() {
    // Collect scaling metrics every 30 seconds
    setInterval(() => {
      this.collectScalingMetrics();
    }, 30000);

    // Initial collection
    this.collectScalingMetrics();
  }

  /**
   * Collect metrics for scaling decisions
   */
  private collectScalingMetrics() {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Calculate memory usage percentage
      const memoryUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      // Record scaling metrics
      metricsCollector
        .getRegistry()
        .setGauge('scaling_memory_usage_percent', memoryUsagePercent, {
          instance_id: this.config.instance.id,
          instance_type: this.config.instance.type,
        });

      metricsCollector
        .getRegistry()
        .setGauge('scaling_cpu_usage_user', cpuUsage.user, {
          instance_id: this.config.instance.id,
          instance_type: this.config.instance.type,
        });

      metricsCollector
        .getRegistry()
        .setGauge('scaling_cpu_usage_system', cpuUsage.system, {
          instance_id: this.config.instance.id,
          instance_type: this.config.instance.type,
        });

      // Store metrics for scaling decisions
      this.instanceMetrics.set('memory_usage_percent', memoryUsagePercent);
      this.instanceMetrics.set('cpu_usage_user', cpuUsage.user);
      this.instanceMetrics.set('cpu_usage_system', cpuUsage.system);

      // Check if scaling action is needed
      if (this.config.autoScaling.enabled) {
        this.evaluateScalingNeeds();
      }
    } catch (error) {
      logger.error('Failed to collect scaling metrics', error);
    }
  }

  /**
   * Evaluate if scaling action is needed
   */
  private evaluateScalingNeeds() {
    const now = new Date();
    const memoryUsage = this.instanceMetrics.get('memory_usage_percent') || 0;

    // Check cooldown period
    if (this.lastScalingAction) {
      const timeSinceLastAction =
        now.getTime() - this.lastScalingAction.getTime();
      const cooldownPeriod = this.config.autoScaling.scaleUpCooldown * 1000;

      if (timeSinceLastAction < cooldownPeriod) {
        return; // Still in cooldown
      }
    }

    // Check if scale up is needed
    if (memoryUsage > this.config.autoScaling.metrics.memoryThreshold) {
      this.requestScaleUp('High memory usage');
    }
    // Check if scale down is possible (simplified logic)
    else if (
      memoryUsage <
      this.config.autoScaling.metrics.memoryThreshold * 0.5
    ) {
      this.requestScaleDown('Low memory usage');
    }
  }

  /**
   * Request scale up action
   */
  private requestScaleUp(reason: string) {
    logger.info('Requesting scale up', {
      reason,
      instanceId: this.config.instance.id,
      currentMetrics: Object.fromEntries(this.instanceMetrics),
    });

    // Record scaling event
    metricsCollector.getRegistry().incrementCounter('scaling_events_total', 1, {
      action: 'scale_up',
      reason,
      instance_id: this.config.instance.id,
    });

    this.lastScalingAction = new Date();

    // In a real implementation, this would trigger the actual scaling action
    // through your orchestration platform (Kubernetes, AWS ECS, etc.)
    this.triggerScalingAction('scale_up', reason);
  }

  /**
   * Request scale down action
   */
  private requestScaleDown(reason: string) {
    logger.info('Requesting scale down', {
      reason,
      instanceId: this.config.instance.id,
      currentMetrics: Object.fromEntries(this.instanceMetrics),
    });

    // Record scaling event
    metricsCollector.getRegistry().incrementCounter('scaling_events_total', 1, {
      action: 'scale_down',
      reason,
      instance_id: this.config.instance.id,
    });

    this.lastScalingAction = new Date();

    // In a real implementation, this would trigger the actual scaling action
    this.triggerScalingAction('scale_down', reason);
  }

  /**
   * Trigger actual scaling action
   */
  private async triggerScalingAction(
    action: 'scale_up' | 'scale_down',
    reason: string
  ) {
    try {
      // This would integrate with your orchestration platform
      if (process.env.SCALING_WEBHOOK_URL) {
        await fetch(process.env.SCALING_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.SCALING_WEBHOOK_TOKEN}`,
          },
          body: JSON.stringify({
            action,
            reason,
            instance: this.config.instance,
            metrics: Object.fromEntries(this.instanceMetrics),
            timestamp: new Date().toISOString(),
          }),
        });
      }

      logger.info('Scaling action triggered', { action, reason });
    } catch (error) {
      logger.error('Failed to trigger scaling action', error, {
        action,
        reason,
      });
    }
  }

  /**
   * Register instance with service discovery
   */
  private async registerInstance() {
    if (!this.config.serviceDiscovery.enabled) {
      return;
    }

    try {
      const registration = {
        id: this.config.instance.id,
        name: 'opportunex',
        tags: [
          ...this.config.serviceDiscovery.tags,
          `version:${this.config.instance.version}`,
          `type:${this.config.instance.type}`,
          `region:${this.config.instance.region}`,
        ],
        address: process.env.INSTANCE_IP || 'localhost',
        port: parseInt(process.env.PORT || '3000'),
        check: this.config.serviceDiscovery.healthCheck.enabled
          ? {
              http: `http://localhost:${process.env.PORT || '3000'}${this.config.loadBalancer.healthCheckPath}`,
              interval: `${this.config.serviceDiscovery.healthCheck.interval}s`,
              timeout: `${this.config.serviceDiscovery.healthCheck.timeout}s`,
              deregister_critical_service_after: `${this.config.serviceDiscovery.healthCheck.deregisterAfter}s`,
            }
          : undefined,
      };

      // This would integrate with your service discovery provider
      logger.info('Instance registered with service discovery', {
        instanceId: this.config.instance.id,
        provider: this.config.serviceDiscovery.provider,
      });
    } catch (error) {
      logger.error('Failed to register instance with service discovery', error);
    }
  }

  /**
   * Get scaling configuration
   */
  getConfig(): ScalingConfig {
    return { ...this.config };
  }

  /**
   * Get instance metrics
   */
  getInstanceMetrics(): Record<string, any> {
    return Object.fromEntries(this.instanceMetrics);
  }

  /**
   * Get scaling status
   */
  getScalingStatus(): {
    autoScalingEnabled: boolean;
    lastScalingAction: Date | null;
    currentMetrics: Record<string, any>;
    thresholds: any;
  } {
    return {
      autoScalingEnabled: this.config.autoScaling.enabled,
      lastScalingAction: this.lastScalingAction,
      currentMetrics: this.getInstanceMetrics(),
      thresholds: this.config.autoScaling.metrics,
    };
  }

  /**
   * Generate Kubernetes deployment configuration
   */
  generateKubernetesConfig(): any {
    return {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: 'opportunex',
        labels: {
          app: 'opportunex',
          version: this.config.instance.version,
        },
      },
      spec: {
        replicas: this.config.autoScaling.minInstances,
        selector: {
          matchLabels: {
            app: 'opportunex',
          },
        },
        template: {
          metadata: {
            labels: {
              app: 'opportunex',
              version: this.config.instance.version,
            },
          },
          spec: {
            containers: [
              {
                name: 'opportunex',
                image: `opportunex:${this.config.instance.version}`,
                ports: [
                  {
                    containerPort: 3000,
                    name: 'http',
                  },
                ],
                env: Object.entries(process.env)
                  .filter(
                    ([key]) =>
                      key.startsWith('OPPORTUNEX_') ||
                      key.startsWith('DATABASE_') ||
                      key.startsWith('REDIS_')
                  )
                  .map(([name, value]) => ({ name, value })),
                resources: {
                  requests: {
                    cpu: '100m',
                    memory: '256Mi',
                  },
                  limits: {
                    cpu: '500m',
                    memory: '512Mi',
                  },
                },
                livenessProbe: {
                  httpGet: {
                    path: '/api/health/live',
                    port: 3000,
                  },
                  initialDelaySeconds: 30,
                  periodSeconds: 10,
                },
                readinessProbe: {
                  httpGet: {
                    path: '/api/health/ready',
                    port: 3000,
                  },
                  initialDelaySeconds: 5,
                  periodSeconds: 5,
                },
              },
            ],
          },
        },
      },
    };
  }

  /**
   * Generate Horizontal Pod Autoscaler configuration
   */
  generateHPAConfig(): any {
    if (!this.config.autoScaling.enabled) {
      return null;
    }

    return {
      apiVersion: 'autoscaling/v2',
      kind: 'HorizontalPodAutoscaler',
      metadata: {
        name: 'opportunex-hpa',
      },
      spec: {
        scaleTargetRef: {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          name: 'opportunex',
        },
        minReplicas: this.config.autoScaling.minInstances,
        maxReplicas: this.config.autoScaling.maxInstances,
        metrics: [
          {
            type: 'Resource',
            resource: {
              name: 'cpu',
              target: {
                type: 'Utilization',
                averageUtilization:
                  this.config.autoScaling.targetCpuUtilization,
              },
            },
          },
          {
            type: 'Resource',
            resource: {
              name: 'memory',
              target: {
                type: 'Utilization',
                averageUtilization:
                  this.config.autoScaling.targetMemoryUtilization,
              },
            },
          },
        ],
        behavior: {
          scaleUp: {
            stabilizationWindowSeconds: this.config.autoScaling.scaleUpCooldown,
            policies: [
              {
                type: 'Percent',
                value: 100,
                periodSeconds: 60,
              },
            ],
          },
          scaleDown: {
            stabilizationWindowSeconds:
              this.config.autoScaling.scaleDownCooldown,
            policies: [
              {
                type: 'Percent',
                value: 50,
                periodSeconds: 60,
              },
            ],
          },
        },
      },
    };
  }
}

// Singleton instance
export const scalingManager = new ScalingManager();

export default scalingManager;
