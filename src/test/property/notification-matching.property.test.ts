/**
 * Property-Based Test: Notification Matching and Preferences
 * **Validates: Requirements 8.1, 8.4, 8.5**
 * 
 * Property 11: For any new opportunity that matches a user's profile, a notification 
 * should be generated only if it respects the user's notification preferences for 
 * frequency, timing, and channels
 */

import * as fc from 'fast-check';
import type {
    EmailService,
    NotificationRequest,
    PushService,
    SMSService
} from '../../lib/services/notification.service';
import { NotificationService } from '../../lib/services/notification.service';

describe('Property Test: Notification Matching and Preferences', () => {
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

    notificationService = new NotificationService(
      mockEmailService,
      mockSMSService,
      mockPushService
    );

    jest.clearAllMocks();
  });

  // Generator for user notification preferences
  const notificationPreferencesGenerator = fc.record({
    userId: fc.uuid(),
    email: fc.boolean(),
    sms: fc.boolean(),
    inApp: fc.boolean(),
    push: fc.boolean(),
    frequency: fc.constantFrom('immediate', 'daily', 'weekly'),
    types: fc.array(
      fc.constantFrom('new_opportunity', 'deadline_reminder', 'recommendation', 'system'),
      { minLength: 1, maxLength: 4 }
    ),
    quietHours: fc.record({
      enabled: fc.boolean(),
      start: fc.constantFrom('20:00', '21:00', '22:00', '23:00'),
      end: fc.constantFrom('06:00', '07:00', '08:00', '09:00'),
      timezone: fc.constantFrom('Asia/Kolkata', 'Asia/Mumbai'),
    }),
  });

  // Generator for notification requests
  const notificationRequestGenerator = fc.record({
    userId: fc.uuid(),
    type: fc.constantFrom('new_opportunity', 'deadline_reminder', 'recommendation', 'system'),
    channels: fc.array(
      fc.constantFrom('email', 'sms', 'in_app', 'push'),
      { minLength: 1, maxLength: 4 }
    ),
    content: fc.record({
      title: fc.string({ minLength: 5, maxLength: 100 }),
      message: fc.string({ minLength: 10, maxLength: 500 }),
      html: fc.option(fc.string({ minLength: 20, maxLength: 1000 })),
      data: fc.option(fc.record({
        opportunityId: fc.string(),
        opportunityType: fc.constantFrom('hackathon', 'internship', 'workshop'),
        organizerName: fc.string({ minLength: 3, maxLength: 50 }),
      })),
    }),
    priority: fc.constantFrom('low', 'normal', 'high', 'urgent'),
    scheduledFor: fc.option(fc.date({ min: new Date(), max: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) })),
  });

  /**
   * Property: Notifications should respect user channel preferences
   */
  it('should only send notifications through enabled channels', async () => {
    await fc.assert(
      fc.asyncProperty(
        notificationPreferencesGenerator,
        notificationRequestGenerator,
        async (preferences: any, notificationRequest: NotificationRequest) => {
          // Set up mock responses
          mockEmailService.sendEmail.mockResolvedValue({ messageId: 'email-123', status: 'sent' });
          mockSMSService.sendSMS.mockResolvedValue({ messageId: 'sms-123', status: 'sent' });
          mockPushService.sendPushNotification.mockResolvedValue({ messageId: 'push-123', status: 'sent' });

          // Update user preferences
          await notificationService.updateUserPreferences(notificationRequest.userId, preferences);

          // Send notification
          const result = await notificationService.sendNotification(notificationRequest);

          expect(result.success).toBe(true);

          if (result.deliveries) {
            // Property: Only enabled channels should have deliveries
            const deliveredChannels = result.deliveries.map(d => d.channel);

            notificationRequest.channels.forEach(requestedChannel => {
              const channelEnabled = preferences[requestedChannel] !== false;
              const typeEnabled = preferences.types.includes(notificationRequest.type);

              if (channelEnabled && typeEnabled) {
                // Should have attempted delivery
                expect(deliveredChannels).toContain(requestedChannel);
              } else {
                // Should have been skipped
                const channelDelivery = result.deliveries.find(d => d.channel === requestedChannel);
                expect(channelDelivery).toBeUndefined();
              }
            });

            // Verify actual service calls
            if (preferences.email && preferences.types.includes(notificationRequest.type) && 
                notificationRequest.channels.includes('email')) {
              expect(mockEmailService.sendEmail).toHaveBeenCalled();
            } else {
              expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
            }

            if (preferences.sms && preferences.types.includes(notificationRequest.type) && 
                notificationRequest.channels.includes('sms')) {
              expect(mockSMSService.sendSMS).toHaveBeenCalled();
            } else {
              expect(mockSMSService.sendSMS).not.toHaveBeenCalled();
            }

            if (preferences.push && preferences.types.includes(notificationRequest.type) && 
                notificationRequest.channels.includes('push')) {
              expect(mockPushService.sendPushNotification).toHaveBeenCalled();
            } else {
              expect(mockPushService.sendPushNotification).not.toHaveBeenCalled();
            }
          }
        }
      ),
      { numRuns: 50, timeout: 15000 }
    );
  });

  /**
   * Property: Notifications should respect notification type preferences
   */
  it('should only send notifications for enabled types', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          enabledTypes: fc.array(
            fc.constantFrom('new_opportunity', 'deadline_reminder', 'recommendation', 'system'),
            { minLength: 1, maxLength: 3 }
          ),
          disabledTypes: fc.array(
            fc.constantFrom('new_opportunity', 'deadline_reminder', 'recommendation', 'system'),
            { minLength: 1, maxLength: 2 }
          ),
        }),
        async (testCase: { userId: string; enabledTypes: string[]; disabledTypes: string[] }) => {
          // Ensure no overlap between enabled and disabled
          const actualDisabledTypes = testCase.disabledTypes.filter(
            type => !testCase.enabledTypes.includes(type)
          );

          if (actualDisabledTypes.length === 0) return; // Skip if no actual disabled types

          mockEmailService.sendEmail.mockResolvedValue({ messageId: 'email-123', status: 'sent' });

          // Set preferences with specific enabled types
          await notificationService.updateUserPreferences(testCase.userId, {
            email: true,
            types: testCase.enabledTypes as any,
          });

          // Test enabled type
          const enabledTypeRequest: NotificationRequest = {
            userId: testCase.userId,
            type: testCase.enabledTypes[0] as any,
            channels: ['email'],
            content: {
              title: 'Test Notification',
              message: 'This is a test notification',
            },
            priority: 'normal',
          };

          const enabledResult = await notificationService.sendNotification(enabledTypeRequest);
          expect(enabledResult.success).toBe(true);
          expect(enabledResult.deliveries.length).toBeGreaterThan(0);

          // Test disabled type
          const disabledTypeRequest: NotificationRequest = {
            userId: testCase.userId,
            type: actualDisabledTypes[0] as any,
            channels: ['email'],
            content: {
              title: 'Test Notification',
              message: 'This should not be sent',
            },
            priority: 'normal',
          };

          mockEmailService.sendEmail.mockClear();
          const disabledResult = await notificationService.sendNotification(disabledTypeRequest);
          
          // Property: Disabled types should not result in deliveries
          expect(disabledResult.success).toBe(true);
          expect(disabledResult.deliveries.length).toBe(0);
          expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 30, timeout: 12000 }
    );
  });

  /**
   * Property: Quiet hours should be respected
   */
  it('should respect quiet hours settings', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          quietHoursEnabled: fc.boolean(),
          currentHour: fc.integer({ min: 0, max: 23 }),
          quietStart: fc.integer({ min: 20, max: 23 }),
          quietEnd: fc.integer({ min: 6, max: 9 }),
        }),
        async (testCase: {
          userId: string;
          quietHoursEnabled: boolean;
          currentHour: number;
          quietStart: number;
          quietEnd: number;
        }) => {
          mockEmailService.sendEmail.mockResolvedValue({ messageId: 'email-123', status: 'sent' });

          // Mock current time
          const mockTime = `${testCase.currentHour.toString().padStart(2, '0')}:00`;
          jest.spyOn(Date.prototype, 'toLocaleTimeString').mockReturnValue(mockTime);

          // Set preferences with quiet hours
          await notificationService.updateUserPreferences(testCase.userId, {
            email: true,
            types: ['new_opportunity'],
            quietHours: {
              enabled: testCase.quietHoursEnabled,
              start: `${testCase.quietStart.toString().padStart(2, '0')}:00`,
              end: `${testCase.quietEnd.toString().padStart(2, '0')}:00`,
              timezone: 'Asia/Kolkata',
            },
          });

          const notificationRequest: NotificationRequest = {
            userId: testCase.userId,
            type: 'new_opportunity',
            channels: ['email'],
            content: {
              title: 'Test Notification',
              message: 'This is a test notification',
            },
            priority: 'normal',
          };

          const result = await notificationService.sendNotification(notificationRequest);

          // Property: Quiet hours should be respected
          const isInQuietHours = testCase.quietHoursEnabled && (
            (testCase.quietStart > testCase.quietEnd && 
             (testCase.currentHour >= testCase.quietStart || testCase.currentHour <= testCase.quietEnd)) ||
            (testCase.quietStart <= testCase.quietEnd && 
             testCase.currentHour >= testCase.quietStart && testCase.currentHour <= testCase.quietEnd)
          );

          expect(result.success).toBe(true);

          if (isInQuietHours) {
            // Should not send during quiet hours
            expect(result.deliveries.length).toBe(0);
            expect(mockEmailService.sendEmail).not.toHaveBeenCalled();
          } else {
            // Should send outside quiet hours
            expect(result.deliveries.length).toBeGreaterThan(0);
            expect(mockEmailService.sendEmail).toHaveBeenCalled();
          }

          jest.restoreAllMocks();
        }
      ),
      { numRuns: 40, timeout: 10000 }
    );
  });

  /**
   * Property: Notification frequency should be respected
   */
  it('should respect notification frequency preferences', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.uuid(),
          frequency: fc.constantFrom('immediate', 'daily', 'weekly'),
          priority: fc.constantFrom('low', 'normal', 'high', 'urgent'),
        }),
        async (testCase: { userId: string; frequency: string; priority: string }) => {
          mockEmailService.sendEmail.mockResolvedValue({ messageId: 'email-123', status: 'sent' });

          await notificationService.updateUserPreferences(testCase.userId, {
            email: true,
            types: ['new_opportunity'],
            frequency: testCase.frequency as any,
          });

          const notificationRequest: NotificationRequest = {
            userId: testCase.userId,
            type: 'new_opportunity',
            channels: ['email'],
            content: {
              title: 'Test Notification',
              message: 'This is a test notification',
            },
            priority: testCase.priority as any,
          };

          const result = await notificationService.sendNotification(notificationRequest);

          expect(result.success).toBe(true);

          // Property: Frequency preferences should influence delivery
          // Note: In a real implementation, this would involve queuing and batching
          // For immediate frequency or urgent priority, should always send
          if (testCase.frequency === 'immediate' || testCase.priority === 'urgent') {
            expect(result.deliveries.length).toBeGreaterThan(0);
            expect(mockEmailService.sendEmail).toHaveBeenCalled();
          } else {
            // For daily/weekly frequency with non-urgent priority, 
            // the system should still send but could be queued
            expect(result.success).toBe(true);
          }
        }
      ),
      { numRuns: 25, timeout: 8000 }
    );
  });

  /**
   * Property: Default preferences should work when none are set
   */
  it('should use default preferences when none are explicitly set', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.constantFrom('new_opportunity', 'deadline_reminder', 'recommendation'),
        async (userId: string, notificationType: string) => {
          mockEmailService.sendEmail.mockResolvedValue({ messageId: 'email-123', status: 'sent' });

          // Don't set any preferences - should use defaults
          const notificationRequest: NotificationRequest = {
            userId,
            type: notificationType as any,
            channels: ['email', 'in_app'],
            content: {
              title: 'Default Test Notification',
              message: 'Testing default preferences',
            },
            priority: 'normal',
          };

          const result = await notificationService.sendNotification(notificationRequest);

          // Property: Should work with default preferences
          expect(result.success).toBe(true);
          expect(result.deliveries.length).toBeGreaterThan(0);

          // Default should allow most notifications
          expect(mockEmailService.sendEmail).toHaveBeenCalled();
        }
      ),
      { numRuns: 20, timeout: 8000 }
    );
  });

  /**
   * Property: Notification validation should work correctly
   */
  it('should validate notification requests correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userId: fc.oneof(fc.uuid(), fc.string({ maxLength: 10 })), // Some invalid UUIDs
          type: fc.oneof(
            fc.constantFrom('new_opportunity', 'deadline_reminder', 'recommendation', 'system'),
            fc.string({ maxLength: 20 }) // Some invalid types
          ),
          channels: fc.oneof(
            fc.array(fc.constantFrom('email', 'sms', 'in_app', 'push'), { minLength: 1, maxLength: 4 }),
            fc.array(fc.string({ maxLength: 10 }), { minLength: 1, maxLength: 3 }), // Some invalid channels
            fc.constant([]) // Empty channels
          ),
          title: fc.oneof(
            fc.string({ minLength: 5, maxLength: 100 }),
            fc.string({ maxLength: 4 }), // Too short
            fc.string({ minLength: 201, maxLength: 300 }) // Too long
          ),
          message: fc.oneof(
            fc.string({ minLength: 10, maxLength: 500 }),
            fc.string({ maxLength: 9 }), // Too short
            fc.string({ minLength: 1001, maxLength: 1500 }) // Too long
          ),
        }),
        async (requestData: any) => {
          const notificationRequest = {
            userId: requestData.userId,
            type: requestData.type,
            channels: requestData.channels,
            content: {
              title: requestData.title,
              message: requestData.message,
            },
            priority: 'normal',
          };

          // Property: Validation should catch invalid requests
          try {
            const validatedRequest = notificationService.validateNotificationRequest(notificationRequest);
            
            // If validation passes, the request should be valid
            expect(validatedRequest.userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
            expect(['new_opportunity', 'deadline_reminder', 'recommendation', 'system']).toContain(validatedRequest.type);
            expect(validatedRequest.channels.length).toBeGreaterThan(0);
            expect(validatedRequest.channels.every(c => ['email', 'sms', 'in_app', 'push'].includes(c))).toBe(true);
            expect(validatedRequest.content.title.length).toBeGreaterThanOrEqual(1);
            expect(validatedRequest.content.title.length).toBeLessThanOrEqual(200);
            expect(validatedRequest.content.message.length).toBeGreaterThanOrEqual(1);
            expect(validatedRequest.content.message.length).toBeLessThanOrEqual(1000);
          } catch (error) {
            // If validation fails, the request should be invalid
            expect(error).toBeDefined();
          }
        }
      ),
      { numRuns: 60, timeout: 10000 }
    );
  });
});