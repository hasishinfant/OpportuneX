import { PrismaClient } from '@prisma/client';
import type { Request } from 'express';

/**
 * Audit logging system for data access and security events
 */
export class AuditLogger {
  private static prisma = new PrismaClient();

  /**
   * Audit event types
   */
  static readonly EVENT_TYPES = {
    // Authentication events
    LOGIN_SUCCESS: 'login_success',
    LOGIN_FAILURE: 'login_failure',
    LOGOUT: 'logout',
    PASSWORD_CHANGE: 'password_change',
    PASSWORD_RESET: 'password_reset',

    // Data access events
    DATA_READ: 'data_read',
    DATA_CREATE: 'data_create',
    DATA_UPDATE: 'data_update',
    DATA_DELETE: 'data_delete',
    DATA_EXPORT: 'data_export',

    // Privacy events
    CONSENT_GIVEN: 'consent_given',
    CONSENT_WITHDRAWN: 'consent_withdrawn',
    DATA_DELETION_REQUEST: 'data_deletion_request',
    DATA_ANONYMIZATION: 'data_anonymization',

    // Security events
    UNAUTHORIZED_ACCESS: 'unauthorized_access',
    RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
    SUSPICIOUS_ACTIVITY: 'suspicious_activity',
    SECURITY_VIOLATION: 'security_violation',

    // System events
    SYSTEM_ERROR: 'system_error',
    CONFIGURATION_CHANGE: 'configuration_change',
    BACKUP_CREATED: 'backup_created',
    MAINTENANCE_MODE: 'maintenance_mode',
  } as const;

  /**
   * Risk levels for audit events
   */
  static readonly RISK_LEVELS = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical',
  } as const;

  /**
   * Log audit event
   */
  static async logEvent(eventData: {
    eventType: string;
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    resource?: string;
    action?: string;
    details?: any;
    riskLevel?: string;
    success?: boolean;
    errorMessage?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          eventType: eventData.eventType,
          userId: eventData.userId,
          sessionId: eventData.sessionId,
          ipAddress: eventData.ipAddress,
          userAgent: eventData.userAgent,
          resource: eventData.resource,
          action: eventData.action,
          details: eventData.details,
          riskLevel: eventData.riskLevel || this.RISK_LEVELS.LOW,
          success: eventData.success ?? true,
          errorMessage: eventData.errorMessage,
          metadata: eventData.metadata,
          timestamp: new Date(),
        },
      });

      // Log to console for immediate visibility (in development)
      if (process.env.NODE_ENV === 'development') {
        console.log('Audit Event:', {
          eventType: eventData.eventType,
          userId: eventData.userId,
          resource: eventData.resource,
          action: eventData.action,
          riskLevel: eventData.riskLevel,
          success: eventData.success,
        });
      }

      // Alert on high-risk events
      if (
        eventData.riskLevel === this.RISK_LEVELS.HIGH ||
        eventData.riskLevel === this.RISK_LEVELS.CRITICAL
      ) {
        await this.alertSecurityTeam(eventData);
      }
    } catch (error) {
      console.error('Failed to log audit event:', error);
      // Don't throw error to avoid breaking the main application flow
    }
  }

  /**
   * Log data access event
   */
  static async logDataAccess(
    userId: string,
    resource: string,
    action: 'read' | 'create' | 'update' | 'delete',
    details?: any,
    req?: Request
  ): Promise<void> {
    await this.logEvent({
      eventType: `data_${action}`,
      userId,
      sessionId: req?.sessionID,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      resource,
      action,
      details,
      riskLevel:
        action === 'delete' ? this.RISK_LEVELS.HIGH : this.RISK_LEVELS.LOW,
      success: true,
    });
  }

  /**
   * Log authentication event
   */
  static async logAuthentication(
    eventType: string,
    userId?: string,
    success = true,
    errorMessage?: string,
    req?: Request
  ): Promise<void> {
    await this.logEvent({
      eventType,
      userId,
      sessionId: req?.sessionID,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      resource: 'authentication',
      action: eventType,
      success,
      errorMessage,
      riskLevel: success ? this.RISK_LEVELS.LOW : this.RISK_LEVELS.MEDIUM,
    });
  }

  /**
   * Log privacy event
   */
  static async logPrivacyEvent(
    eventType: string,
    userId: string,
    details: any,
    req?: Request
  ): Promise<void> {
    await this.logEvent({
      eventType,
      userId,
      sessionId: req?.sessionID,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      resource: 'privacy',
      action: eventType,
      details,
      riskLevel: this.RISK_LEVELS.MEDIUM,
      success: true,
    });
  }

  /**
   * Log security violation
   */
  static async logSecurityViolation(
    violationType: string,
    details: any,
    req?: Request,
    userId?: string
  ): Promise<void> {
    await this.logEvent({
      eventType: this.EVENT_TYPES.SECURITY_VIOLATION,
      userId,
      sessionId: req?.sessionID,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      resource: 'security',
      action: violationType,
      details: {
        violationType,
        ...details,
      },
      riskLevel: this.RISK_LEVELS.HIGH,
      success: false,
    });
  }

  /**
   * Log system error
   */
  static async logSystemError(
    error: Error,
    context: string,
    req?: Request,
    userId?: string
  ): Promise<void> {
    await this.logEvent({
      eventType: this.EVENT_TYPES.SYSTEM_ERROR,
      userId,
      sessionId: req?.sessionID,
      ipAddress: req?.ip,
      userAgent: req?.get('User-Agent'),
      resource: 'system',
      action: 'error',
      details: {
        context,
        errorName: error.name,
        errorMessage: error.message,
        stackTrace: error.stack,
      },
      riskLevel: this.RISK_LEVELS.MEDIUM,
      success: false,
      errorMessage: error.message,
    });
  }

  /**
   * Get audit logs for a user
   */
  static async getUserAuditLogs(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      eventTypes?: string[];
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<any[]> {
    const { limit = 100, offset = 0, eventTypes, startDate, endDate } = options;

    try {
      const whereClause: any = { userId };

      if (eventTypes && eventTypes.length > 0) {
        whereClause.eventType = { in: eventTypes };
      }

      if (startDate || endDate) {
        whereClause.timestamp = {};
        if (startDate) whereClause.timestamp.gte = startDate;
        if (endDate) whereClause.timestamp.lte = endDate;
      }

      return await this.prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          eventType: true,
          resource: true,
          action: true,
          riskLevel: true,
          success: true,
          timestamp: true,
          ipAddress: true,
          details: true,
        },
      });
    } catch (error) {
      console.error('Error retrieving user audit logs:', error);
      return [];
    }
  }

  /**
   * Get security events
   */
  static async getSecurityEvents(
    options: {
      limit?: number;
      offset?: number;
      riskLevel?: string;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<any[]> {
    const { limit = 100, offset = 0, riskLevel, startDate, endDate } = options;

    try {
      const whereClause: any = {
        eventType: {
          in: [
            this.EVENT_TYPES.UNAUTHORIZED_ACCESS,
            this.EVENT_TYPES.RATE_LIMIT_EXCEEDED,
            this.EVENT_TYPES.SUSPICIOUS_ACTIVITY,
            this.EVENT_TYPES.SECURITY_VIOLATION,
            this.EVENT_TYPES.LOGIN_FAILURE,
          ],
        },
      };

      if (riskLevel) {
        whereClause.riskLevel = riskLevel;
      }

      if (startDate || endDate) {
        whereClause.timestamp = {};
        if (startDate) whereClause.timestamp.gte = startDate;
        if (endDate) whereClause.timestamp.lte = endDate;
      }

      return await this.prisma.auditLog.findMany({
        where: whereClause,
        orderBy: { timestamp: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          eventType: true,
          userId: true,
          ipAddress: true,
          userAgent: true,
          resource: true,
          action: true,
          riskLevel: true,
          success: true,
          timestamp: true,
          details: true,
          errorMessage: true,
        },
      });
    } catch (error) {
      console.error('Error retrieving security events:', error);
      return [];
    }
  }

  /**
   * Generate audit report
   */
  static async generateAuditReport(
    startDate: Date,
    endDate: Date
  ): Promise<{
    success: boolean;
    report?: any;
    error?: string;
  }> {
    try {
      const whereClause = {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      };

      // Get event counts by type
      const eventCounts = await this.prisma.auditLog.groupBy({
        by: ['eventType'],
        where: whereClause,
        _count: {
          id: true,
        },
      });

      // Get risk level distribution
      const riskDistribution = await this.prisma.auditLog.groupBy({
        by: ['riskLevel'],
        where: whereClause,
        _count: {
          id: true,
        },
      });

      // Get top users by activity
      const topUsers = await this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          ...whereClause,
          userId: { not: null },
        },
        _count: {
          id: true,
        },
        orderBy: {
          _count: {
            id: 'desc',
          },
        },
        take: 10,
      });

      // Get failed events
      const failedEvents = await this.prisma.auditLog.count({
        where: {
          ...whereClause,
          success: false,
        },
      });

      // Get security violations
      const securityViolations = await this.prisma.auditLog.count({
        where: {
          ...whereClause,
          eventType: this.EVENT_TYPES.SECURITY_VIOLATION,
        },
      });

      const report = {
        reportPeriod: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
        summary: {
          totalEvents: eventCounts.reduce(
            (sum, item) => sum + item._count.id,
            0
          ),
          failedEvents,
          securityViolations,
        },
        eventDistribution: eventCounts.map(item => ({
          eventType: item.eventType,
          count: item._count.id,
        })),
        riskDistribution: riskDistribution.map(item => ({
          riskLevel: item.riskLevel,
          count: item._count.id,
        })),
        topUsers: topUsers.map(item => ({
          userId: item.userId,
          eventCount: item._count.id,
        })),
        generatedAt: new Date().toISOString(),
      };

      return {
        success: true,
        report,
      };
    } catch (error) {
      console.error('Error generating audit report:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Report generation failed',
      };
    }
  }

  /**
   * Clean up old audit logs based on retention policy
   */
  static async cleanupOldLogs(retentionDays = 2555): Promise<{
    // 7 years default
    success: boolean;
    deletedCount?: number;
    error?: string;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const result = await this.prisma.auditLog.deleteMany({
        where: {
          timestamp: {
            lt: cutoffDate,
          },
          // Keep high-risk events longer
          riskLevel: {
            not: this.RISK_LEVELS.CRITICAL,
          },
        },
      });

      console.log(`Cleaned up ${result.count} old audit logs`);

      return {
        success: true,
        deletedCount: result.count,
      };
    } catch (error) {
      console.error('Error cleaning up audit logs:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cleanup failed',
      };
    }
  }

  /**
   * Alert security team for high-risk events
   */
  private static async alertSecurityTeam(eventData: any): Promise<void> {
    try {
      // In a real implementation, this would send alerts via email, Slack, etc.
      console.warn('SECURITY ALERT:', {
        eventType: eventData.eventType,
        userId: eventData.userId,
        ipAddress: eventData.ipAddress,
        riskLevel: eventData.riskLevel,
        timestamp: new Date().toISOString(),
        details: eventData.details,
      });

      // Could integrate with alerting services like:
      // - Email notifications
      // - Slack webhooks
      // - PagerDuty
      // - Security Information and Event Management (SIEM) systems
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }

  /**
   * Middleware to automatically log API requests
   */
  static auditMiddleware = (req: any, res: any, next: any) => {
    const startTime = Date.now();

    // Log request
    const originalEnd = res.end;
    res.end = function (chunk: any, encoding: any) {
      const duration = Date.now() - startTime;
      const { statusCode } = res;

      // Determine if this should be logged
      const shouldLog =
        req.method !== 'GET' || // Log all non-GET requests
        statusCode >= 400 || // Log all errors
        req.path.includes('/admin') || // Log admin access
        req.path.includes('/api/user') || // Log user data access
        req.path.includes('/api/privacy'); // Log privacy-related requests

      if (shouldLog) {
        AuditLogger.logEvent({
          eventType: statusCode >= 400 ? 'api_error' : 'api_request',
          userId: req.user?.id,
          sessionId: req.sessionID,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          resource: req.path,
          action: req.method,
          details: {
            statusCode,
            duration,
            query: req.query,
            // Don't log sensitive body data
            bodySize: req.body ? JSON.stringify(req.body).length : 0,
          },
          riskLevel:
            statusCode >= 500
              ? AuditLogger.RISK_LEVELS.HIGH
              : statusCode >= 400
                ? AuditLogger.RISK_LEVELS.MEDIUM
                : AuditLogger.RISK_LEVELS.LOW,
          success: statusCode < 400,
          errorMessage: statusCode >= 400 ? `HTTP ${statusCode}` : undefined,
        });
      }

      originalEnd.call(this, chunk, encoding);
    };

    next();
  };
}
