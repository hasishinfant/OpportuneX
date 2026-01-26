import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { deadlineReminderService } from '../lib/services/deadline-reminder.service';
import { inAppNotificationService } from '../lib/services/in-app-notification.service';
import { notificationDeliveryService } from '../lib/services/notification-delivery.service';
import { notificationTemplateService } from '../lib/services/notification-template.service';
import type { NotificationRequest } from '../lib/services/notification.service';
import { notificationService } from '../lib/services/notification.service';
import type { AlertCriteria } from '../lib/services/opportunity-alerts.service';
import { opportunityAlertsService } from '../lib/services/opportunity-alerts.service';

describe('Notification System Integration Tests', () => {
  const testUserId = 'test-user-123';
  const testOpportunity = {
    id: 'opp-123',
    title: 'AI Hackathon 2024',
    description: 'Build innovative AI solutions',
    type: 'hackathon' as const,
    organizer: {
      name: 'TechCorp',
      type: 'corporate' as const,
    },
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    location: 'Mumbai',
    mode: 'hybrid' as const,
    stipend: '50000',
    skills: ['JavaScript', 'Python', 'Machine Learning'],
    url: 'https://example.com/hackathon',
  };

  beforeEach(() => {
    // Reset services state before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    deadlineReminderService.stopReminderProcessor();
    opportunityAlertsService.stopAlertProcessor();
  });

  describe('Basic Notification Service', () => {
    it('should send notification through multiple channels', async () => {
      const notificationRequest: NotificationRequest = {
        userId: testUserId,
        type: 'new_opportunity',
        channels: ['email', 'in_app', 'push'],
        content: {
          title: 'New Hackathon Available',
          message: 'A new hackathon matching your interests has been posted.',
          data: { opportunityId: testOpportunity.id },
        },
        priority: 'normal',
      };

      const notification = await notificationService.sendNotification(notificationRequest);

      expect(notification).toBeDefined();
      expect(notification.userId).toBe(testUserId);
      expect(notification.type).toBe('new_opportunity');
      expect(notification.channels).toEqual(['email', 'in_app', 'push']);
      expect(notification.deliveries).toHaveLength(3);
    });

    it('should respect user notification preferences', async () => {
      // Set user preferences to disable SMS
      await notificationService.updateUserPreferences(testUserId, {
        sms: false,
        email: true,
        inApp: true,
      });

      const shouldSendSMS = await notificationService.shouldSendNotification(
        testUserId,
        'new_opportunity',
        'sms'
      );
      const shouldSendEmail = await notificationService.shouldSendNotification(
        testUserId,
        'new_opportunity',
        'email'
      );

      expect(shouldSendSMS).toBe(false);
      expect(shouldSendEmail).toBe(true);
    });

    it('should respect quiet hours', async () => {
      // Set quiet hours from 22:00 to 08:00
      await notificationService.updateUserPreferences(testUserId, {
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00',
          timezone: 'Asia/Kolkata',
        },
      });

      // Mock current time to be within quiet hours (e.g., 23:00)
      const originalDate = Date;
      const mockDate = new Date('2024-01-01T23:00:00Z');
      global.Date = jest.fn(() => mockDate) as any;
      global.Date.now = jest.fn(() => mockDate.getTime());

      const shouldSend = await notificationService.shouldSendNotification(
        testUserId,
        'new_opportunity',
        'email'
      );

      expect(shouldSend).toBe(false);

      // Restore original Date
      global.Date = originalDate;
    });
  });

  describe('In-App Notification Service', () => {
    it('should create and retrieve in-app notifications', async () => {
      const notification = await inAppNotificationService.createNotification({
        userId: testUserId,
        type: 'new_opportunity',
        title: 'New Opportunity',
        message: 'Check out this new hackathon!',
        priority: 'normal',
        data: { opportunityId: testOpportunity.id },
      });

      expect(notification).toBeDefined();
      expect(notification.userId).toBe(testUserId);
      expect(notification.read).toBe(false);

      const userNotifications = await inAppNotificationService.getUserNotifications(testUserId);
      expect(userNotifications.notifications).toHaveLength(1);
      expect(userNotifications.notifications[0].id).toBe(notification.id);
    });

    it('should mark notifications as read', async () => {
      const notification = await inAppNotificationService.createNotification({
        userId: testUserId,
        type: 'deadline_reminder',
        title: 'Deadline Reminder',
        message: 'Deadline approaching!',
        priority: 'high',
      });

      const success = await inAppNotificationService.markAsRead(notification.id, testUserId);
      expect(success).toBe(true);

      const updatedNotification = await inAppNotificationService.getNotification(
        notification.id,
        testUserId
      );
      expect(updatedNotification?.read).toBe(true);
      expect(updatedNotification?.readAt).toBeDefined();
    });

    it('should calculate notification badge correctly', async () => {
      // Create multiple notifications
      await inAppNotificationService.createNotification({
        userId: testUserId,
        type: 'new_opportunity',
        title: 'Notification 1',
        message: 'Message 1',
        priority: 'normal',
      });

      await inAppNotificationService.createNotification({
        userId: testUserId,
        type: 'deadline_reminder',
        title: 'Notification 2',
        message: 'Message 2',
        priority: 'high',
      });

      const badge = await inAppNotificationService.getBadge(testUserId);
      expect(badge.total).toBe(2);
      expect(badge.unread).toBe(2);
      expect(badge.byType.new_opportunity).toBe(1);
      expect(badge.byType.deadline_reminder).toBe(1);
    });
  });

  describe('Deadline Reminder Service', () => {
    it('should create deadline reminder with default schedule', async () => {
      const reminder = await deadlineReminderService.createReminder({
        userId: testUserId,
        opportunityId: testOpportunity.id,
        opportunityTitle: testOpportunity.title,
        opportunityType: testOpportunity.type,
        deadline: testOpportunity.deadline,
        channels: ['email', 'in_app'],
      });

      expect(reminder).toBeDefined();
      expect(reminder.userId).toBe(testUserId);
      expect(reminder.opportunityId).toBe(testOpportunity.id);
      expect(reminder.reminderTimes.length).toBeGreaterThan(0);
      expect(reminder.sent).toHaveLength(reminder.reminderTimes.length);
      expect(reminder.sent.every(sent => sent === false)).toBe(true);
    });

    it('should get user reminders with filters', async () => {
      await deadlineReminderService.createReminder({
        userId: testUserId,
        opportunityId: testOpportunity.id,
        opportunityTitle: testOpportunity.title,
        opportunityType: testOpportunity.type,
        deadline: testOpportunity.deadline,
      });

      const reminders = await deadlineReminderService.getUserReminders(testUserId, {
        active: true,
        upcoming: true,
      });

      expect(reminders).toHaveLength(1);
      expect(reminders[0].active).toBe(true);
      expect(reminders[0].deadline).toBeInstanceOf(Date);
    });

    it('should update reminder settings', async () => {
      const reminder = await deadlineReminderService.createReminder({
        userId: testUserId,
        opportunityId: testOpportunity.id,
        opportunityTitle: testOpportunity.title,
        opportunityType: testOpportunity.type,
        deadline: testOpportunity.deadline,
        channels: ['email'],
      });

      const updated = await deadlineReminderService.updateReminder(reminder.id, {
        channels: ['email', 'sms', 'push'],
        active: false,
      });

      expect(updated).toBeDefined();
      expect(updated!.channels).toEqual(['email', 'sms', 'push']);
      expect(updated!.active).toBe(false);
    });
  });

  describe('Opportunity Alerts Service', () => {
    it('should create opportunity alert with criteria', async () => {
      const criteria: AlertCriteria = {
        keywords: ['AI', 'Machine Learning'],
        skills: ['Python', 'JavaScript'],
        opportunityTypes: ['hackathon'],
        modes: ['online', 'hybrid'],
        deadlineRange: { min: 1, max: 30 },
      };

      const alert = await opportunityAlertsService.createAlert({
        userId: testUserId,
        name: 'AI Hackathon Alert',
        description: 'Alert for AI-related hackathons',
        criteria,
        channels: ['email', 'in_app'],
        frequency: 'immediate',
      });

      expect(alert).toBeDefined();
      expect(alert.userId).toBe(testUserId);
      expect(alert.name).toBe('AI Hackathon Alert');
      expect(alert.criteria).toEqual(criteria);
      expect(alert.active).toBe(true);
    });

    it('should match opportunities against alert criteria', async () => {
      const criteria: AlertCriteria = {
        keywords: ['AI'],
        opportunityTypes: ['hackathon'],
        skills: ['Python'],
      };

      const alert = await opportunityAlertsService.createAlert({
        userId: testUserId,
        name: 'Test Alert',
        criteria,
        channels: ['in_app'],
      });

      const matches = await opportunityAlertsService.checkOpportunityAgainstAlerts(testOpportunity);

      expect(matches).toHaveLength(1);
      expect(matches[0].alertId).toBe(alert.id);
      expect(matches[0].matchScore).toBeGreaterThan(0);
      expect(matches[0].matchedCriteria.length).toBeGreaterThan(0);
    });

    it('should get alert matches with pagination', async () => {
      const criteria: AlertCriteria = {
        keywords: ['AI'],
        opportunityTypes: ['hackathon'],
      };

      const alert = await opportunityAlertsService.createAlert({
        userId: testUserId,
        name: 'Test Alert',
        criteria,
        channels: ['in_app'],
      });

      // Simulate some matches
      await opportunityAlertsService.checkOpportunityAgainstAlerts(testOpportunity);

      const result = await opportunityAlertsService.getAlertMatches(alert.id, testUserId, {
        limit: 10,
        offset: 0,
        minScore: 50,
      });

      expect(result).toBeDefined();
      expect(result.matches).toBeDefined();
      expect(result.total).toBeDefined();
    });
  });

  describe('Notification Template Service', () => {
    it('should render template with variables', async () => {
      const templates = await notificationTemplateService.getTemplatesByType('new_opportunity');
      expect(templates.length).toBeGreaterThan(0);

      const template = templates[0];
      const rendered = await notificationTemplateService.renderTemplate(template.id, {
        variables: {
          userName: 'John Doe',
          opportunityType: 'hackathon',
          title: testOpportunity.title,
          organizer: testOpportunity.organizer.name,
          deadline: testOpportunity.deadline.toLocaleDateString(),
          location: testOpportunity.location,
          mode: testOpportunity.mode,
          description: testOpportunity.description,
          url: testOpportunity.url,
          unsubscribeUrl: 'https://example.com/unsubscribe',
          preferencesUrl: 'https://example.com/preferences',
        },
      });

      expect(rendered).toBeDefined();
      expect(rendered!.title).toContain('hackathon');
      expect(rendered!.content.text).toContain('John Doe');
      expect(rendered!.content.text).toContain(testOpportunity.title);
    });

    it('should validate template variables', async () => {
      const templates = await notificationTemplateService.getTemplatesByType('new_opportunity');
      const template = templates[0];

      const validation = await notificationTemplateService.validateTemplate(template.id, {
        userName: 'John Doe',
        // Missing required variables
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should get template statistics', async () => {
      const stats = await notificationTemplateService.getTemplateStats();

      expect(stats).toBeDefined();
      expect(stats.totalTemplates).toBeGreaterThan(0);
      expect(stats.activeTemplates).toBeGreaterThan(0);
      expect(stats.byType).toBeDefined();
      expect(stats.byChannel).toBeDefined();
    });
  });

  describe('Notification Delivery Service', () => {
    it('should track delivery attempts', async () => {
      const delivery = {
        id: 'delivery-123',
        notificationId: 'notif-123',
        userId: testUserId,
        channel: 'email' as const,
        status: 'sent' as const,
        attempts: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await notificationDeliveryService.trackDelivery(delivery);

      const status = await notificationDeliveryService.getDeliveryStatus(delivery.id);
      expect(status.delivery).toBeDefined();
      expect(status.delivery!.id).toBe(delivery.id);
      expect(status.attempts).toHaveLength(1);
    });

    it('should calculate delivery statistics', async () => {
      const stats = await notificationDeliveryService.getChannelStats('email', 'day');

      expect(stats).toBeDefined();
      expect(stats.channel).toBe('email');
      expect(stats.period).toBe('day');
      expect(stats.deliveryRate).toBeGreaterThanOrEqual(0);
    });

    it('should check circuit breaker functionality', async () => {
      const shouldAttempt = await notificationDeliveryService.shouldAttemptDelivery('email');
      expect(typeof shouldAttempt).toBe('boolean');

      const circuitBreakers = notificationDeliveryService.getCircuitBreakerStates();
      expect(circuitBreakers).toHaveLength(4); // email, sms, push, in_app
      expect(circuitBreakers.every(cb => cb.state === 'closed')).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete notification workflow', async () => {
      // 1. Create opportunity alert
      const alert = await opportunityAlertsService.createAlert({
        userId: testUserId,
        name: 'Complete Workflow Test',
        criteria: {
          keywords: ['AI'],
          opportunityTypes: ['hackathon'],
        },
        channels: ['in_app', 'email'],
        frequency: 'immediate',
      });

      // 2. Create deadline reminder
      const reminder = await deadlineReminderService.createReminder({
        userId: testUserId,
        opportunityId: testOpportunity.id,
        opportunityTitle: testOpportunity.title,
        opportunityType: testOpportunity.type,
        deadline: testOpportunity.deadline,
        channels: ['in_app'],
      });

      // 3. Check opportunity against alerts (should trigger notification)
      const matches = await opportunityAlertsService.checkOpportunityAgainstAlerts(testOpportunity);
      expect(matches).toHaveLength(1);

      // 4. Verify in-app notification was created
      const notifications = await inAppNotificationService.getUserNotifications(testUserId);
      expect(notifications.notifications.length).toBeGreaterThan(0);

      // 5. Check notification badge
      const badge = await inAppNotificationService.getBadge(testUserId);
      expect(badge.unread).toBeGreaterThan(0);

      // 6. Mark notification as read
      const firstNotification = notifications.notifications[0];
      await inAppNotificationService.markAsRead(firstNotification.id, testUserId);

      // 7. Verify badge updated
      const updatedBadge = await inAppNotificationService.getBadge(testUserId);
      expect(updatedBadge.unread).toBe(badge.unread - 1);
    });

    it('should handle notification preferences across services', async () => {
      // Set user preferences
      await notificationService.updateUserPreferences(testUserId, {
        email: false,
        inApp: true,
        frequency: 'daily',
        types: ['new_opportunity'],
      });

      // Create alert with email channel (should be filtered out)
      const alert = await opportunityAlertsService.createAlert({
        userId: testUserId,
        name: 'Preference Test',
        criteria: { keywords: ['test'] },
        channels: ['email', 'in_app'],
      });

      // Check if notification should be sent
      const shouldSendEmail = await notificationService.shouldSendNotification(
        testUserId,
        'new_opportunity',
        'email'
      );
      const shouldSendInApp = await notificationService.shouldSendNotification(
        testUserId,
        'new_opportunity',
        'in_app'
      );

      expect(shouldSendEmail).toBe(false);
      expect(shouldSendInApp).toBe(true);
    });

    it('should handle template rendering in notification flow', async () => {
      // Get a template
      const templates = await notificationTemplateService.getTemplatesByType('new_opportunity');
      const template = templates[0];

      // Render template
      const rendered = await notificationTemplateService.renderTemplate(template.id, {
        variables: {
          userName: 'Test User',
          opportunityType: testOpportunity.type,
          title: testOpportunity.title,
          organizer: testOpportunity.organizer.name,
          deadline: testOpportunity.deadline.toLocaleDateString(),
          location: testOpportunity.location,
          mode: testOpportunity.mode,
          description: testOpportunity.description,
          url: testOpportunity.url,
          unsubscribeUrl: 'https://example.com/unsubscribe',
          preferencesUrl: 'https://example.com/preferences',
        },
      });

      expect(rendered).toBeDefined();

      // Send notification using rendered template
      const notification = await notificationService.sendNotification({
        userId: testUserId,
        type: 'new_opportunity',
        channels: ['in_app'],
        templateId: template.id,
        content: {
          title: rendered!.title,
          message: rendered!.content.text,
          html: rendered!.content.html,
        },
        priority: 'normal',
      });

      expect(notification).toBeDefined();
      expect(notification.title).toBe(rendered!.title);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid notification requests', async () => {
      await expect(
        notificationService.sendNotification({
          userId: '',
          type: 'new_opportunity',
          channels: [],
          content: {
            title: '',
            message: '',
          },
          priority: 'normal',
        })
      ).rejects.toThrow();
    });

    it('should handle template rendering errors', async () => {
      const templates = await notificationTemplateService.getTemplatesByType('new_opportunity');
      const template = templates[0];

      await expect(
        notificationTemplateService.renderTemplate(template.id, {
          variables: {}, // Missing required variables
        })
      ).rejects.toThrow();
    });

    it('should handle non-existent resources gracefully', async () => {
      const nonExistentTemplate = await notificationTemplateService.getTemplate('non-existent');
      expect(nonExistentTemplate).toBeNull();

      const nonExistentAlert = await opportunityAlertsService.getAlert('non-existent', testUserId);
      expect(nonExistentAlert).toBeNull();

      const deleteResult = await deadlineReminderService.deleteReminder('non-existent', testUserId);
      expect(deleteResult).toBe(false);
    });
  });
});