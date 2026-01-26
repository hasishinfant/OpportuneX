import { z } from 'zod';

// Notification types
export type NotificationType = 'new_opportunity' | 'deadline_reminder' | 'recommendation' | 'system';
export type NotificationChannel = 'email' | 'sms' | 'in_app' | 'push';
export type NotificationStatus = 'pending' | 'sent' | 'delivered' | 'failed' | 'bounced';

// Notification interfaces
export interface NotificationTemplate {
  id: string;
  name: string;
  type: NotificationType;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationPreferences {
  userId: string;
  email: boolean;
  sms: boolean;
  inApp: boolean;
  push: boolean;
  frequency: 'immediate' | 'daily' | 'weekly';
  types: NotificationType[];
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string; // HH:mm format
    timezone: string;
  };
  unsubscribeToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationRequest {
  userId: string;
  type: NotificationType;
  channels: NotificationChannel[];
  templateId?: string;
  subject?: string;
  content: {
    title: string;
    message: string;
    html?: string;
    data?: Record<string, any>;
  };
  scheduledFor?: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata?: Record<string, any>;
}

export interface NotificationDelivery {
  id: string;
  notificationId: string;
  userId: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  attempts: number;
  lastAttemptAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  externalId?: string; // ID from external service (SendGrid, Twilio, etc.)
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  htmlContent?: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  scheduledFor?: Date;
  sentAt?: Date;
  read: boolean;
  readAt?: Date;
  deliveries: NotificationDelivery[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Validation schemas
const notificationRequestSchema = z.object({
  userId: z.string().uuid(),
  type: z.enum(['new_opportunity', 'deadline_reminder', 'recommendation', 'system']),
  channels: z.array(z.enum(['email', 'sms', 'in_app', 'push'])).min(1),
  templateId: z.string().optional(),
  subject: z.string().optional(),
  content: z.object({
    title: z.string().min(1).max(200),
    message: z.string().min(1).max(1000),
    html: z.string().optional(),
    data: z.record(z.any()).optional(),
  }),
  scheduledFor: z.date().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).default('normal'),
  metadata: z.record(z.any()).optional(),
});

const notificationPreferencesSchema = z.object({
  userId: z.string().uuid(),
  email: z.boolean().default(true),
  sms: z.boolean().default(false),
  inApp: z.boolean().default(true),
  push: z.boolean().default(true),
  frequency: z.enum(['immediate', 'daily', 'weekly']).default('immediate'),
  types: z.array(z.enum(['new_opportunity', 'deadline_reminder', 'recommendation', 'system'])),
  quietHours: z.object({
    enabled: z.boolean().default(false),
    start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
    timezone: z.string().default('Asia/Kolkata'),
  }),
});

// Email service interface
export interface EmailService {
  sendEmail(params: {
    to: string;
    subject: string;
    html: string;
    text: string;
    templateId?: string;
    templateData?: Record<string, any>;
  }): Promise<{ messageId: string; status: string }>;
  
  sendBulkEmail(params: {
    recipients: Array<{
      to: string;
      templateData?: Record<string, any>;
    }>;
    subject: string;
    html: string;
    text: string;
    templateId?: string;
  }): Promise<Array<{ messageId: string; status: string; recipient: string }>>;
}

// SMS service interface
export interface SMSService {
  sendSMS(params: {
    to: string;
    message: string;
    templateId?: string;
    templateData?: Record<string, any>;
  }): Promise<{ messageId: string; status: string }>;
  
  sendBulkSMS(params: {
    recipients: Array<{
      to: string;
      templateData?: Record<string, any>;
    }>;
    message: string;
    templateId?: string;
  }): Promise<Array<{ messageId: string; status: string; recipient: string }>>;
}

// Push notification service interface
export interface PushService {
  sendPushNotification(params: {
    userId: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    icon?: string;
    badge?: number;
  }): Promise<{ messageId: string; status: string }>;
}

// Main notification service class
export class NotificationService {
  private emailService?: EmailService;
  private smsService?: SMSService;
  private pushService?: PushService;
  private templates: Map<string, NotificationTemplate> = new Map();
  private preferences: Map<string, NotificationPreferences> = new Map();

  constructor(
    emailService?: EmailService,
    smsService?: SMSService,
    pushService?: PushService
  ) {
    this.emailService = emailService;
    this.smsService = smsService;
    this.pushService = pushService;
    this.initializeDefaultTemplates();
  }

  // Initialize default notification templates
  private initializeDefaultTemplates(): void {
    const defaultTemplates: Omit<NotificationTemplate, 'createdAt' | 'updatedAt'>[] = [
      {
        id: 'new-opportunity',
        name: 'New Opportunity Alert',
        type: 'new_opportunity',
        subject: 'New {{opportunityType}} Available: {{title}}',
        htmlContent: `
          <h2>New {{opportunityType}} Available!</h2>
          <h3>{{title}}</h3>
          <p><strong>Organizer:</strong> {{organizer}}</p>
          <p><strong>Deadline:</strong> {{deadline}}</p>
          <p><strong>Location:</strong> {{location}}</p>
          <p>{{description}}</p>
          <a href="{{url}}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Opportunity</a>
        `,
        textContent: `
          New {{opportunityType}} Available: {{title}}
          
          Organizer: {{organizer}}
          Deadline: {{deadline}}
          Location: {{location}}
          
          {{description}}
          
          View opportunity: {{url}}
        `,
        variables: ['opportunityType', 'title', 'organizer', 'deadline', 'location', 'description', 'url'],
      },
      {
        id: 'deadline-reminder',
        name: 'Deadline Reminder',
        type: 'deadline_reminder',
        subject: 'Reminder: {{title}} deadline in {{timeLeft}}',
        htmlContent: `
          <h2>Deadline Reminder</h2>
          <h3>{{title}}</h3>
          <p><strong>Deadline:</strong> {{deadline}}</p>
          <p><strong>Time Left:</strong> {{timeLeft}}</p>
          <p>Don't miss out on this opportunity! Make sure to submit your application before the deadline.</p>
          <a href="{{url}}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Apply Now</a>
        `,
        textContent: `
          Deadline Reminder: {{title}}
          
          Deadline: {{deadline}}
          Time Left: {{timeLeft}}
          
          Don't miss out on this opportunity! Make sure to submit your application before the deadline.
          
          Apply now: {{url}}
        `,
        variables: ['title', 'deadline', 'timeLeft', 'url'],
      },
      {
        id: 'recommendation',
        name: 'Personalized Recommendation',
        type: 'recommendation',
        subject: 'Opportunities Recommended for You',
        htmlContent: `
          <h2>Opportunities Recommended for You</h2>
          <p>Based on your profile and interests, we found {{count}} opportunities that might interest you:</p>
          {{#opportunities}}
          <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
            <h4>{{title}}</h4>
            <p><strong>Type:</strong> {{type}} | <strong>Organizer:</strong> {{organizer}}</p>
            <p><strong>Deadline:</strong> {{deadline}}</p>
            <p>{{description}}</p>
            <a href="{{url}}">View Details</a>
          </div>
          {{/opportunities}}
        `,
        textContent: `
          Opportunities Recommended for You
          
          Based on your profile and interests, we found {{count}} opportunities that might interest you:
          
          {{#opportunities}}
          {{title}}
          Type: {{type}} | Organizer: {{organizer}}
          Deadline: {{deadline}}
          {{description}}
          View: {{url}}
          
          {{/opportunities}}
        `,
        variables: ['count', 'opportunities'],
      },
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, {
        ...template,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
  }

  // Validate notification request
  validateNotificationRequest(request: any): NotificationRequest {
    return notificationRequestSchema.parse(request);
  }

  // Validate notification preferences
  validateNotificationPreferences(preferences: any): Omit<NotificationPreferences, 'createdAt' | 'updatedAt'> {
    return notificationPreferencesSchema.parse(preferences);
  }

  // Get user notification preferences
  async getUserPreferences(userId: string): Promise<NotificationPreferences | null> {
    // TODO: Implement database retrieval
    return this.preferences.get(userId) || null;
  }

  // Update user notification preferences
  async updateUserPreferences(
    userId: string,
    preferences: Partial<Omit<NotificationPreferences, 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<NotificationPreferences> {
    const existing = await this.getUserPreferences(userId);
    const updated: NotificationPreferences = {
      userId,
      email: preferences.email ?? existing?.email ?? true,
      sms: preferences.sms ?? existing?.sms ?? false,
      inApp: preferences.inApp ?? existing?.inApp ?? true,
      push: preferences.push ?? existing?.push ?? true,
      frequency: preferences.frequency ?? existing?.frequency ?? 'immediate',
      types: preferences.types ?? existing?.types ?? ['new_opportunity', 'deadline_reminder', 'recommendation'],
      quietHours: preferences.quietHours ?? existing?.quietHours ?? {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'Asia/Kolkata',
      },
      unsubscribeToken: existing?.unsubscribeToken ?? this.generateUnsubscribeToken(),
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
    };

    this.preferences.set(userId, updated);
    // TODO: Implement database storage
    return updated;
  }

  // Check if user should receive notification based on preferences
  async shouldSendNotification(
    userId: string,
    type: NotificationType,
    channel: NotificationChannel
  ): Promise<boolean> {
    const preferences = await this.getUserPreferences(userId);
    if (!preferences) return true; // Default to sending if no preferences set

    // Check if notification type is enabled
    if (!preferences.types.includes(type)) return false;

    // Check if channel is enabled
    switch (channel) {
      case 'email':
        if (!preferences.email) return false;
        break;
      case 'sms':
        if (!preferences.sms) return false;
        break;
      case 'in_app':
        if (!preferences.inApp) return false;
        break;
      case 'push':
        if (!preferences.push) return false;
        break;
    }

    // Check quiet hours
    if (preferences.quietHours.enabled) {
      const now = new Date();
      const currentTime = now.toLocaleTimeString('en-US', {
        hour12: false,
        timeZone: preferences.quietHours.timezone,
      }).slice(0, 5);

      const { start, end } = preferences.quietHours;
      
      // Handle quiet hours that span midnight
      if (start > end) {
        if (currentTime >= start || currentTime <= end) {
          return false;
        }
      } else {
        if (currentTime >= start && currentTime <= end) {
          return false;
        }
      }
    }

    return true;
  }

  // Send notification
  async sendNotification(request: NotificationRequest): Promise<Notification> {
    const validatedRequest = this.validateNotificationRequest(request);
    
    // Create notification record
    const notification: Notification = {
      id: this.generateId(),
      userId: validatedRequest.userId,
      type: validatedRequest.type,
      title: validatedRequest.content.title,
      message: validatedRequest.content.message,
      htmlContent: validatedRequest.content.html,
      data: validatedRequest.content.data,
      channels: validatedRequest.channels,
      priority: validatedRequest.priority,
      scheduledFor: validatedRequest.scheduledFor,
      sentAt: validatedRequest.scheduledFor ? undefined : new Date(),
      read: false,
      deliveries: [],
      metadata: validatedRequest.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // If scheduled for future, queue it
    if (validatedRequest.scheduledFor && validatedRequest.scheduledFor > new Date()) {
      // TODO: Implement scheduling queue
      console.log(`Notification ${notification.id} scheduled for ${validatedRequest.scheduledFor}`);
      return notification;
    }

    // Send immediately
    await this.deliverNotification(notification);
    
    return notification;
  }

  // Deliver notification through specified channels
  private async deliverNotification(notification: Notification): Promise<void> {
    const deliveryPromises = notification.channels.map(async (channel) => {
      // Check if user should receive notification on this channel
      const shouldSend = await this.shouldSendNotification(
        notification.userId,
        notification.type,
        channel
      );

      if (!shouldSend) {
        console.log(`Skipping ${channel} notification for user ${notification.userId} due to preferences`);
        return;
      }

      const delivery: NotificationDelivery = {
        id: this.generateId(),
        notificationId: notification.id,
        userId: notification.userId,
        channel,
        status: 'pending',
        attempts: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      try {
        await this.sendThroughChannel(notification, channel, delivery);
        delivery.status = 'sent';
        delivery.deliveredAt = new Date();
      } catch (error) {
        delivery.status = 'failed';
        delivery.failureReason = error instanceof Error ? error.message : 'Unknown error';
        console.error(`Failed to send ${channel} notification:`, error);
      }

      delivery.attempts += 1;
      delivery.lastAttemptAt = new Date();
      delivery.updatedAt = new Date();
      
      notification.deliveries.push(delivery);
    });

    await Promise.allSettled(deliveryPromises);
    notification.sentAt = new Date();
    notification.updatedAt = new Date();
  }

  // Send notification through specific channel
  private async sendThroughChannel(
    notification: Notification,
    channel: NotificationChannel,
    delivery: NotificationDelivery
  ): Promise<void> {
    switch (channel) {
      case 'email':
        if (!this.emailService) {
          throw new Error('Email service not configured');
        }
        const emailResult = await this.emailService.sendEmail({
          to: `user-${notification.userId}@example.com`, // TODO: Get actual email from user service
          subject: notification.title,
          html: notification.htmlContent || `<p>${notification.message}</p>`,
          text: notification.message,
        });
        delivery.externalId = emailResult.messageId;
        break;

      case 'sms':
        if (!this.smsService) {
          throw new Error('SMS service not configured');
        }
        const smsResult = await this.smsService.sendSMS({
          to: `+91XXXXXXXXXX`, // TODO: Get actual phone from user service
          message: `${notification.title}\n\n${notification.message}`,
        });
        delivery.externalId = smsResult.messageId;
        break;

      case 'push':
        if (!this.pushService) {
          throw new Error('Push service not configured');
        }
        const pushResult = await this.pushService.sendPushNotification({
          userId: notification.userId,
          title: notification.title,
          body: notification.message,
          data: notification.data,
        });
        delivery.externalId = pushResult.messageId;
        break;

      case 'in_app':
        // In-app notifications are stored in database and retrieved by frontend
        console.log(`In-app notification stored for user ${notification.userId}`);
        break;

      default:
        throw new Error(`Unsupported notification channel: ${channel}`);
    }
  }

  // Retry failed notifications
  async retryFailedNotifications(maxRetries: number = 3): Promise<void> {
    // TODO: Implement retry logic for failed notifications
    console.log(`Retrying failed notifications (max retries: ${maxRetries})`);
  }

  // Get notification analytics
  async getNotificationAnalytics(userId?: string, dateRange?: { start: Date; end: Date }) {
    // TODO: Implement analytics retrieval from database
    return {
      totalSent: 0,
      totalDelivered: 0,
      totalFailed: 0,
      deliveryRate: 0,
      byChannel: {
        email: { sent: 0, delivered: 0, failed: 0 },
        sms: { sent: 0, delivered: 0, failed: 0 },
        push: { sent: 0, delivered: 0, failed: 0 },
        in_app: { sent: 0, delivered: 0, failed: 0 },
      },
      byType: {
        new_opportunity: { sent: 0, delivered: 0, failed: 0 },
        deadline_reminder: { sent: 0, delivered: 0, failed: 0 },
        recommendation: { sent: 0, delivered: 0, failed: 0 },
        system: { sent: 0, delivered: 0, failed: 0 },
      },
    };
  }

  // Generate unsubscribe token
  private generateUnsubscribeToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Generate unique ID
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Get notification template
  getTemplate(templateId: string): NotificationTemplate | undefined {
    return this.templates.get(templateId);
  }

  // Add custom template
  addTemplate(template: Omit<NotificationTemplate, 'createdAt' | 'updatedAt'>): NotificationTemplate {
    const fullTemplate: NotificationTemplate = {
      ...template,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.templates.set(template.id, fullTemplate);
    return fullTemplate;
  }

  // Process template with variables
  processTemplate(template: NotificationTemplate, variables: Record<string, any>): {
    subject: string;
    html: string;
    text: string;
  } {
    const processString = (str: string) => {
      return str.replace(/\{\{(\w+)\}\}/g, (match, key) => {
        return variables[key] || match;
      });
    };

    return {
      subject: processString(template.subject),
      html: processString(template.htmlContent),
      text: processString(template.textContent),
    };
  }
}

// Import service factories
import { createEmailService } from './email.service';
import { createPushService } from './push.service';
import { createSMSService } from './sms.service';

// Export singleton instance with integrated services
export const notificationService = new NotificationService(
  createEmailService(),
  createSMSService(),
  createPushService()
);