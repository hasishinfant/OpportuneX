import { z } from 'zod';
import type {
  NotificationChannel,
  NotificationDelivery,
  NotificationStatus,
} from './notification.service';

// Delivery tracking interfaces
export interface DeliveryAttempt {
  id: string;
  deliveryId: string;
  attemptNumber: number;
  status: NotificationStatus;
  timestamp: Date;
  responseCode?: number;
  responseMessage?: string;
  errorDetails?: string;
  retryAfter?: Date;
  metadata?: Record<string, any>;
}

export interface DeliveryRule {
  id: string;
  name: string;
  channel: NotificationChannel;
  maxRetries: number;
  retryIntervals: number[]; // in minutes
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
  failureThreshold: number; // percentage
  circuitBreakerDuration: number; // in minutes
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DeliveryStats {
  channel: NotificationChannel;
  period: 'hour' | 'day' | 'week' | 'month';
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalBounced: number;
  deliveryRate: number;
  avgDeliveryTime: number; // in milliseconds
  retryRate: number;
  circuitBreakerTriggered: boolean;
  lastUpdated: Date;
}

export interface CircuitBreakerState {
  channel: NotificationChannel;
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  lastFailureTime?: Date;
  nextRetryTime?: Date;
  openedAt?: Date;
}

// Validation schemas
const deliveryRuleSchema = z.object({
  name: z.string().min(1).max(100),
  channel: z.enum(['email', 'sms', 'in_app', 'push']),
  maxRetries: z.number().min(0).max(10),
  retryIntervals: z.array(z.number().positive()).min(1),
  backoffStrategy: z.enum(['fixed', 'exponential', 'linear']),
  failureThreshold: z.number().min(0).max(100),
  circuitBreakerDuration: z.number().positive(),
});

// Notification delivery tracking service
export class NotificationDeliveryService {
  private deliveries: Map<string, NotificationDelivery> = new Map();
  private attempts: Map<string, DeliveryAttempt[]> = new Map();
  private rules: Map<NotificationChannel, DeliveryRule> = new Map();
  private circuitBreakers: Map<NotificationChannel, CircuitBreakerState> =
    new Map();
  private retryQueue: Map<string, NodeJS.Timeout> = new Map();
  private statsCache: Map<string, DeliveryStats> = new Map();

  constructor() {
    this.initializeDefaultRules();
    this.initializeCircuitBreakers();
    this.startStatsProcessor();
  }

  // Initialize default delivery rules
  private initializeDefaultRules(): void {
    const defaultRules: Array<
      Omit<DeliveryRule, 'id' | 'createdAt' | 'updatedAt'>
    > = [
      {
        name: 'Email Delivery Rule',
        channel: 'email',
        maxRetries: 3,
        retryIntervals: [5, 15, 60], // 5min, 15min, 1hour
        backoffStrategy: 'exponential',
        failureThreshold: 20, // 20% failure rate triggers circuit breaker
        circuitBreakerDuration: 30, // 30 minutes
        active: true,
      },
      {
        name: 'SMS Delivery Rule',
        channel: 'sms',
        maxRetries: 2,
        retryIntervals: [2, 10], // 2min, 10min
        backoffStrategy: 'fixed',
        failureThreshold: 30, // 30% failure rate
        circuitBreakerDuration: 15, // 15 minutes
        active: true,
      },
      {
        name: 'Push Notification Rule',
        channel: 'push',
        maxRetries: 3,
        retryIntervals: [1, 5, 30], // 1min, 5min, 30min
        backoffStrategy: 'linear',
        failureThreshold: 25, // 25% failure rate
        circuitBreakerDuration: 20, // 20 minutes
        active: true,
      },
      {
        name: 'In-App Notification Rule',
        channel: 'in_app',
        maxRetries: 1,
        retryIntervals: [1], // 1min
        backoffStrategy: 'fixed',
        failureThreshold: 50, // 50% failure rate
        circuitBreakerDuration: 10, // 10 minutes
        active: true,
      },
    ];

    defaultRules.forEach(rule => {
      const fullRule: DeliveryRule = {
        ...rule,
        id: this.generateId(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.rules.set(rule.channel, fullRule);
    });
  }

  // Initialize circuit breakers
  private initializeCircuitBreakers(): void {
    const channels: NotificationChannel[] = ['email', 'sms', 'push', 'in_app'];

    channels.forEach(channel => {
      this.circuitBreakers.set(channel, {
        channel,
        state: 'closed',
        failureCount: 0,
      });
    });
  }

  // Track delivery attempt
  async trackDelivery(delivery: NotificationDelivery): Promise<void> {
    this.deliveries.set(delivery.id, delivery);

    const attempt: DeliveryAttempt = {
      id: this.generateId(),
      deliveryId: delivery.id,
      attemptNumber: delivery.attempts,
      status: delivery.status,
      timestamp: new Date(),
      responseCode: delivery.metadata?.responseCode,
      responseMessage: delivery.metadata?.responseMessage,
      errorDetails: delivery.failureReason,
      metadata: delivery.metadata,
    };

    const deliveryAttempts = this.attempts.get(delivery.id) || [];
    deliveryAttempts.push(attempt);
    this.attempts.set(delivery.id, deliveryAttempts);

    // Update circuit breaker state
    await this.updateCircuitBreaker(delivery.channel, delivery.status);

    // Schedule retry if needed
    if (delivery.status === 'failed') {
      await this.scheduleRetry(delivery);
    }

    // TODO: Store in database
    console.log(
      `Tracked delivery attempt for ${delivery.channel}: ${delivery.status}`
    );
  }

  // Update circuit breaker state
  private async updateCircuitBreaker(
    channel: NotificationChannel,
    status: NotificationStatus
  ): Promise<void> {
    const circuitBreaker = this.circuitBreakers.get(channel);
    const rule = this.rules.get(channel);

    if (!circuitBreaker || !rule) return;

    const now = new Date();

    if (status === 'failed' || status === 'bounced') {
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailureTime = now;

      // Check if we should open the circuit breaker
      if (circuitBreaker.state === 'closed') {
        const recentStats = await this.getChannelStats(channel, 'hour');
        const failureRate =
          recentStats.totalSent > 0
            ? ((recentStats.totalFailed + recentStats.totalBounced) /
                recentStats.totalSent) *
              100
            : 0;

        if (failureRate >= rule.failureThreshold) {
          circuitBreaker.state = 'open';
          circuitBreaker.openedAt = now;
          circuitBreaker.nextRetryTime = new Date(
            now.getTime() + rule.circuitBreakerDuration * 60 * 1000
          );

          console.log(
            `Circuit breaker OPENED for ${channel} (failure rate: ${failureRate.toFixed(1)}%)`
          );
        }
      }
    } else if (status === 'delivered') {
      // Reset failure count on successful delivery
      if (circuitBreaker.state === 'half-open') {
        circuitBreaker.state = 'closed';
        circuitBreaker.failureCount = 0;
        circuitBreaker.openedAt = undefined;
        circuitBreaker.nextRetryTime = undefined;

        console.log(`Circuit breaker CLOSED for ${channel}`);
      }
    }

    // Check if we should move from open to half-open
    if (
      circuitBreaker.state === 'open' &&
      circuitBreaker.nextRetryTime &&
      now >= circuitBreaker.nextRetryTime
    ) {
      circuitBreaker.state = 'half-open';
      console.log(`Circuit breaker moved to HALF-OPEN for ${channel}`);
    }

    this.circuitBreakers.set(channel, circuitBreaker);
  }

  // Check if delivery should be attempted
  async shouldAttemptDelivery(channel: NotificationChannel): Promise<boolean> {
    const circuitBreaker = this.circuitBreakers.get(channel);
    if (!circuitBreaker) return true;

    return circuitBreaker.state !== 'open';
  }

  // Schedule retry for failed delivery
  private async scheduleRetry(delivery: NotificationDelivery): Promise<void> {
    const rule = this.rules.get(delivery.channel);
    if (!rule || !rule.active) return;

    // Check if we've exceeded max retries
    if (delivery.attempts >= rule.maxRetries) {
      console.log(`Max retries exceeded for delivery ${delivery.id}`);
      return;
    }

    // Check circuit breaker
    const shouldAttempt = await this.shouldAttemptDelivery(delivery.channel);
    if (!shouldAttempt) {
      console.log(
        `Circuit breaker open, skipping retry for delivery ${delivery.id}`
      );
      return;
    }

    // Calculate retry delay
    const retryDelay = this.calculateRetryDelay(delivery, rule);
    const retryTime = new Date(Date.now() + retryDelay);

    // Clear existing retry timer
    const existingTimer = this.retryQueue.get(delivery.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule retry
    const timer = setTimeout(async () => {
      await this.retryDelivery(delivery.id);
      this.retryQueue.delete(delivery.id);
    }, retryDelay);

    this.retryQueue.set(delivery.id, timer);

    // Update delivery with retry time
    delivery.metadata = {
      ...delivery.metadata,
      nextRetryAt: retryTime.toISOString(),
    };

    console.log(
      `Scheduled retry for delivery ${delivery.id} in ${retryDelay}ms`
    );
  }

  // Calculate retry delay based on backoff strategy
  private calculateRetryDelay(
    delivery: NotificationDelivery,
    rule: DeliveryRule
  ): number {
    const attemptIndex = Math.min(
      delivery.attempts - 1,
      rule.retryIntervals.length - 1
    );
    const baseDelay = rule.retryIntervals[attemptIndex] * 60 * 1000; // Convert to milliseconds

    switch (rule.backoffStrategy) {
      case 'fixed':
        return baseDelay;

      case 'exponential':
        return baseDelay * Math.pow(2, delivery.attempts - 1);

      case 'linear':
        return baseDelay * delivery.attempts;

      default:
        return baseDelay;
    }
  }

  // Retry failed delivery
  private async retryDelivery(deliveryId: string): Promise<void> {
    const delivery = this.deliveries.get(deliveryId);
    if (!delivery) return;

    try {
      // Check circuit breaker again
      const shouldAttempt = await this.shouldAttemptDelivery(delivery.channel);
      if (!shouldAttempt) {
        console.log(
          `Circuit breaker open, aborting retry for delivery ${deliveryId}`
        );
        return;
      }

      // Increment attempt count
      delivery.attempts++;
      delivery.lastAttemptAt = new Date();
      delivery.status = 'pending';
      delivery.updatedAt = new Date();

      // TODO: Implement actual retry logic by calling the appropriate service
      // For now, simulate retry
      console.log(
        `Retrying delivery ${deliveryId} (attempt ${delivery.attempts})`
      );

      // Simulate retry result
      const success = Math.random() > 0.3; // 70% success rate for retries

      if (success) {
        delivery.status = 'delivered';
        delivery.deliveredAt = new Date();
        console.log(`Retry successful for delivery ${deliveryId}`);
      } else {
        delivery.status = 'failed';
        delivery.failureReason = 'Retry failed';
        console.log(`Retry failed for delivery ${deliveryId}`);

        // Schedule another retry if within limits
        await this.scheduleRetry(delivery);
      }

      this.deliveries.set(deliveryId, delivery);
      await this.trackDelivery(delivery);
    } catch (error) {
      console.error(`Error retrying delivery ${deliveryId}:`, error);
      delivery.status = 'failed';
      delivery.failureReason =
        error instanceof Error ? error.message : 'Retry error';
      this.deliveries.set(deliveryId, delivery);
    }
  }

  // Get delivery status
  async getDeliveryStatus(deliveryId: string): Promise<{
    delivery: NotificationDelivery | null;
    attempts: DeliveryAttempt[];
  }> {
    const delivery = this.deliveries.get(deliveryId);
    const attempts = this.attempts.get(deliveryId) || [];

    return {
      delivery: delivery || null,
      attempts: attempts.sort(
        (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
      ),
    };
  }

  // Get delivery statistics for a channel
  async getChannelStats(
    channel: NotificationChannel,
    period: 'hour' | 'day' | 'week' | 'month'
  ): Promise<DeliveryStats> {
    const cacheKey = `${channel}-${period}`;
    const cached = this.statsCache.get(cacheKey);

    // Return cached stats if less than 5 minutes old
    if (cached && Date.now() - cached.lastUpdated.getTime() < 5 * 60 * 1000) {
      return cached;
    }

    // Calculate period start time
    const now = new Date();
    const periodStart = new Date();

    switch (period) {
      case 'hour':
        periodStart.setHours(now.getHours(), 0, 0, 0);
        break;
      case 'day':
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'week':
        periodStart.setDate(now.getDate() - now.getDay());
        periodStart.setHours(0, 0, 0, 0);
        break;
      case 'month':
        periodStart.setDate(1);
        periodStart.setHours(0, 0, 0, 0);
        break;
    }

    // Filter deliveries for the period and channel
    const periodDeliveries = Array.from(this.deliveries.values()).filter(
      delivery =>
        delivery.channel === channel && delivery.createdAt >= periodStart
    );

    // Calculate statistics
    const totalSent = periodDeliveries.length;
    const totalDelivered = periodDeliveries.filter(
      d => d.status === 'delivered'
    ).length;
    const totalFailed = periodDeliveries.filter(
      d => d.status === 'failed'
    ).length;
    const totalBounced = periodDeliveries.filter(
      d => d.status === 'bounced'
    ).length;

    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

    // Calculate average delivery time
    const deliveredDeliveries = periodDeliveries.filter(
      d => d.status === 'delivered' && d.deliveredAt
    );
    const avgDeliveryTime =
      deliveredDeliveries.length > 0
        ? deliveredDeliveries.reduce((sum, d) => {
            return sum + (d.deliveredAt!.getTime() - d.createdAt.getTime());
          }, 0) / deliveredDeliveries.length
        : 0;

    // Calculate retry rate
    const retriedDeliveries = periodDeliveries.filter(
      d => d.attempts > 1
    ).length;
    const retryRate = totalSent > 0 ? (retriedDeliveries / totalSent) * 100 : 0;

    // Check circuit breaker state
    const circuitBreaker = this.circuitBreakers.get(channel);
    const circuitBreakerTriggered =
      circuitBreaker?.state === 'open' || circuitBreaker?.state === 'half-open';

    const stats: DeliveryStats = {
      channel,
      period,
      totalSent,
      totalDelivered,
      totalFailed,
      totalBounced,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      avgDeliveryTime: Math.round(avgDeliveryTime),
      retryRate: Math.round(retryRate * 100) / 100,
      circuitBreakerTriggered: circuitBreakerTriggered || false,
      lastUpdated: now,
    };

    // Cache the stats
    this.statsCache.set(cacheKey, stats);

    return stats;
  }

  // Get overall delivery statistics
  async getOverallStats(period: 'hour' | 'day' | 'week' | 'month'): Promise<{
    byChannel: Record<NotificationChannel, DeliveryStats>;
    overall: {
      totalSent: number;
      totalDelivered: number;
      totalFailed: number;
      deliveryRate: number;
      avgDeliveryTime: number;
    };
  }> {
    const channels: NotificationChannel[] = ['email', 'sms', 'push', 'in_app'];
    const byChannel: Record<NotificationChannel, DeliveryStats> = {} as any;

    let totalSent = 0;
    let totalDelivered = 0;
    let totalFailed = 0;
    let totalDeliveryTime = 0;
    let deliveredCount = 0;

    for (const channel of channels) {
      const stats = await this.getChannelStats(channel, period);
      byChannel[channel] = stats;

      totalSent += stats.totalSent;
      totalDelivered += stats.totalDelivered;
      totalFailed += stats.totalFailed;

      if (stats.totalDelivered > 0) {
        totalDeliveryTime += stats.avgDeliveryTime * stats.totalDelivered;
        deliveredCount += stats.totalDelivered;
      }
    }

    const overall = {
      totalSent,
      totalDelivered,
      totalFailed,
      deliveryRate:
        totalSent > 0
          ? Math.round((totalDelivered / totalSent) * 10000) / 100
          : 0,
      avgDeliveryTime:
        deliveredCount > 0 ? Math.round(totalDeliveryTime / deliveredCount) : 0,
    };

    return { byChannel, overall };
  }

  // Get circuit breaker states
  getCircuitBreakerStates(): CircuitBreakerState[] {
    return Array.from(this.circuitBreakers.values());
  }

  // Manually reset circuit breaker
  async resetCircuitBreaker(channel: NotificationChannel): Promise<boolean> {
    const circuitBreaker = this.circuitBreakers.get(channel);
    if (!circuitBreaker) return false;

    circuitBreaker.state = 'closed';
    circuitBreaker.failureCount = 0;
    circuitBreaker.lastFailureTime = undefined;
    circuitBreaker.nextRetryTime = undefined;
    circuitBreaker.openedAt = undefined;

    this.circuitBreakers.set(channel, circuitBreaker);

    console.log(`Circuit breaker manually reset for ${channel}`);
    return true;
  }

  // Update delivery rule
  async updateDeliveryRule(
    channel: NotificationChannel,
    updates: Partial<
      Omit<DeliveryRule, 'id' | 'channel' | 'createdAt' | 'updatedAt'>
    >
  ): Promise<DeliveryRule | null> {
    const rule = this.rules.get(channel);
    if (!rule) return null;

    // Validate updates
    const validatedUpdates = deliveryRuleSchema.partial().parse(updates);

    // Apply updates
    Object.assign(rule, validatedUpdates, { updatedAt: new Date() });
    this.rules.set(channel, rule);

    // TODO: Update in database
    console.log(`Updated delivery rule for ${channel}`);

    return rule;
  }

  // Get delivery rules
  getDeliveryRules(): DeliveryRule[] {
    return Array.from(this.rules.values());
  }

  // Start statistics processor
  private startStatsProcessor(): void {
    // Clear stats cache every 5 minutes
    setInterval(
      () => {
        this.statsCache.clear();
      },
      5 * 60 * 1000
    );

    console.log('Delivery statistics processor started');
  }

  // Clean up old delivery records
  async cleanupOldDeliveries(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    let cleanedCount = 0;

    // Clean up deliveries
    for (const [id, delivery] of this.deliveries.entries()) {
      if (delivery.createdAt < cutoffDate) {
        this.deliveries.delete(id);
        this.attempts.delete(id);
        cleanedCount++;
      }
    }

    // TODO: Clean up from database
    console.log(`Cleaned up ${cleanedCount} old delivery records`);

    return cleanedCount;
  }

  // Cancel pending retries for a delivery
  async cancelRetries(deliveryId: string): Promise<boolean> {
    const timer = this.retryQueue.get(deliveryId);
    if (timer) {
      clearTimeout(timer);
      this.retryQueue.delete(deliveryId);
      console.log(`Cancelled retries for delivery ${deliveryId}`);
      return true;
    }
    return false;
  }

  // Get retry queue status
  getRetryQueueStatus(): Array<{
    deliveryId: string;
    channel: NotificationChannel;
    attempts: number;
    nextRetryAt?: string;
  }> {
    const status: Array<{
      deliveryId: string;
      channel: NotificationChannel;
      attempts: number;
      nextRetryAt?: string;
    }> = [];

    for (const deliveryId of this.retryQueue.keys()) {
      const delivery = this.deliveries.get(deliveryId);
      if (delivery) {
        status.push({
          deliveryId,
          channel: delivery.channel,
          attempts: delivery.attempts,
          nextRetryAt: delivery.metadata?.nextRetryAt,
        });
      }
    }

    return status;
  }

  // Generate unique ID
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// Export singleton instance
export const notificationDeliveryService = new NotificationDeliveryService();
