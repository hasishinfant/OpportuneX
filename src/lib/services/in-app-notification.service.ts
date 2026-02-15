import { z } from 'zod';
import type { NotificationType } from './notification.service';

// In-app notification interfaces
export interface InAppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  read: boolean;
  readAt?: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  category?: string;
  actionUrl?: string;
  actionText?: string;
  imageUrl?: string;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationBadge {
  userId: string;
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  lastUpdated: Date;
}

export interface NotificationFilter {
  type?: NotificationType;
  read?: boolean;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  category?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface NotificationSort {
  field: 'createdAt' | 'priority' | 'type';
  order: 'asc' | 'desc';
}

// Validation schemas
const notificationFilterSchema = z.object({
  type: z
    .enum(['new_opportunity', 'deadline_reminder', 'recommendation', 'system'])
    .optional(),
  read: z.boolean().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  category: z.string().optional(),
  dateRange: z
    .object({
      start: z.date(),
      end: z.date(),
    })
    .optional(),
});

const notificationSortSchema = z.object({
  field: z.enum(['createdAt', 'priority', 'type']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// In-app notification service
export class InAppNotificationService {
  private notifications: Map<string, InAppNotification> = new Map();
  private badges: Map<string, NotificationBadge> = new Map();
  private subscribers: Map<
    string,
    Set<(notification: InAppNotification) => void>
  > = new Map();

  // Create in-app notification
  async createNotification(params: {
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, any>;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    category?: string;
    actionUrl?: string;
    actionText?: string;
    imageUrl?: string;
    expiresAt?: Date;
  }): Promise<InAppNotification> {
    const notification: InAppNotification = {
      id: this.generateId(),
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      data: params.data,
      read: false,
      priority: params.priority || 'normal',
      category: params.category,
      actionUrl: params.actionUrl,
      actionText: params.actionText,
      imageUrl: params.imageUrl,
      expiresAt: params.expiresAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.notifications.set(notification.id, notification);
    await this.updateBadge(params.userId);

    // Notify real-time subscribers
    this.notifySubscribers(params.userId, notification);

    // TODO: Store in database
    console.log(
      `Created in-app notification ${notification.id} for user ${params.userId}`
    );

    return notification;
  }

  // Get user notifications with filtering and pagination
  async getUserNotifications(
    userId: string,
    options: {
      filter?: NotificationFilter;
      sort?: NotificationSort;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    notifications: InAppNotification[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    // Validate input
    const filter = options.filter
      ? notificationFilterSchema.parse(options.filter)
      : {};
    const sort = notificationSortSchema.parse(options.sort || {});
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 20));

    // Get user notifications
    let userNotifications = Array.from(this.notifications.values()).filter(
      notification => notification.userId === userId
    );

    // Apply filters
    if (filter.type) {
      userNotifications = userNotifications.filter(n => n.type === filter.type);
    }

    if (filter.read !== undefined) {
      userNotifications = userNotifications.filter(n => n.read === filter.read);
    }

    if (filter.priority) {
      userNotifications = userNotifications.filter(
        n => n.priority === filter.priority
      );
    }

    if (filter.category) {
      userNotifications = userNotifications.filter(
        n => n.category === filter.category
      );
    }

    if (filter.dateRange) {
      userNotifications = userNotifications.filter(
        n =>
          n.createdAt >= filter.dateRange!.start &&
          n.createdAt <= filter.dateRange!.end
      );
    }

    // Remove expired notifications
    const now = new Date();
    userNotifications = userNotifications.filter(
      n => !n.expiresAt || n.expiresAt > now
    );

    // Apply sorting
    userNotifications.sort((a, b) => {
      let comparison = 0;

      switch (sort.field) {
        case 'createdAt':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, normal: 2, low: 1 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
      }

      return sort.order === 'desc' ? -comparison : comparison;
    });

    // Apply pagination
    const total = userNotifications.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedNotifications = userNotifications.slice(
      startIndex,
      endIndex
    );

    return {
      notifications: paginatedNotifications,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Get single notification
  async getNotification(
    notificationId: string,
    userId: string
  ): Promise<InAppNotification | null> {
    const notification = this.notifications.get(notificationId);

    if (!notification || notification.userId !== userId) {
      return null;
    }

    // Check if expired
    if (notification.expiresAt && notification.expiresAt <= new Date()) {
      return null;
    }

    return notification;
  }

  // Mark notification as read
  async markAsRead(notificationId: string, userId: string): Promise<boolean> {
    const notification = this.notifications.get(notificationId);

    if (!notification || notification.userId !== userId || notification.read) {
      return false;
    }

    notification.read = true;
    notification.readAt = new Date();
    notification.updatedAt = new Date();

    this.notifications.set(notificationId, notification);
    await this.updateBadge(userId);

    // TODO: Update in database
    console.log(`Marked notification ${notificationId} as read`);

    return true;
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<number> {
    let markedCount = 0;

    for (const [id, notification] of this.notifications.entries()) {
      if (notification.userId === userId && !notification.read) {
        notification.read = true;
        notification.readAt = new Date();
        notification.updatedAt = new Date();
        this.notifications.set(id, notification);
        markedCount++;
      }
    }

    if (markedCount > 0) {
      await this.updateBadge(userId);
      // TODO: Update in database
      console.log(
        `Marked ${markedCount} notifications as read for user ${userId}`
      );
    }

    return markedCount;
  }

  // Delete notification
  async deleteNotification(
    notificationId: string,
    userId: string
  ): Promise<boolean> {
    const notification = this.notifications.get(notificationId);

    if (!notification || notification.userId !== userId) {
      return false;
    }

    this.notifications.delete(notificationId);
    await this.updateBadge(userId);

    // TODO: Delete from database
    console.log(`Deleted notification ${notificationId}`);

    return true;
  }

  // Delete all notifications for a user
  async deleteAllNotifications(userId: string): Promise<number> {
    let deletedCount = 0;

    for (const [id, notification] of this.notifications.entries()) {
      if (notification.userId === userId) {
        this.notifications.delete(id);
        deletedCount++;
      }
    }

    if (deletedCount > 0) {
      await this.updateBadge(userId);
      // TODO: Delete from database
      console.log(`Deleted ${deletedCount} notifications for user ${userId}`);
    }

    return deletedCount;
  }

  // Get notification badge (unread count)
  async getBadge(userId: string): Promise<NotificationBadge> {
    let badge = this.badges.get(userId);

    if (!badge) {
      badge = await this.calculateBadge(userId);
      this.badges.set(userId, badge);
    }

    return badge;
  }

  // Update notification badge
  private async updateBadge(userId: string): Promise<void> {
    const badge = await this.calculateBadge(userId);
    this.badges.set(userId, badge);
  }

  // Calculate badge counts
  private async calculateBadge(userId: string): Promise<NotificationBadge> {
    const userNotifications = Array.from(this.notifications.values()).filter(
      notification => notification.userId === userId
    );

    // Remove expired notifications
    const now = new Date();
    const activeNotifications = userNotifications.filter(
      n => !n.expiresAt || n.expiresAt > now
    );

    const unreadNotifications = activeNotifications.filter(n => !n.read);

    const byType: Record<NotificationType, number> = {
      new_opportunity: 0,
      deadline_reminder: 0,
      recommendation: 0,
      system: 0,
    };

    unreadNotifications.forEach(notification => {
      byType[notification.type] = (byType[notification.type] || 0) + 1;
    });

    return {
      userId,
      total: activeNotifications.length,
      unread: unreadNotifications.length,
      byType,
      lastUpdated: new Date(),
    };
  }

  // Subscribe to real-time notifications
  subscribeToNotifications(
    userId: string,
    callback: (notification: InAppNotification) => void
  ): () => void {
    if (!this.subscribers.has(userId)) {
      this.subscribers.set(userId, new Set());
    }

    this.subscribers.get(userId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const userSubscribers = this.subscribers.get(userId);
      if (userSubscribers) {
        userSubscribers.delete(callback);
        if (userSubscribers.size === 0) {
          this.subscribers.delete(userId);
        }
      }
    };
  }

  // Notify real-time subscribers
  private notifySubscribers(
    userId: string,
    notification: InAppNotification
  ): void {
    const userSubscribers = this.subscribers.get(userId);
    if (userSubscribers) {
      userSubscribers.forEach(callback => {
        try {
          callback(notification);
        } catch (error) {
          console.error('Error notifying subscriber:', error);
        }
      });
    }
  }

  // Clean up expired notifications
  async cleanupExpiredNotifications(): Promise<number> {
    const now = new Date();
    let cleanedCount = 0;

    for (const [id, notification] of this.notifications.entries()) {
      if (notification.expiresAt && notification.expiresAt <= now) {
        this.notifications.delete(id);
        cleanedCount++;
      }
    }

    // Update badges for affected users
    const affectedUsers = new Set<string>();
    for (const notification of this.notifications.values()) {
      affectedUsers.add(notification.userId);
    }

    for (const userId of affectedUsers) {
      await this.updateBadge(userId);
    }

    // TODO: Delete from database
    console.log(`Cleaned up ${cleanedCount} expired notifications`);

    return cleanedCount;
  }

  // Get notification statistics
  async getNotificationStats(userId?: string): Promise<{
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
    byPriority: Record<string, number>;
    readRate: number;
    avgTimeToRead: number; // in minutes
  }> {
    let notifications = Array.from(this.notifications.values());

    if (userId) {
      notifications = notifications.filter(n => n.userId === userId);
    }

    const total = notifications.length;
    const unread = notifications.filter(n => !n.read).length;

    const byType: Record<NotificationType, number> = {
      new_opportunity: 0,
      deadline_reminder: 0,
      recommendation: 0,
      system: 0,
    };

    const byPriority: Record<string, number> = {
      low: 0,
      normal: 0,
      high: 0,
      urgent: 0,
    };

    let totalReadTime = 0;
    let readCount = 0;

    notifications.forEach(notification => {
      byType[notification.type] = (byType[notification.type] || 0) + 1;
      byPriority[notification.priority] =
        (byPriority[notification.priority] || 0) + 1;

      if (notification.read && notification.readAt) {
        const readTime =
          notification.readAt.getTime() - notification.createdAt.getTime();
        totalReadTime += readTime;
        readCount++;
      }
    });

    const readRate = total > 0 ? ((total - unread) / total) * 100 : 0;
    const avgTimeToRead =
      readCount > 0 ? totalReadTime / readCount / (1000 * 60) : 0; // Convert to minutes

    return {
      total,
      unread,
      byType,
      byPriority,
      readRate,
      avgTimeToRead,
    };
  }

  // Bulk operations
  async bulkMarkAsRead(
    notificationIds: string[],
    userId: string
  ): Promise<number> {
    let markedCount = 0;

    for (const id of notificationIds) {
      const success = await this.markAsRead(id, userId);
      if (success) markedCount++;
    }

    return markedCount;
  }

  async bulkDelete(notificationIds: string[], userId: string): Promise<number> {
    let deletedCount = 0;

    for (const id of notificationIds) {
      const success = await this.deleteNotification(id, userId);
      if (success) deletedCount++;
    }

    return deletedCount;
  }

  // Generate unique ID
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Get all notifications (for admin purposes)
  async getAllNotifications(): Promise<InAppNotification[]> {
    return Array.from(this.notifications.values());
  }

  // Get notification count by user
  async getNotificationCountByUser(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};

    for (const notification of this.notifications.values()) {
      counts[notification.userId] = (counts[notification.userId] || 0) + 1;
    }

    return counts;
  }
}

// Export singleton instance
export const inAppNotificationService = new InAppNotificationService();
