import { z } from 'zod';
import { env } from '../env';
import type { PushService } from './notification.service';

// Push notification configuration schema
const pushConfigSchema = z.object({
  vapidPublicKey: z.string().min(1),
  vapidPrivateKey: z.string().min(1),
  vapidSubject: z.string().min(1),
  fcmServerKey: z.string().optional(),
  apnsKeyId: z.string().optional(),
  apnsTeamId: z.string().optional(),
  apnsPrivateKey: z.string().optional(),
});

// Push subscription interface
export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Push notification payload
export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: number;
  image?: string;
  data?: Record<string, any>;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
  silent?: boolean;
  timestamp?: number;
  vibrate?: number[];
  sound?: string;
}

// Push delivery status
export interface PushDeliveryStatus {
  subscriptionId: string;
  userId: string;
  status: 'sent' | 'delivered' | 'failed' | 'expired';
  timestamp: Date;
  errorMessage?: string;
  httpStatusCode?: number;
}

// Web Push service implementation
export class WebPushService implements PushService {
  private config: z.infer<typeof pushConfigSchema>;
  private subscriptions: Map<string, PushSubscription> = new Map();

  constructor(config: {
    vapidPublicKey: string;
    vapidPrivateKey: string;
    vapidSubject: string;
    fcmServerKey?: string;
    apnsKeyId?: string;
    apnsTeamId?: string;
    apnsPrivateKey?: string;
  }) {
    this.config = pushConfigSchema.parse(config);
  }

  // Send push notification to a specific user
  async sendPushNotification(params: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    icon?: string;
    badge?: number;
    image?: string;
    actions?: Array<{
      action: string;
      title: string;
      icon?: string;
    }>;
    tag?: string;
    requireInteraction?: boolean;
    silent?: boolean;
  }): Promise<{ messageId: string; status: string }> {
    try {
      const userSubscriptions = await this.getUserSubscriptions(params.userId);

      if (userSubscriptions.length === 0) {
        throw new Error(
          `No push subscriptions found for user ${params.userId}`
        );
      }

      const payload: PushNotificationPayload = {
        title: params.title,
        body: params.body,
        icon: params.icon || '/icons/notification-icon.png',
        badge: params.badge || 1,
        image: params.image,
        data: {
          ...params.data,
          timestamp: Date.now(),
          userId: params.userId,
        },
        actions: params.actions,
        tag: params.tag,
        requireInteraction: params.requireInteraction || false,
        silent: params.silent || false,
        timestamp: Date.now(),
      };

      const results = await Promise.allSettled(
        userSubscriptions.map(subscription =>
          this.sendToSubscription(subscription, payload)
        )
      );

      const successCount = results.filter(
        result => result.status === 'fulfilled'
      ).length;
      const messageId = `push-${Date.now()}-${Math.random().toString(36).substring(2)}`;

      return {
        messageId,
        status: successCount > 0 ? 'sent' : 'failed',
      };
    } catch (error) {
      console.error('Push notification send error:', error);
      throw new Error(
        `Failed to send push notification: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  // Send push notification to multiple users
  async sendBulkPushNotification(params: {
    userIds: string[];
    title: string;
    body: string;
    data?: Record<string, any>;
    icon?: string;
    badge?: number;
    segmentationData?: Record<string, any>;
  }): Promise<Array<{ userId: string; messageId: string; status: string }>> {
    const results: Array<{
      userId: string;
      messageId: string;
      status: string;
    }> = [];

    for (const userId of params.userIds) {
      try {
        const result = await this.sendPushNotification({
          userId,
          title: params.title,
          body: params.body,
          data: params.data,
          icon: params.icon,
          badge: params.badge,
        });

        results.push({
          userId,
          messageId: result.messageId,
          status: result.status,
        });
      } catch (error) {
        results.push({
          userId,
          messageId: 'failed',
          status: 'failed',
        });
      }
    }

    return results;
  }

  // Send to specific subscription
  private async sendToSubscription(
    subscription: PushSubscription,
    payload: PushNotificationPayload
  ): Promise<PushDeliveryStatus> {
    try {
      const pushPayload = JSON.stringify(payload);

      // Simulate web push API call
      const response = await this.makeWebPushRequest(subscription, pushPayload);

      return {
        subscriptionId: subscription.id,
        userId: subscription.userId,
        status: response.success ? 'delivered' : 'failed',
        timestamp: new Date(),
        httpStatusCode: response.statusCode,
        errorMessage: response.error,
      };
    } catch (error) {
      return {
        subscriptionId: subscription.id,
        userId: subscription.userId,
        status: 'failed',
        timestamp: new Date(),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Make web push request (simplified implementation)
  private async makeWebPushRequest(
    subscription: PushSubscription,
    payload: string
  ): Promise<{ success: boolean; statusCode: number; error?: string }> {
    try {
      // In a real implementation, this would use the web-push library
      // to send notifications via FCM, Mozilla's push service, etc.

      // For now, we'll simulate the request
      console.log('🔔 Sending push notification:', {
        endpoint: subscription.endpoint,
        payloadLength: payload.length,
        userId: subscription.userId,
      });

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate success/failure based on subscription status
      if (!subscription.active) {
        return {
          success: false,
          statusCode: 410,
          error: 'Subscription expired',
        };
      }

      return {
        success: true,
        statusCode: 200,
      };
    } catch (error) {
      return {
        success: false,
        statusCode: 500,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Subscribe user to push notifications
  async subscribe(params: {
    userId: string;
    subscription: {
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
    };
    userAgent?: string;
    deviceType?: 'desktop' | 'mobile' | 'tablet';
  }): Promise<PushSubscription> {
    const subscriptionId = this.generateId();

    const pushSubscription: PushSubscription = {
      id: subscriptionId,
      userId: params.userId,
      endpoint: params.subscription.endpoint,
      keys: params.subscription.keys,
      userAgent: params.userAgent,
      deviceType: params.deviceType || 'desktop',
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.subscriptions.set(subscriptionId, pushSubscription);

    // TODO: Store in database
    console.log(`User ${params.userId} subscribed to push notifications`);

    return pushSubscription;
  }

  // Unsubscribe user from push notifications
  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.active = false;
      subscription.updatedAt = new Date();
      this.subscriptions.set(subscriptionId, subscription);

      // TODO: Update in database
      console.log(`Subscription ${subscriptionId} unsubscribed`);
    }
  }

  // Get user's push subscriptions
  async getUserSubscriptions(userId: string): Promise<PushSubscription[]> {
    // TODO: Implement database retrieval
    return Array.from(this.subscriptions.values()).filter(
      sub => sub.userId === userId && sub.active
    );
  }

  // Get all subscriptions (for admin purposes)
  async getAllSubscriptions(): Promise<PushSubscription[]> {
    // TODO: Implement database retrieval
    return Array.from(this.subscriptions.values());
  }

  // Clean up expired subscriptions
  async cleanupExpiredSubscriptions(): Promise<number> {
    let cleanedCount = 0;

    for (const [id, subscription] of this.subscriptions.entries()) {
      // Check if subscription is older than 30 days and inactive
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      if (!subscription.active && subscription.updatedAt < thirtyDaysAgo) {
        this.subscriptions.delete(id);
        cleanedCount++;
      }
    }

    // TODO: Implement database cleanup
    console.log(`Cleaned up ${cleanedCount} expired push subscriptions`);

    return cleanedCount;
  }

  // Get push notification statistics
  async getPushStats(
    userId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<{
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    deliveryRate: number;
    byDeviceType: {
      desktop: number;
      mobile: number;
      tablet: number;
    };
  }> {
    // TODO: Implement actual stats retrieval from database
    const subscriptions = userId
      ? await this.getUserSubscriptions(userId)
      : await this.getAllSubscriptions();

    const activeSubscriptions = subscriptions.filter(sub => sub.active);

    const byDeviceType = subscriptions.reduce(
      (acc, sub) => {
        acc[sub.deviceType] = (acc[sub.deviceType] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalSubscriptions: subscriptions.length,
      activeSubscriptions: activeSubscriptions.length,
      totalSent: 0, // TODO: Get from database
      totalDelivered: 0, // TODO: Get from database
      totalFailed: 0, // TODO: Get from database
      deliveryRate: 0, // TODO: Calculate from database
      byDeviceType: {
        desktop: byDeviceType.desktop || 0,
        mobile: byDeviceType.mobile || 0,
        tablet: byDeviceType.tablet || 0,
      },
    };
  }

  // Generate VAPID keys (for setup)
  static generateVAPIDKeys(): { publicKey: string; privateKey: string } {
    // In a real implementation, this would use the web-push library
    // to generate actual VAPID keys
    return {
      publicKey: `mock-public-key-${Math.random().toString(36).substring(2)}`,
      privateKey: `mock-private-key-${Math.random().toString(36).substring(2)}`,
    };
  }

  // Get VAPID public key for client-side subscription
  getVAPIDPublicKey(): string {
    return this.config.vapidPublicKey;
  }

  // Validate push subscription
  static isValidSubscription(subscription: any): boolean {
    return (
      subscription &&
      typeof subscription.endpoint === 'string' &&
      subscription.keys &&
      typeof subscription.keys.p256dh === 'string' &&
      typeof subscription.keys.auth === 'string'
    );
  }

  // Generate unique ID
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// Mock push service for development/testing
export class MockPushService implements PushService {
  private sentNotifications: Array<{
    userId: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    sentAt: Date;
  }> = [];

  async sendPushNotification(params: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    icon?: string;
    badge?: number;
  }): Promise<{ messageId: string; status: string }> {
    console.log('🔔 Mock Push Service - Sending push notification:', {
      userId: params.userId,
      title: params.title,
      body:
        params.body.substring(0, 50) + (params.body.length > 50 ? '...' : ''),
    });

    this.sentNotifications.push({
      userId: params.userId,
      title: params.title,
      body: params.body,
      data: params.data,
      sentAt: new Date(),
    });

    return {
      messageId: `mock-push-${Date.now()}-${Math.random().toString(36).substring(2)}`,
      status: 'sent',
    };
  }

  getSentNotifications() {
    return [...this.sentNotifications];
  }

  clearSentNotifications() {
    this.sentNotifications = [];
  }
}

// Factory function to create push service
export function createPushService(): PushService {
  if (env.NODE_ENV === 'test') {
    return new MockPushService();
  }

  // For now, return mock service until VAPID keys are configured
  return new MockPushService();

  // TODO: Uncomment when VAPID keys are configured
  /*
  return new WebPushService({
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY!,
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY!,
    vapidSubject: 'mailto:support@opportunex.com',
  });
  */
}
