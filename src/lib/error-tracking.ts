/**
 * Error Tracking and Alerting Service for OpportuneX
 * Provides comprehensive error tracking, alerting, and incident management
 */

import { EventEmitter } from 'events';
import { metricsCollector } from './metrics-collector';
import { logger } from './monitoring';

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Error categories
export enum ErrorCategory {
  DATABASE = 'database',
  CACHE = 'cache',
  SEARCH = 'search',
  EXTERNAL_API = 'external_api',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  BUSINESS_LOGIC = 'business_logic',
  SYSTEM = 'system',
  NETWORK = 'network',
  UNKNOWN = 'unknown',
}

// Error context interface
export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ipAddress?: string;
  url?: string;
  method?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

// Tracked error interface
export interface TrackedError {
  id: string;
  timestamp: Date;
  message: string;
  stack?: string;
  name: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  context: ErrorContext;
  fingerprint: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  resolved: boolean;
  tags: string[];
}

// Alert configuration
export interface AlertConfig {
  name: string;
  condition: (error: TrackedError) => boolean;
  severity: ErrorSeverity;
  channels: AlertChannel[];
  throttle: number; // Minutes between alerts for same error
  enabled: boolean;
}

// Alert channels
export enum AlertChannelType {
  EMAIL = 'email',
  SLACK = 'slack',
  WEBHOOK = 'webhook',
  SMS = 'sms',
}

export interface AlertChannel {
  type: AlertChannelType;
  config: Record<string, any>;
  enabled: boolean;
}

// Alert interface
export interface Alert {
  id: string;
  timestamp: Date;
  errorId: string;
  severity: ErrorSeverity;
  message: string;
  channels: AlertChannelType[];
  sent: boolean;
  error?: string;
}

class ErrorTracker extends EventEmitter {
  private errors: Map<string, TrackedError> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private alertConfigs: AlertConfig[] = [];
  private alertThrottles: Map<string, Date> = new Map();
  private maxErrors = 10000;

  constructor() {
    super();
    this.setupDefaultAlertConfigs();
  }

  /**
   * Track an error
   */
  trackError(
    error: Error,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    category: ErrorCategory = ErrorCategory.UNKNOWN,
    context: ErrorContext = {}
  ): string {
    const fingerprint = this.generateFingerprint(error, context);
    const errorId = fingerprint;
    const now = new Date();

    let trackedError = this.errors.get(errorId);
    
    if (trackedError) {
      // Update existing error
      trackedError.count++;
      trackedError.lastSeen = now;
      trackedError.context = { ...trackedError.context, ...context };
    } else {
      // Create new tracked error
      trackedError = {
        id: errorId,
        timestamp: now,
        message: error.message,
        stack: error.stack,
        name: error.name,
        severity,
        category,
        context,
        fingerprint,
        count: 1,
        firstSeen: now,
        lastSeen: now,
        resolved: false,
        tags: this.generateTags(error, context),
      };
      
      this.errors.set(errorId, trackedError);
    }

    // Limit stored errors
    if (this.errors.size > this.maxErrors) {
      const oldestError = Array.from(this.errors.values())
        .sort((a, b) => a.lastSeen.getTime() - b.lastSeen.getTime())[0];
      this.errors.delete(oldestError.id);
    }

    // Log the error
    logger.error('Error tracked', error, {
      errorId,
      severity,
      category,
      count: trackedError.count,
      ...context,
    });

    // Record metrics
    metricsCollector.recordError(error.name, context.component || 'unknown');

    // Emit event
    this.emit('error', trackedError);

    // Check alert conditions
    this.checkAlertConditions(trackedError);

    return errorId;
  }

  /**
   * Get tracked error by ID
   */
  getError(errorId: string): TrackedError | undefined {
    return this.errors.get(errorId);
  }

  /**
   * Get all tracked errors
   */
  getAllErrors(): TrackedError[] {
    return Array.from(this.errors.values());
  }

  /**
   * Get errors by category
   */
  getErrorsByCategory(category: ErrorCategory): TrackedError[] {
    return this.getAllErrors().filter(error => error.category === category);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(severity: ErrorSeverity): TrackedError[] {
    return this.getAllErrors().filter(error => error.severity === severity);
  }

  /**
   * Get unresolved errors
   */
  getUnresolvedErrors(): TrackedError[] {
    return this.getAllErrors().filter(error => !error.resolved);
  }

  /**
   * Mark error as resolved
   */
  resolveError(errorId: string): boolean {
    const error = this.errors.get(errorId);
    if (error) {
      error.resolved = true;
      this.emit('errorResolved', error);
      return true;
    }
    return false;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    unresolved: number;
    byCategory: Record<ErrorCategory, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recentErrors: number; // Last 24 hours
  } {
    const allErrors = this.getAllErrors();
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const byCategory = {} as Record<ErrorCategory, number>;
    const bySeverity = {} as Record<ErrorSeverity, number>;

    // Initialize counters
    Object.values(ErrorCategory).forEach(cat => byCategory[cat] = 0);
    Object.values(ErrorSeverity).forEach(sev => bySeverity[sev] = 0);

    let unresolved = 0;
    let recentErrors = 0;

    for (const error of allErrors) {
      byCategory[error.category]++;
      bySeverity[error.severity]++;
      
      if (!error.resolved) unresolved++;
      if (error.lastSeen >= oneDayAgo) recentErrors++;
    }

    return {
      total: allErrors.length,
      unresolved,
      byCategory,
      bySeverity,
      recentErrors,
    };
  }

  /**
   * Add alert configuration
   */
  addAlertConfig(config: AlertConfig) {
    this.alertConfigs.push(config);
  }

  /**
   * Remove alert configuration
   */
  removeAlertConfig(name: string): boolean {
    const index = this.alertConfigs.findIndex(config => config.name === name);
    if (index >= 0) {
      this.alertConfigs.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get all alert configurations
   */
  getAlertConfigs(): AlertConfig[] {
    return [...this.alertConfigs];
  }

  /**
   * Get all alerts
   */
  getAllAlerts(): Alert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Clear old errors
   */
  clearOldErrors(olderThanDays: number = 30) {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const toDelete: string[] = [];

    for (const [id, error] of this.errors) {
      if (error.lastSeen < cutoff && error.resolved) {
        toDelete.push(id);
      }
    }

    for (const id of toDelete) {
      this.errors.delete(id);
    }

    logger.info('Cleared old errors', { count: toDelete.length, olderThanDays });
  }

  /**
   * Generate error fingerprint for grouping
   */
  private generateFingerprint(error: Error, context: ErrorContext): string {
    const components = [
      error.name,
      error.message,
      context.component || '',
      context.action || '',
    ];

    // Use first few lines of stack trace for better grouping
    if (error.stack) {
      const stackLines = error.stack.split('\n').slice(0, 3);
      components.push(...stackLines);
    }

    const fingerprint = components.join('|');
    
    // Create a simple hash
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return `error_${Math.abs(hash).toString(36)}`;
  }

  /**
   * Generate tags for error
   */
  private generateTags(error: Error, context: ErrorContext): string[] {
    const tags: string[] = [];

    // Add error name as tag
    tags.push(`error:${error.name}`);

    // Add component tag
    if (context.component) {
      tags.push(`component:${context.component}`);
    }

    // Add action tag
    if (context.action) {
      tags.push(`action:${context.action}`);
    }

    // Add method tag
    if (context.method) {
      tags.push(`method:${context.method}`);
    }

    // Add environment tag
    tags.push(`env:${process.env.NODE_ENV || 'development'}`);

    return tags;
  }

  /**
   * Setup default alert configurations
   */
  private setupDefaultAlertConfigs() {
    // Critical errors alert
    this.addAlertConfig({
      name: 'critical_errors',
      condition: (error) => error.severity === ErrorSeverity.CRITICAL,
      severity: ErrorSeverity.CRITICAL,
      channels: [
        { type: AlertChannelType.EMAIL, config: {}, enabled: true },
        { type: AlertChannelType.SLACK, config: {}, enabled: true },
      ],
      throttle: 5, // 5 minutes
      enabled: true,
    });

    // High frequency errors alert
    this.addAlertConfig({
      name: 'high_frequency_errors',
      condition: (error) => error.count >= 10 && error.lastSeen.getTime() - error.firstSeen.getTime() < 300000, // 10 errors in 5 minutes
      severity: ErrorSeverity.HIGH,
      channels: [
        { type: AlertChannelType.EMAIL, config: {}, enabled: true },
      ],
      throttle: 15, // 15 minutes
      enabled: true,
    });

    // Database errors alert
    this.addAlertConfig({
      name: 'database_errors',
      condition: (error) => error.category === ErrorCategory.DATABASE && error.severity >= ErrorSeverity.MEDIUM,
      severity: ErrorSeverity.HIGH,
      channels: [
        { type: AlertChannelType.SLACK, config: {}, enabled: true },
      ],
      throttle: 10, // 10 minutes
      enabled: true,
    });
  }

  /**
   * Check alert conditions for an error
   */
  private checkAlertConditions(error: TrackedError) {
    for (const config of this.alertConfigs) {
      if (!config.enabled || !config.condition(error)) {
        continue;
      }

      // Check throttling
      const throttleKey = `${config.name}_${error.id}`;
      const lastAlert = this.alertThrottles.get(throttleKey);
      const now = new Date();
      
      if (lastAlert && now.getTime() - lastAlert.getTime() < config.throttle * 60 * 1000) {
        continue; // Still throttled
      }

      // Create and send alert
      this.createAlert(error, config);
      this.alertThrottles.set(throttleKey, now);
    }
  }

  /**
   * Create and send alert
   */
  private async createAlert(error: TrackedError, config: AlertConfig) {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: Alert = {
      id: alertId,
      timestamp: new Date(),
      errorId: error.id,
      severity: config.severity,
      message: this.formatAlertMessage(error, config),
      channels: config.channels.filter(c => c.enabled).map(c => c.type),
      sent: false,
    };

    this.alerts.set(alertId, alert);

    try {
      await this.sendAlert(alert, config);
      alert.sent = true;
      
      logger.info('Alert sent', {
        alertId,
        errorId: error.id,
        configName: config.name,
        channels: alert.channels,
      });
    } catch (err) {
      alert.error = err instanceof Error ? err.message : 'Failed to send alert';
      
      logger.error('Failed to send alert', err, {
        alertId,
        errorId: error.id,
        configName: config.name,
      });
    }

    this.emit('alert', alert);
  }

  /**
   * Send alert through configured channels
   */
  private async sendAlert(alert: Alert, config: AlertConfig) {
    const promises = config.channels
      .filter(channel => channel.enabled)
      .map(channel => this.sendAlertToChannel(alert, channel));

    await Promise.allSettled(promises);
  }

  /**
   * Send alert to specific channel
   */
  private async sendAlertToChannel(alert: Alert, channel: AlertChannel) {
    switch (channel.type) {
      case AlertChannelType.EMAIL:
        await this.sendEmailAlert(alert, channel.config);
        break;
      case AlertChannelType.SLACK:
        await this.sendSlackAlert(alert, channel.config);
        break;
      case AlertChannelType.WEBHOOK:
        await this.sendWebhookAlert(alert, channel.config);
        break;
      case AlertChannelType.SMS:
        await this.sendSMSAlert(alert, channel.config);
        break;
      default:
        throw new Error(`Unsupported alert channel: ${channel.type}`);
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: Alert, config: any) {
    // This would integrate with your email service (SendGrid, etc.)
    if (process.env.ALERT_EMAIL_ENDPOINT) {
      await fetch(process.env.ALERT_EMAIL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.ALERT_EMAIL_API_KEY}`,
        },
        body: JSON.stringify({
          to: config.recipients || process.env.ALERT_EMAIL_RECIPIENTS?.split(','),
          subject: `[OpportuneX Alert] ${alert.severity.toUpperCase()} - Error Detected`,
          body: alert.message,
          alert,
        }),
      });
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: Alert, config: any) {
    if (process.env.SLACK_WEBHOOK_URL) {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: `🚨 OpportuneX Alert - ${alert.severity.toUpperCase()}`,
          attachments: [
            {
              color: this.getSeverityColor(alert.severity),
              fields: [
                {
                  title: 'Error ID',
                  value: alert.errorId,
                  short: true,
                },
                {
                  title: 'Severity',
                  value: alert.severity.toUpperCase(),
                  short: true,
                },
                {
                  title: 'Message',
                  value: alert.message,
                  short: false,
                },
              ],
              ts: Math.floor(alert.timestamp.getTime() / 1000),
            },
          ],
        }),
      });
    }
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: Alert, config: any) {
    if (config.url) {
      await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.headers || {}),
        },
        body: JSON.stringify(alert),
      });
    }
  }

  /**
   * Send SMS alert
   */
  private async sendSMSAlert(alert: Alert, config: any) {
    // This would integrate with your SMS service (Twilio, etc.)
    if (process.env.SMS_ALERT_ENDPOINT) {
      await fetch(process.env.SMS_ALERT_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.SMS_ALERT_API_KEY}`,
        },
        body: JSON.stringify({
          to: config.phoneNumbers || process.env.ALERT_PHONE_NUMBERS?.split(','),
          message: `OpportuneX Alert: ${alert.severity.toUpperCase()} - ${alert.message.substring(0, 100)}...`,
        }),
      });
    }
  }

  /**
   * Format alert message
   */
  private formatAlertMessage(error: TrackedError, config: AlertConfig): string {
    return `
Alert: ${config.name}
Error: ${error.name} - ${error.message}
Severity: ${error.severity.toUpperCase()}
Category: ${error.category}
Count: ${error.count}
First Seen: ${error.firstSeen.toISOString()}
Last Seen: ${error.lastSeen.toISOString()}
Component: ${error.context.component || 'Unknown'}
Action: ${error.context.action || 'Unknown'}
User ID: ${error.context.userId || 'Anonymous'}
Request ID: ${error.context.requestId || 'Unknown'}

Stack Trace:
${error.stack || 'No stack trace available'}
    `.trim();
  }

  /**
   * Get severity color for Slack
   */
  private getSeverityColor(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
        return 'danger';
      case ErrorSeverity.HIGH:
        return 'warning';
      case ErrorSeverity.MEDIUM:
        return 'good';
      case ErrorSeverity.LOW:
        return '#36a64f';
      default:
        return 'good';
    }
  }
}

// Singleton instance
export const errorTracker = new ErrorTracker();

// Global error handlers
process.on('uncaughtException', (error) => {
  errorTracker.trackError(
    error,
    ErrorSeverity.CRITICAL,
    ErrorCategory.SYSTEM,
    { component: 'process', action: 'uncaughtException' }
  );
});

process.on('unhandledRejection', (reason, promise) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  errorTracker.trackError(
    error,
    ErrorSeverity.HIGH,
    ErrorCategory.SYSTEM,
    { component: 'process', action: 'unhandledRejection' }
  );
});

// Cleanup old errors daily
setInterval(() => {
  errorTracker.clearOldErrors(30); // Keep errors for 30 days
}, 24 * 60 * 60 * 1000); // Run daily

export default errorTracker;