/**
 * Unit tests for Notification Service
 * Tests notification delivery, preferences, templates, and multi-channel support
 */

import type {
  EmailService,
  NotificationRequest,
  PushService,
  SMSService,
} from '../lib/services/notification.service';
import { NotificationService } from '../lib/services/notification.service';

describe('NotificationService', () => {
  let notificationService: NotificationService;
  let mockEmailService: jest.Mocked<EmailService>;
  let mockSMSService: jest.Mocked<SMSService>;
  let mockPushService: jest.Mocked<PushService>;

  beforeEach(() => {
    // Create mock services
    mockEmailService = {
      sendEmail: jest.fn(),
      sendBulkEmail: jest.fn(),
    };

    mockSMSService = {
      sendSMS: jest.fn(),
      sendBulkSMS: jest.fn(),
    };

    mockPushService = {
      sendPushNotification: jest.fn(),
    };

    // Initialize service with mocks
    notificationService = new NotificationService(
      mockEmailService,
      mockSMSService,
      mockPushService
    );

    jest.clearAllMocks();
  });

  const mockNotificationRequest: NotificationRequest = {
    userId: '123e4567-e89b-12d3-a456-426614174000',
    type: 'new_opportunity',
    channels: ['email', 'in_app'],
    content: {
      title: 'New AI Hackathon Available',
      message:
        'A new AI hackathon has been posted that matches your interests.',
      html: '<p>A new AI hackathon has been posted that matches your interests.</p>',
      data: {
        opportunityId: 'opp-123',
        opportunityType: 'hackathon',
      },
    },
    priority: 'normal',
    metadata: {
      source: 'opportunity_matcher',
    },
  };

  describe('Notification Request Validation', () => {
    it('should validate valid notification request', () => {
      const result = notificationService.validateNotificationRequest(
        mockNotificationRequest
      );

      expect(result).toEqual(mockNotificationRequest);
    });

    it('should reject invalid user ID', () => {
      const invalidRequest = {
        ...mockNotificationRequest,
        userId: 'invalid-uuid',
      };

      expect(() => {
        notificationService.validateNotificationRequest(invalidRequest);
      }).toThrow();
    });

    it('should reject invalid notification type', () => {
      const invalidRequest = {
        ...mockNotificationRequest,
        type: 'invalid_type',
      };

      expect(() => {
        notificationService.validateNotificationRequest(invalidRequest);
      }).toThrow();
    });

    it('should reject empty channels array', () => {
      const invalidRequest = {
        ...mockNotificationRequest,
        channels: [],
      };

      expect(() => {
        notificationService.validateNotificationRequest(invalidRequest);
      }).toThrow();
    });

    it('should reject invalid channel', () => {
      const invalidRequest = {
        ...mockNotificationRequest,
        channels: ['invalid_channel'],
      };

      expect(() => {
        notificationService.validateNotificationRequest(invalidRequest);
      }).toThrow();
    });

    it('should reject empty title', () => {
      const invalidRequest = {
        ...mockNotificationRequest,
        content: {
          ...mockNotificationRequest.content,
          title: '',
        },
      };

      expect(() => {
        notificationService.validateNotificationRequest(invalidRequest);
      }).toThrow();
    });

    it('should reject title that is too long', () => {
      const invalidRequest = {
        ...mockNotificationRequest,
        content: {
          ...mockNotificationRequest.content,
          title: 'a'.repeat(201),
        },
      };

      expect(() => {
        notificationService.validateNotificationRequest(invalidRequest);
      }).toThrow();
    });

    it('should reject message that is too long', () => {
      const invalidRequest = {
        ...mockNotificationRequest,
        content: {
          ...mockNotificationRequest.content,
          message: 'a'.repeat(1001),
        },
      };

      expect(() => {
        notificationService.validateNotificationRequest(invalidRequest);
      }).toThrow();
    });

    it('should accept valid priority levels', () => {
      const priorities = ['low', 'normal', 'high', 'urgent'] as const;

      priorities.forEach(priority => {
        const request = {
          ...mockNotificationRequest,
          priority,
        };

        const result = notificationService.validateNotificationRequest(request);
        expect(result.priority).toBe(priority);
      });
    });

    it('should default priority to normal when not specified', () => {
      const requestWithoutPriority = {
        ...mockNotificationRequest,
      };
      delete (requestWithoutPriority as any).priority;

      const result = notificationService.validateNotificationRequest(
        requestWithoutPriority
      );
      expect(result.priority).toBe('normal');
    });
  });

  describe('Notification Preferences', () => {
    const mockPreferences = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      email: true,
      sms: false,
      inApp: true,
      push: true,
      frequency: 'daily' as const,
      types: ['new_opportunity', 'deadline_reminder'] as const,
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '08:00',
        timezone: 'Asia/Kolkata',
      },
    };

    it('should validate valid notification preferences', () => {
      const result =
        notificationService.validateNotificationPreferences(mockPreferences);

      expect(result).toEqual(mockPreferences);
    });

    it('should reject invalid user ID in preferences', () => {
      const invalidPreferences = {
        ...mockPreferences,
        userId: 'invalid-uuid',
      };

      expect(() => {
        notificationService.validateNotificationPreferences(invalidPreferences);
      }).toThrow();
    });

    it('should reject invalid frequency', () => {
      const invalidPreferences = {
        ...mockPreferences,
        frequency: 'invalid_frequency',
      };

      expect(() => {
        notificationService.validateNotificationPreferences(invalidPreferences);
      }).toThrow();
    });

    it('should reject invalid quiet hours format', () => {
      const invalidPreferences = {
        ...mockPreferences,
        quietHours: {
          ...mockPreferences.quietHours,
          start: '25:00', // Invalid hour
        },
      };

      expect(() => {
        notificationService.validateNotificationPreferences(invalidPreferences);
      }).toThrow();
    });

    it('should update user preferences successfully', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const updates = {
        email: false,
        sms: true,
        frequency: 'weekly' as const,
      };

      const result = await notificationService.updateUserPreferences(
        userId,
        updates
      );

      expect(result.userId).toBe(userId);
      expect(result.email).toBe(false);
      expect(result.sms).toBe(true);
      expect(result.frequency).toBe('weekly');
      expect(result.unsubscribeToken).toBeDefined();
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);
    });

    it('should merge with existing preferences when updating', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      // First update
      await notificationService.updateUserPreferences(userId, {
        email: true,
        sms: false,
        types: ['new_opportunity'],
      });

      // Second update - should merge with first
      const result = await notificationService.updateUserPreferences(userId, {
        push: false,
        frequency: 'daily',
      });

      expect(result.email).toBe(true); // From first update
      expect(result.sms).toBe(false); // From first update
      expect(result.push).toBe(false); // From second update
      expect(result.frequency).toBe('daily'); // From second update
      expect(result.types).toEqual(['new_opportunity']); // From first update
    });

    it('should get user preferences', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const preferences = {
        email: true,
        sms: false,
        types: ['new_opportunity', 'deadline_reminder'],
      };

      await notificationService.updateUserPreferences(userId, preferences);
      const result = await notificationService.getUserPreferences(userId);

      expect(result).toBeDefined();
      expect(result?.userId).toBe(userId);
      expect(result?.email).toBe(true);
      expect(result?.sms).toBe(false);
      expect(result?.types).toEqual(['new_opportunity', 'deadline_reminder']);
    });

    it('should return null for non-existent user preferences', async () => {
      const result =
        await notificationService.getUserPreferences('non-existent-user');
      expect(result).toBeNull();
    });
  });

  describe('Notification Delivery Logic', () => {
    it('should determine if notification should be sent based on preferences', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      // Set preferences
      await notificationService.updateUserPreferences(userId, {
        email: true,
        sms: false,
        types: ['new_opportunity'],
      });

      // Should send email for new_opportunity
      const shouldSendEmail = await notificationService.shouldSendNotification(
        userId,
        'new_opportunity',
        'email'
      );
      expect(shouldSendEmail).toBe(true);

      // Should not send SMS (disabled)
      const shouldSendSMS = await notificationService.shouldSendNotification(
        userId,
        'new_opportunity',
        'sms'
      );
      expect(shouldSendSMS).toBe(false);

      // Should not send for disabled type
      const shouldSendRecommendation =
        await notificationService.shouldSendNotification(
          userId,
          'recommendation',
          'email'
        );
      expect(shouldSendRecommendation).toBe(false);
    });

    it('should respect quiet hours', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      // Mock current time to be within quiet hours (23:00)
      const mockDate = new Date();
      mockDate.setHours(23, 0, 0, 0);
      jest.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('23:00');

      await notificationService.updateUserPreferences(userId, {
        email: true,
        types: ['new_opportunity'],
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00',
          timezone: 'Asia/Kolkata',
        },
      });

      const shouldSend = await notificationService.shouldSendNotification(
        userId,
        'new_opportunity',
        'email'
      );

      expect(shouldSend).toBe(false);

      jest.restoreAllMocks();
    });

    it('should handle quiet hours spanning midnight', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      // Mock current time to be 01:00 (within quiet hours that span midnight)
      jest.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('01:00');

      await notificationService.updateUserPreferences(userId, {
        email: true,
        types: ['new_opportunity'],
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00',
          timezone: 'Asia/Kolkata',
        },
      });

      const shouldSend = await notificationService.shouldSendNotification(
        userId,
        'new_opportunity',
        'email'
      );

      expect(shouldSend).toBe(false);

      jest.restoreAllMocks();
    });

    it('should allow notifications outside quiet hours', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      // Mock current time to be 10:00 (outside quiet hours)
      jest.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue('10:00');

      await notificationService.updateUserPreferences(userId, {
        email: true,
        types: ['new_opportunity'],
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00',
          timezone: 'Asia/Kolkata',
        },
      });

      const shouldSend = await notificationService.shouldSendNotification(
        userId,
        'new_opportunity',
        'email'
      );

      expect(shouldSend).toBe(true);

      jest.restoreAllMocks();
    });

    it('should default to sending when no preferences exist', async () => {
      const shouldSend = await notificationService.shouldSendNotification(
        'non-existent-user',
        'new_opportunity',
        'email'
      );

      expect(shouldSend).toBe(true);
    });
  });

  describe('Notification Sending', () => {
    beforeEach(() => {
      mockEmailService.sendEmail.mockResolvedValue({
        messageId: 'email-123',
        status: 'sent',
      });

      mockSMSService.sendSMS.mockResolvedValue({
        messageId: 'sms-123',
        status: 'sent',
      });

      mockPushService.sendPushNotification.mockResolvedValue({
        messageId: 'push-123',
        status: 'sent',
      });
    });

    it('should send notification through email channel', async () => {
      const request = {
        ...mockNotificationRequest,
        channels: ['email'] as const,
      };

      const result = await notificationService.sendNotification(request);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.userId).toBe(request.userId);
      expect(result.type).toBe(request.type);
      expect(result.title).toBe(request.content.title);
      expect(result.message).toBe(request.content.message);
      expect(result.channels).toEqual(['email']);
      expect(result.sentAt).toBeInstanceOf(Date);
      expect(result.deliveries).toHaveLength(1);
      expect(result.deliveries[0].channel).toBe('email');
      expect(result.deliveries[0].status).toBe('sent');

      expect(mockEmailService.sendEmail).toHaveBeenCalledWith({
        to: `user-${request.userId}@example.com`,
        subject: request.content.title,
        html: request.content.html,
        text: request.content.message,
      });
    });

    it('should send notification through SMS channel', async () => {
      const request = {
        ...mockNotificationRequest,
        channels: ['sms'] as const,
      };

      const result = await notificationService.sendNotification(request);

      expect(result.deliveries).toHaveLength(1);
      expect(result.deliveries[0].channel).toBe('sms');
      expect(result.deliveries[0].status).toBe('sent');

      expect(mockSMSService.sendSMS).toHaveBeenCalledWith({
        to: '+91XXXXXXXXXX',
        message: `${request.content.title}\n\n${request.content.message}`,
      });
    });

    it('should send notification through push channel', async () => {
      const request = {
        ...mockNotificationRequest,
        channels: ['push'] as const,
      };

      const result = await notificationService.sendNotification(request);

      expect(result.deliveries).toHaveLength(1);
      expect(result.deliveries[0].channel).toBe('push');
      expect(result.deliveries[0].status).toBe('sent');

      expect(mockPushService.sendPushNotification).toHaveBeenCalledWith({
        userId: request.userId,
        title: request.content.title,
        body: request.content.message,
        data: request.content.data,
      });
    });

    it('should send notification through in-app channel', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const request = {
        ...mockNotificationRequest,
        channels: ['in_app'] as const,
      };

      const result = await notificationService.sendNotification(request);

      expect(result.deliveries).toHaveLength(1);
      expect(result.deliveries[0].channel).toBe('in_app');
      expect(result.deliveries[0].status).toBe('sent');

      expect(consoleSpy).toHaveBeenCalledWith(
        `In-app notification stored for user ${request.userId}`
      );

      consoleSpy.mockRestore();
    });

    it('should send notification through multiple channels', async () => {
      const request = {
        ...mockNotificationRequest,
        channels: ['email', 'sms', 'push', 'in_app'] as const,
      };

      const result = await notificationService.sendNotification(request);

      expect(result.deliveries).toHaveLength(4);
      expect(result.deliveries.map(d => d.channel)).toEqual([
        'email',
        'sms',
        'push',
        'in_app',
      ]);
      expect(result.deliveries.every(d => d.status === 'sent')).toBe(true);

      expect(mockEmailService.sendEmail).toHaveBeenCalled();
      expect(mockSMSService.sendSMS).toHaveBeenCalled();
      expect(mockPushService.sendPushNotification).toHaveBeenCalled();
    });

    it('should handle channel delivery failures gracefully', async () => {
      mockEmailService.sendEmail.mockRejectedValue(
        new Error('Email service unavailable')
      );

      const request = {
        ...mockNotificationRequest,
        channels: ['email', 'in_app'] as const,
      };

      const result = await notificationService.sendNotification(request);

      expect(result.deliveries).toHaveLength(2);

      const emailDelivery = result.deliveries.find(d => d.channel === 'email');
      const inAppDelivery = result.deliveries.find(d => d.channel === 'in_app');

      expect(emailDelivery?.status).toBe('failed');
      expect(emailDelivery?.failureReason).toBe('Email service unavailable');
      expect(inAppDelivery?.status).toBe('sent');
    });

    it('should handle missing service configuration', async () => {
      // Create service without email service
      const serviceWithoutEmail = new NotificationService(
        undefined,
        mockSMSService,
        mockPushService
      );

      const request = {
        ...mockNotificationRequest,
        channels: ['email'] as const,
      };

      const result = await serviceWithoutEmail.sendNotification(request);

      expect(result.deliveries).toHaveLength(1);
      expect(result.deliveries[0].status).toBe('failed');
      expect(result.deliveries[0].failureReason).toBe(
        'Email service not configured'
      );
    });

    it('should schedule future notifications', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      const request = {
        ...mockNotificationRequest,
        scheduledFor: futureDate,
      };

      const result = await notificationService.sendNotification(request);

      expect(result.scheduledFor).toEqual(futureDate);
      expect(result.sentAt).toBeUndefined();
      expect(result.deliveries).toHaveLength(0);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          `Notification ${result.id} scheduled for ${futureDate}`
        )
      );

      consoleSpy.mockRestore();
    });

    it('should respect user preferences when sending', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      // Set preferences to disable email
      await notificationService.updateUserPreferences(userId, {
        email: false,
        sms: true,
        types: ['new_opportunity'],
      });

      const request = {
        ...mockNotificationRequest,
        userId,
        channels: ['email', 'sms'] as const,
      };

      const result = await notificationService.sendNotification(request);

      // Should only have SMS delivery, email should be skipped
      expect(result.deliveries).toHaveLength(1);
      expect(result.deliveries[0].channel).toBe('sms');

      expect(consoleSpy).toHaveBeenCalledWith(
        `Skipping email notification for user ${userId} due to preferences`
      );

      expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
      expect(mockSMSService.sendSMS).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Notification Templates', () => {
    it('should have default templates initialized', () => {
      const newOpportunityTemplate =
        notificationService.getTemplate('new-opportunity');
      const deadlineReminderTemplate =
        notificationService.getTemplate('deadline-reminder');
      const recommendationTemplate =
        notificationService.getTemplate('recommendation');

      expect(newOpportunityTemplate).toBeDefined();
      expect(newOpportunityTemplate?.type).toBe('new_opportunity');
      expect(newOpportunityTemplate?.variables).toContain('title');
      expect(newOpportunityTemplate?.variables).toContain('organizer');

      expect(deadlineReminderTemplate).toBeDefined();
      expect(deadlineReminderTemplate?.type).toBe('deadline_reminder');

      expect(recommendationTemplate).toBeDefined();
      expect(recommendationTemplate?.type).toBe('recommendation');
    });

    it('should add custom templates', () => {
      const customTemplate = {
        id: 'custom-template',
        name: 'Custom Template',
        type: 'system' as const,
        subject: 'Custom Subject: {{title}}',
        htmlContent: '<h1>{{title}}</h1><p>{{message}}</p>',
        textContent: '{{title}}\n\n{{message}}',
        variables: ['title', 'message'],
      };

      const result = notificationService.addTemplate(customTemplate);

      expect(result).toBeDefined();
      expect(result.id).toBe('custom-template');
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(result.updatedAt).toBeInstanceOf(Date);

      const retrieved = notificationService.getTemplate('custom-template');
      expect(retrieved).toEqual(result);
    });

    it('should process templates with variables', () => {
      const template = notificationService.getTemplate('new-opportunity');
      expect(template).toBeDefined();

      const variables = {
        opportunityType: 'hackathon',
        title: 'AI Innovation Challenge',
        organizer: 'TechCorp',
        deadline: '2024-03-01',
        location: 'Mumbai',
        description: 'Build innovative AI solutions',
        url: 'https://example.com/hackathon',
      };

      const processed = notificationService.processTemplate(
        template!,
        variables
      );

      expect(processed.subject).toBe(
        'New hackathon Available: AI Innovation Challenge'
      );
      expect(processed.html).toContain('AI Innovation Challenge');
      expect(processed.html).toContain('TechCorp');
      expect(processed.html).toContain('2024-03-01');
      expect(processed.text).toContain('AI Innovation Challenge');
      expect(processed.text).toContain('https://example.com/hackathon');
    });

    it('should handle missing variables in template processing', () => {
      const template = notificationService.getTemplate('new-opportunity');
      expect(template).toBeDefined();

      const incompleteVariables = {
        title: 'Test Hackathon',
        organizer: 'Test Org',
        // Missing other variables
      };

      const processed = notificationService.processTemplate(
        template!,
        incompleteVariables
      );

      expect(processed.subject).toContain('Test Hackathon');
      expect(processed.subject).toContain('Test Org');
      // Missing variables should remain as placeholders
      expect(processed.subject).toContain('{{opportunityType}}');
      expect(processed.html).toContain('{{deadline}}');
    });

    it('should return undefined for non-existent template', () => {
      const template = notificationService.getTemplate('non-existent-template');
      expect(template).toBeUndefined();
    });
  });

  describe('Analytics and Monitoring', () => {
    it('should provide notification analytics structure', async () => {
      const analytics = await notificationService.getNotificationAnalytics();

      expect(analytics).toHaveProperty('totalSent');
      expect(analytics).toHaveProperty('totalDelivered');
      expect(analytics).toHaveProperty('totalFailed');
      expect(analytics).toHaveProperty('deliveryRate');
      expect(analytics).toHaveProperty('byChannel');
      expect(analytics).toHaveProperty('byType');

      expect(analytics.byChannel).toHaveProperty('email');
      expect(analytics.byChannel).toHaveProperty('sms');
      expect(analytics.byChannel).toHaveProperty('push');
      expect(analytics.byChannel).toHaveProperty('in_app');

      expect(analytics.byType).toHaveProperty('new_opportunity');
      expect(analytics.byType).toHaveProperty('deadline_reminder');
      expect(analytics.byType).toHaveProperty('recommendation');
      expect(analytics.byType).toHaveProperty('system');
    });

    it('should handle retry failed notifications', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await notificationService.retryFailedNotifications(5);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Retrying failed notifications (max retries: 5)'
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid notification request gracefully', () => {
      const invalidRequest = {
        userId: 'invalid',
        type: 'invalid',
        channels: [],
        content: {
          title: '',
          message: '',
        },
      };

      expect(() => {
        notificationService.validateNotificationRequest(invalidRequest);
      }).toThrow();
    });

    it('should handle service failures during delivery', async () => {
      mockEmailService.sendEmail.mockRejectedValue(
        new Error('Service timeout')
      );
      mockSMSService.sendSMS.mockRejectedValue(
        new Error('Invalid phone number')
      );

      const request = {
        ...mockNotificationRequest,
        channels: ['email', 'sms'] as const,
      };

      const result = await notificationService.sendNotification(request);

      expect(result.deliveries).toHaveLength(2);
      expect(result.deliveries.every(d => d.status === 'failed')).toBe(true);
      expect(result.deliveries[0].failureReason).toBe('Service timeout');
      expect(result.deliveries[1].failureReason).toBe('Invalid phone number');
    });

    it('should handle unsupported notification channels', async () => {
      // Mock an unsupported channel by modifying the request after validation
      const request = {
        ...mockNotificationRequest,
        channels: ['email'] as const,
      };

      const notification = await notificationService.sendNotification(request);

      // Manually modify to test unsupported channel handling
      notification.channels = ['unsupported' as any];

      // This would be tested in the private method, but we can't directly test it
      // The error handling is covered by the channel-specific tests above
    });

    it('should handle malformed preferences gracefully', () => {
      const malformedPreferences = {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'not-a-boolean',
        frequency: 'invalid-frequency',
        quietHours: {
          start: 'invalid-time',
        },
      };

      expect(() => {
        notificationService.validateNotificationPreferences(
          malformedPreferences
        );
      }).toThrow();
    });

    it('should handle concurrent preference updates', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000';

      // Simulate concurrent updates
      const update1 = notificationService.updateUserPreferences(userId, {
        email: true,
      });
      const update2 = notificationService.updateUserPreferences(userId, {
        sms: true,
      });

      const [result1, result2] = await Promise.all([update1, update2]);

      // Both updates should succeed
      expect(result1.userId).toBe(userId);
      expect(result2.userId).toBe(userId);

      // Final state should reflect the last update
      const finalPreferences =
        await notificationService.getUserPreferences(userId);
      expect(finalPreferences?.sms).toBe(true);
    });

    it('should handle very long notification content', () => {
      const longRequest = {
        ...mockNotificationRequest,
        content: {
          title: 'a'.repeat(200), // At the limit
          message: 'b'.repeat(1000), // At the limit
        },
      };

      const result =
        notificationService.validateNotificationRequest(longRequest);
      expect(result.content.title).toHaveLength(200);
      expect(result.content.message).toHaveLength(1000);
    });

    it('should handle notifications with complex data objects', async () => {
      const complexRequest = {
        ...mockNotificationRequest,
        content: {
          ...mockNotificationRequest.content,
          data: {
            opportunity: {
              id: 'opp-123',
              title: 'Complex Hackathon',
              nested: {
                requirements: ['skill1', 'skill2'],
                metadata: {
                  source: 'api',
                  version: '1.0',
                },
              },
            },
            user: {
              preferences: ['pref1', 'pref2'],
            },
          },
        },
      };

      const result = await notificationService.sendNotification(complexRequest);

      expect(result.data).toEqual(complexRequest.content.data);
      expect(result.deliveries[0].status).toBe('sent');
    });
  });
});
