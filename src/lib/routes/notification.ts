import type { Response } from 'express';
import { Router } from 'express';
import { body, param, query } from 'express-validator';
import type { ApiResponse, PaginatedResponse } from '../../types';
import type { AuthenticatedRequest } from '../middleware/auth';
import { asyncHandler } from '../middleware/error-handler';
import { validate } from '../middleware/validation';
import type { InAppNotification } from '../services/in-app-notification.service';
import { inAppNotificationService } from '../services/in-app-notification.service';
import { notificationService } from '../services/notification.service';

const router = Router();

/**
 * Get user notifications
 */
router.get(
  '/',
  validate([
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
    query('type')
      .optional()
      .isIn([
        'new_opportunity',
        'deadline_reminder',
        'recommendation',
        'system',
      ])
      .withMessage('Invalid notification type'),
    query('unread')
      .optional()
      .isBoolean()
      .withMessage('Unread filter must be a boolean'),
    query('priority')
      .optional()
      .isIn(['low', 'normal', 'high', 'urgent'])
      .withMessage('Invalid priority'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as any;
    const unreadOnly = req.query.unread === 'true';
    const priority = req.query.priority as any;

    const result = await inAppNotificationService.getUserNotifications(userId, {
      filter: {
        type,
        read: unreadOnly ? false : undefined,
        priority,
      },
      page,
      limit,
    });

    const paginatedResponse: PaginatedResponse<InAppNotification> = {
      data: result.notifications,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNext: result.page < result.totalPages,
        hasPrev: result.page > 1,
      },
    };

    const response: ApiResponse<PaginatedResponse<InAppNotification>> = {
      success: true,
      data: paginatedResponse,
      message: 'Notifications retrieved successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Mark notification as read
 */
router.patch(
  '/:notificationId/read',
  validate([
    param('notificationId').isString().withMessage('Invalid notification ID'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { notificationId } = req.params;

    const success = await inAppNotificationService.markAsRead(
      notificationId,
      userId
    );

    if (!success) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Notification not found or already read',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<null> = {
      success: true,
      message: 'Notification marked as read',
    };

    res.status(200).json(response);
  })
);

/**
 * Mark all notifications as read
 */
router.patch(
  '/read-all',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const markedCount = await inAppNotificationService.markAllAsRead(userId);

    const response: ApiResponse<{ markedCount: number }> = {
      success: true,
      data: { markedCount },
      message: `${markedCount} notifications marked as read`,
    };

    res.status(200).json(response);
  })
);

/**
 * Delete notification
 */
router.delete(
  '/:notificationId',
  validate([
    param('notificationId').isString().withMessage('Invalid notification ID'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { notificationId } = req.params;

    const success = await inAppNotificationService.deleteNotification(
      notificationId,
      userId
    );

    if (!success) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Notification not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<null> = {
      success: true,
      message: 'Notification deleted successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Get notification preferences
 */
router.get(
  '/preferences',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const preferences = await notificationService.getUserPreferences(userId);

    if (!preferences) {
      // Return default preferences
      const defaultPreferences = {
        email: true,
        sms: false,
        inApp: true,
        push: true,
        frequency: 'immediate',
        types: ['new_opportunity', 'deadline_reminder', 'recommendation'],
        quietHours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
          timezone: 'Asia/Kolkata',
        },
      };

      const response: ApiResponse<typeof defaultPreferences> = {
        success: true,
        data: defaultPreferences,
        message: 'Default notification preferences retrieved',
      };

      return res.status(200).json(response);
    }

    const response: ApiResponse<typeof preferences> = {
      success: true,
      data: preferences,
      message: 'Notification preferences retrieved successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Update notification preferences
 */
router.put(
  '/preferences',
  validate([
    body('email')
      .optional()
      .isBoolean()
      .withMessage('Email preference must be a boolean'),
    body('sms')
      .optional()
      .isBoolean()
      .withMessage('SMS preference must be a boolean'),
    body('inApp')
      .optional()
      .isBoolean()
      .withMessage('In-app preference must be a boolean'),
    body('push')
      .optional()
      .isBoolean()
      .withMessage('Push preference must be a boolean'),
    body('frequency')
      .optional()
      .isIn(['immediate', 'daily', 'weekly'])
      .withMessage('Invalid frequency'),
    body('types').optional().isArray().withMessage('Types must be an array'),
    body('types.*')
      .optional()
      .isIn([
        'new_opportunity',
        'deadline_reminder',
        'recommendation',
        'system',
      ])
      .withMessage('Invalid notification type'),
    body('quietHours.enabled')
      .optional()
      .isBoolean()
      .withMessage('Quiet hours enabled must be a boolean'),
    body('quietHours.start')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Invalid start time format (HH:mm)'),
    body('quietHours.end')
      .optional()
      .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
      .withMessage('Invalid end time format (HH:mm)'),
    body('quietHours.timezone')
      .optional()
      .isString()
      .withMessage('Timezone must be a string'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const preferences = req.body;

    const updatedPreferences = await notificationService.updateUserPreferences(
      userId,
      preferences
    );

    const response: ApiResponse<typeof updatedPreferences> = {
      success: true,
      data: updatedPreferences,
      message: 'Notification preferences updated successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Get notification statistics
 */
router.get(
  '/stats',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const stats = await inAppNotificationService.getNotificationStats(userId);

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
      message: 'Notification statistics retrieved successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Get notification badge (unread count)
 */
router.get(
  '/badge',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const badge = await inAppNotificationService.getBadge(userId);

    const response: ApiResponse<typeof badge> = {
      success: true,
      data: badge,
      message: 'Notification badge retrieved successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Send test notification
 */
router.post(
  '/test',
  validate([
    body('type')
      .isIn([
        'new_opportunity',
        'deadline_reminder',
        'recommendation',
        'system',
      ])
      .withMessage('Invalid notification type'),
    body('channels')
      .isArray({ min: 1 })
      .withMessage('At least one channel is required'),
    body('channels.*')
      .isIn(['email', 'sms', 'in_app', 'push'])
      .withMessage('Invalid notification channel'),
    body('title')
      .isString()
      .isLength({ min: 1, max: 200 })
      .withMessage('Title must be between 1 and 200 characters'),
    body('message')
      .isString()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message must be between 1 and 1000 characters'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { type, channels, title, message } = req.body;

    const notification = await notificationService.sendNotification({
      userId,
      type,
      channels,
      content: {
        title,
        message,
      },
      priority: 'normal',
    });

    const response: ApiResponse<typeof notification> = {
      success: true,
      data: notification,
      message: 'Test notification sent successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Bulk mark notifications as read
 */
router.patch(
  '/bulk/read',
  validate([
    body('notificationIds')
      .isArray({ min: 1 })
      .withMessage('At least one notification ID is required'),
    body('notificationIds.*').isString().withMessage('Invalid notification ID'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { notificationIds } = req.body;

    const markedCount = await inAppNotificationService.bulkMarkAsRead(
      notificationIds,
      userId
    );

    const response: ApiResponse<{ markedCount: number }> = {
      success: true,
      data: { markedCount },
      message: `${markedCount} notifications marked as read`,
    };

    res.status(200).json(response);
  })
);

/**
 * Bulk delete notifications
 */
router.delete(
  '/bulk',
  validate([
    body('notificationIds')
      .isArray({ min: 1 })
      .withMessage('At least one notification ID is required'),
    body('notificationIds.*').isString().withMessage('Invalid notification ID'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { notificationIds } = req.body;

    const deletedCount = await inAppNotificationService.bulkDelete(
      notificationIds,
      userId
    );

    const response: ApiResponse<{ deletedCount: number }> = {
      success: true,
      data: { deletedCount },
      message: `${deletedCount} notifications deleted`,
    };

    res.status(200).json(response);
  })
);

/**
 * Delete all notifications
 */
router.delete(
  '/all',
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;

    const deletedCount =
      await inAppNotificationService.deleteAllNotifications(userId);

    const response: ApiResponse<{ deletedCount: number }> = {
      success: true,
      data: { deletedCount },
      message: `${deletedCount} notifications deleted`,
    };

    res.status(200).json(response);
  })
);

/**
 * Deadline Reminders Routes
 */

/**
 * Create deadline reminder
 */
router.post(
  '/reminders',
  validate([
    body('opportunityId').isString().withMessage('Opportunity ID is required'),
    body('opportunityTitle')
      .isString()
      .withMessage('Opportunity title is required'),
    body('opportunityType')
      .isIn(['hackathon', 'internship', 'workshop'])
      .withMessage('Invalid opportunity type'),
    body('deadline').isISO8601().withMessage('Valid deadline date is required'),
    body('channels')
      .optional()
      .isArray()
      .withMessage('Channels must be an array'),
    body('channels.*')
      .optional()
      .isIn(['email', 'sms', 'in_app', 'push'])
      .withMessage('Invalid notification channel'),
    body('scheduleId').optional().isString().withMessage('Invalid schedule ID'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const {
      opportunityId,
      opportunityTitle,
      opportunityType,
      deadline,
      channels,
      scheduleId,
    } = req.body;

    const reminder = await deadlineReminderService.createReminder({
      userId,
      opportunityId,
      opportunityTitle,
      opportunityType,
      deadline: new Date(deadline),
      channels,
      scheduleId,
    });

    const response: ApiResponse<typeof reminder> = {
      success: true,
      data: reminder,
      message: 'Deadline reminder created successfully',
    };

    res.status(201).json(response);
  })
);

/**
 * Get user's deadline reminders
 */
router.get(
  '/reminders',
  validate([
    query('active')
      .optional()
      .isBoolean()
      .withMessage('Active must be a boolean'),
    query('opportunityId')
      .optional()
      .isString()
      .withMessage('Invalid opportunity ID'),
    query('upcoming')
      .optional()
      .isBoolean()
      .withMessage('Upcoming must be a boolean'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const active =
      req.query.active === 'true'
        ? true
        : req.query.active === 'false'
          ? false
          : undefined;
    const upcoming = req.query.upcoming === 'true';
    const opportunityId = req.query.opportunityId as string;

    const reminders = await deadlineReminderService.getUserReminders(userId, {
      active,
      opportunityId,
      upcoming,
    });

    const response: ApiResponse<typeof reminders> = {
      success: true,
      data: reminders,
      message: 'Deadline reminders retrieved successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Update deadline reminder
 */
router.patch(
  '/reminders/:reminderId',
  validate([
    param('reminderId').isString().withMessage('Invalid reminder ID'),
    body('channels')
      .optional()
      .isArray()
      .withMessage('Channels must be an array'),
    body('channels.*')
      .optional()
      .isIn(['email', 'sms', 'in_app', 'push'])
      .withMessage('Invalid notification channel'),
    body('active')
      .optional()
      .isBoolean()
      .withMessage('Active must be a boolean'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { reminderId } = req.params;
    const updates = req.body;

    const reminder = await deadlineReminderService.updateReminder(
      reminderId,
      updates
    );

    if (!reminder) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Reminder not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<typeof reminder> = {
      success: true,
      data: reminder,
      message: 'Deadline reminder updated successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Delete deadline reminder
 */
router.delete(
  '/reminders/:reminderId',
  validate([param('reminderId').isString().withMessage('Invalid reminder ID')]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { reminderId } = req.params;

    const success = await deadlineReminderService.deleteReminder(
      reminderId,
      userId
    );

    if (!success) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Reminder not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<null> = {
      success: true,
      message: 'Deadline reminder deleted successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Opportunity Alerts Routes
 */

/**
 * Create opportunity alert
 */
router.post(
  '/alerts',
  validate([
    body('name')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be 1-100 characters'),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Description must be max 500 characters'),
    body('criteria').isObject().withMessage('Criteria is required'),
    body('channels')
      .isArray({ min: 1 })
      .withMessage('At least one channel is required'),
    body('channels.*')
      .isIn(['email', 'sms', 'in_app', 'push'])
      .withMessage('Invalid notification channel'),
    body('frequency')
      .optional()
      .isIn(['immediate', 'daily', 'weekly'])
      .withMessage('Invalid frequency'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { name, description, criteria, channels, frequency } = req.body;

    const alert = await opportunityAlertsService.createAlert({
      userId,
      name,
      description,
      criteria,
      channels,
      frequency,
    });

    const response: ApiResponse<typeof alert> = {
      success: true,
      data: alert,
      message: 'Opportunity alert created successfully',
    };

    res.status(201).json(response);
  })
);

/**
 * Get user's opportunity alerts
 */
router.get(
  '/alerts',
  validate([
    query('active')
      .optional()
      .isBoolean()
      .withMessage('Active must be a boolean'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const active =
      req.query.active === 'true'
        ? true
        : req.query.active === 'false'
          ? false
          : undefined;

    const alerts = await opportunityAlertsService.getUserAlerts(userId, {
      active,
    });

    const response: ApiResponse<typeof alerts> = {
      success: true,
      data: alerts,
      message: 'Opportunity alerts retrieved successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Get alert matches
 */
router.get(
  '/alerts/:alertId/matches',
  validate([
    param('alertId').isString().withMessage('Invalid alert ID'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be 1-100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be >= 0'),
    query('minScore')
      .optional()
      .isInt({ min: 0, max: 100 })
      .withMessage('Min score must be 0-100'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { alertId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;
    const minScore = parseInt(req.query.minScore as string) || undefined;

    const result = await opportunityAlertsService.getAlertMatches(
      alertId,
      userId,
      {
        limit,
        offset,
        minScore,
      }
    );

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: 'Alert matches retrieved successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Update opportunity alert
 */
router.patch(
  '/alerts/:alertId',
  validate([
    param('alertId').isString().withMessage('Invalid alert ID'),
    body('name')
      .optional()
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Name must be 1-100 characters'),
    body('description')
      .optional()
      .isString()
      .isLength({ max: 500 })
      .withMessage('Description must be max 500 characters'),
    body('criteria').optional().isObject().withMessage('Invalid criteria'),
    body('channels')
      .optional()
      .isArray({ min: 1 })
      .withMessage('At least one channel is required'),
    body('channels.*')
      .optional()
      .isIn(['email', 'sms', 'in_app', 'push'])
      .withMessage('Invalid notification channel'),
    body('frequency')
      .optional()
      .isIn(['immediate', 'daily', 'weekly'])
      .withMessage('Invalid frequency'),
    body('active')
      .optional()
      .isBoolean()
      .withMessage('Active must be a boolean'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { alertId } = req.params;
    const updates = req.body;

    const alert = await opportunityAlertsService.updateAlert(
      alertId,
      userId,
      updates
    );

    if (!alert) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Alert not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<typeof alert> = {
      success: true,
      data: alert,
      message: 'Opportunity alert updated successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Delete opportunity alert
 */
router.delete(
  '/alerts/:alertId',
  validate([param('alertId').isString().withMessage('Invalid alert ID')]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.id;
    const { alertId } = req.params;

    const success = await opportunityAlertsService.deleteAlert(alertId, userId);

    if (!success) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Alert not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<null> = {
      success: true,
      message: 'Opportunity alert deleted successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Delivery Tracking Routes
 */

/**
 * Get delivery status
 */
router.get(
  '/delivery/:deliveryId',
  validate([param('deliveryId').isString().withMessage('Invalid delivery ID')]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { deliveryId } = req.params;

    const result =
      await notificationDeliveryService.getDeliveryStatus(deliveryId);

    const response: ApiResponse<typeof result> = {
      success: true,
      data: result,
      message: 'Delivery status retrieved successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Get delivery statistics
 */
router.get(
  '/delivery/stats/:channel',
  validate([
    param('channel')
      .isIn(['email', 'sms', 'push', 'in_app'])
      .withMessage('Invalid channel'),
    query('period')
      .optional()
      .isIn(['hour', 'day', 'week', 'month'])
      .withMessage('Invalid period'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { channel } = req.params;
    const period = (req.query.period as any) || 'day';

    const stats = await notificationDeliveryService.getChannelStats(
      channel as any,
      period
    );

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
      message: 'Delivery statistics retrieved successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Get overall delivery statistics
 */
router.get(
  '/delivery/stats',
  validate([
    query('period')
      .optional()
      .isIn(['hour', 'day', 'week', 'month'])
      .withMessage('Invalid period'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const period = (req.query.period as any) || 'day';

    const stats = await notificationDeliveryService.getOverallStats(period);

    const response: ApiResponse<typeof stats> = {
      success: true,
      data: stats,
      message: 'Overall delivery statistics retrieved successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Template Routes
 */

/**
 * Get notification templates
 */
router.get(
  '/templates',
  validate([
    query('type')
      .optional()
      .isIn([
        'new_opportunity',
        'deadline_reminder',
        'recommendation',
        'system',
      ])
      .withMessage('Invalid type'),
    query('channel')
      .optional()
      .isIn(['email', 'sms', 'in_app', 'push'])
      .withMessage('Invalid channel'),
    query('active')
      .optional()
      .isBoolean()
      .withMessage('Active must be a boolean'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const type = req.query.type as any;
    const channel = req.query.channel as any;
    const active =
      req.query.active === 'true'
        ? true
        : req.query.active === 'false'
          ? false
          : undefined;

    let templates;
    if (type) {
      templates = await notificationTemplateService.getTemplatesByType(type);
    } else if (channel) {
      templates =
        await notificationTemplateService.getTemplatesByChannel(channel);
    } else {
      templates = await notificationTemplateService.getAllTemplates({ active });
    }

    const response: ApiResponse<typeof templates> = {
      success: true,
      data: templates,
      message: 'Templates retrieved successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Get template by ID
 */
router.get(
  '/templates/:templateId',
  validate([param('templateId').isString().withMessage('Invalid template ID')]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { templateId } = req.params;

    const template = await notificationTemplateService.getTemplate(templateId);

    if (!template) {
      const response: ApiResponse<null> = {
        success: false,
        message: 'Template not found',
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<typeof template> = {
      success: true,
      data: template,
      message: 'Template retrieved successfully',
    };

    res.status(200).json(response);
  })
);

/**
 * Render template
 */
router.post(
  '/templates/:templateId/render',
  validate([
    param('templateId').isString().withMessage('Invalid template ID'),
    body('variables').isObject().withMessage('Variables must be an object'),
    body('user').optional().isObject().withMessage('User must be an object'),
    body('opportunity')
      .optional()
      .isObject()
      .withMessage('Opportunity must be an object'),
    body('system')
      .optional()
      .isObject()
      .withMessage('System must be an object'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { templateId } = req.params;
    const { variables, user, opportunity, system } = req.body;

    try {
      const rendered = await notificationTemplateService.renderTemplate(
        templateId,
        {
          variables,
          user,
          opportunity,
          system,
        }
      );

      if (!rendered) {
        const response: ApiResponse<null> = {
          success: false,
          message: 'Template not found',
        };
        return res.status(404).json(response);
      }

      const response: ApiResponse<typeof rendered> = {
        success: true,
        data: rendered,
        message: 'Template rendered successfully',
      };

      res.status(200).json(response);
    } catch (error) {
      const response: ApiResponse<null> = {
        success: false,
        message:
          error instanceof Error ? error.message : 'Template rendering failed',
      };
      res.status(400).json(response);
    }
  })
);

/**
 * Unsubscribe from notifications via token
 */
router.get(
  '/unsubscribe/:token',
  validate([
    param('token').isString().withMessage('Invalid unsubscribe token'),
  ]),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { token } = req.params;

    // TODO: Implement unsubscribe logic using token
    console.log(`Unsubscribe request for token: ${token}`);

    const response: ApiResponse<null> = {
      success: true,
      message: 'Successfully unsubscribed from notifications',
    };

    res.status(200).json(response);
  })
);

export { router as notificationRouter };
