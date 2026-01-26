import { z } from 'zod';
import { notificationService } from './notification.service';

// Deadline reminder interfaces
export interface DeadlineReminder {
  id: string;
  userId: string;
  opportunityId: string;
  opportunityTitle: string;
  opportunityType: 'hackathon' | 'internship' | 'workshop';
  deadline: Date;
  reminderTimes: Date[];
  channels: ('email' | 'sms' | 'in_app' | 'push')[];
  sent: boolean[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderSchedule {
  id: string;
  name: string;
  description: string;
  intervals: Array<{
    value: number;
    unit: 'minutes' | 'hours' | 'days' | 'weeks';
    label: string;
  }>;
  active: boolean;
}

// Validation schemas
const deadlineReminderSchema = z.object({
  userId: z.string().min(1),
  opportunityId: z.string().min(1),
  opportunityTitle: z.string().min(1),
  opportunityType: z.enum(['hackathon', 'internship', 'workshop']),
  deadline: z.date(),
  reminderIntervals: z.array(z.object({
    value: z.number().positive(),
    unit: z.enum(['minutes', 'hours', 'days', 'weeks']),
  })).optional(),
  channels: z.array(z.enum(['email', 'sms', 'in_app', 'push'])).min(1),
});

// Deadline reminder service
export class DeadlineReminderService {
  private reminders: Map<string, DeadlineReminder> = new Map();
  private schedules: Map<string, ReminderSchedule> = new Map();
  private intervalId?: NodeJS.Timeout;

  constructor() {
    this.initializeDefaultSchedules();
    this.startReminderProcessor();
  }

  // Initialize default reminder schedules
  private initializeDefaultSchedules(): void {
    const defaultSchedules: Omit<ReminderSchedule, 'id'>[] = [
      {
        name: 'Standard Reminders',
        description: 'Standard reminder schedule for most opportunities',
        intervals: [
          { value: 7, unit: 'days', label: '1 week before' },
          { value: 3, unit: 'days', label: '3 days before' },
          { value: 1, unit: 'days', label: '1 day before' },
          { value: 6, unit: 'hours', label: '6 hours before' },
        ],
        active: true,
      },
      {
        name: 'Urgent Reminders',
        description: 'More frequent reminders for high-priority opportunities',
        intervals: [
          { value: 2, unit: 'weeks', label: '2 weeks before' },
          { value: 1, unit: 'weeks', label: '1 week before' },
          { value: 3, unit: 'days', label: '3 days before' },
          { value: 1, unit: 'days', label: '1 day before' },
          { value: 6, unit: 'hours', label: '6 hours before' },
          { value: 2, unit: 'hours', label: '2 hours before' },
        ],
        active: true,
      },
      {
        name: 'Minimal Reminders',
        description: 'Fewer reminders for users who prefer less notifications',
        intervals: [
          { value: 3, unit: 'days', label: '3 days before' },
          { value: 1, unit: 'days', label: '1 day before' },
        ],
        active: true,
      },
    ];

    defaultSchedules.forEach((schedule, index) => {
      const id = `schedule-${index + 1}`;
      this.schedules.set(id, { ...schedule, id });
    });
  }

  // Create deadline reminder
  async createReminder(params: {
    userId: string;
    opportunityId: string;
    opportunityTitle: string;
    opportunityType: 'hackathon' | 'internship' | 'workshop';
    deadline: Date;
    reminderIntervals?: Array<{
      value: number;
      unit: 'minutes' | 'hours' | 'days' | 'weeks';
    }>;
    channels?: ('email' | 'sms' | 'in_app' | 'push')[];
    scheduleId?: string;
  }): Promise<DeadlineReminder> {
    // Validate input
    const validatedParams = deadlineReminderSchema.parse({
      ...params,
      channels: params.channels || ['in_app', 'email'],
    });

    // Use provided intervals or default schedule
    let intervals = params.reminderIntervals;
    if (!intervals && params.scheduleId) {
      const schedule = this.schedules.get(params.scheduleId);
      if (schedule) {
        intervals = schedule.intervals;
      }
    }
    if (!intervals) {
      // Use standard schedule as default
      const standardSchedule = this.schedules.get('schedule-1');
      intervals = standardSchedule?.intervals || [
        { value: 1, unit: 'days', label: '1 day before' },
      ];
    }

    // Calculate reminder times
    const reminderTimes = intervals
      .map(interval => {
        const reminderTime = new Date(validatedParams.deadline);
        switch (interval.unit) {
          case 'minutes':
            reminderTime.setMinutes(reminderTime.getMinutes() - interval.value);
            break;
          case 'hours':
            reminderTime.setHours(reminderTime.getHours() - interval.value);
            break;
          case 'days':
            reminderTime.setDate(reminderTime.getDate() - interval.value);
            break;
          case 'weeks':
            reminderTime.setDate(reminderTime.getDate() - (interval.value * 7));
            break;
        }
        return reminderTime;
      })
      .filter(time => time > new Date()) // Only future reminders
      .sort((a, b) => a.getTime() - b.getTime()); // Sort chronologically

    const reminder: DeadlineReminder = {
      id: this.generateId(),
      userId: validatedParams.userId,
      opportunityId: validatedParams.opportunityId,
      opportunityTitle: validatedParams.opportunityTitle,
      opportunityType: validatedParams.opportunityType,
      deadline: validatedParams.deadline,
      reminderTimes,
      channels: validatedParams.channels,
      sent: new Array(reminderTimes.length).fill(false),
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.reminders.set(reminder.id, reminder);
    
    // TODO: Store in database
    console.log(`Created deadline reminder ${reminder.id} for opportunity ${params.opportunityId}`);
    
    return reminder;
  }

  // Get user's deadline reminders
  async getUserReminders(userId: string, options: {
    active?: boolean;
    opportunityId?: string;
    upcoming?: boolean;
  } = {}): Promise<DeadlineReminder[]> {
    let userReminders = Array.from(this.reminders.values())
      .filter(reminder => reminder.userId === userId);

    if (options.active !== undefined) {
      userReminders = userReminders.filter(reminder => reminder.active === options.active);
    }

    if (options.opportunityId) {
      userReminders = userReminders.filter(reminder => reminder.opportunityId === options.opportunityId);
    }

    if (options.upcoming) {
      const now = new Date();
      userReminders = userReminders.filter(reminder => reminder.deadline > now);
    }

    return userReminders.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
  }

  // Update reminder
  async updateReminder(reminderId: string, updates: {
    channels?: ('email' | 'sms' | 'in_app' | 'push')[];
    active?: boolean;
  }): Promise<DeadlineReminder | null> {
    const reminder = this.reminders.get(reminderId);
    if (!reminder) return null;

    if (updates.channels) {
      reminder.channels = updates.channels;
    }

    if (updates.active !== undefined) {
      reminder.active = updates.active;
    }

    reminder.updatedAt = new Date();
    this.reminders.set(reminderId, reminder);

    // TODO: Update in database
    console.log(`Updated reminder ${reminderId}`);

    return reminder;
  }

  // Delete reminder
  async deleteReminder(reminderId: string, userId: string): Promise<boolean> {
    const reminder = this.reminders.get(reminderId);
    if (!reminder || reminder.userId !== userId) {
      return false;
    }

    this.reminders.delete(reminderId);
    
    // TODO: Delete from database
    console.log(`Deleted reminder ${reminderId}`);
    
    return true;
  }

  // Process due reminders
  private async processReminders(): Promise<void> {
    const now = new Date();
    const dueReminders: Array<{ reminder: DeadlineReminder; reminderIndex: number }> = [];

    // Find due reminders
    for (const reminder of this.reminders.values()) {
      if (!reminder.active) continue;

      reminder.reminderTimes.forEach((reminderTime, index) => {
        if (!reminder.sent[index] && reminderTime <= now) {
          dueReminders.push({ reminder, reminderIndex: index });
        }
      });
    }

    // Send due reminders
    for (const { reminder, reminderIndex } of dueReminders) {
      try {
        await this.sendReminder(reminder, reminderIndex);
        reminder.sent[reminderIndex] = true;
        reminder.updatedAt = new Date();
        this.reminders.set(reminder.id, reminder);
      } catch (error) {
        console.error(`Failed to send reminder ${reminder.id}:`, error);
      }
    }

    // Clean up expired reminders
    await this.cleanupExpiredReminders();
  }

  // Send individual reminder
  private async sendReminder(reminder: DeadlineReminder, reminderIndex: number): Promise<void> {
    const reminderTime = reminder.reminderTimes[reminderIndex];
    const timeLeft = this.formatTimeLeft(reminder.deadline);
    
    // Create notification content
    const title = `Deadline Reminder: ${reminder.opportunityTitle}`;
    const message = `The deadline for "${reminder.opportunityTitle}" is ${timeLeft}. Don't miss out!`;
    
    // Send notification through notification service
    await notificationService.sendNotification({
      userId: reminder.userId,
      type: 'deadline_reminder',
      channels: reminder.channels,
      content: {
        title,
        message,
        data: {
          opportunityId: reminder.opportunityId,
          opportunityTitle: reminder.opportunityTitle,
          opportunityType: reminder.opportunityType,
          deadline: reminder.deadline.toISOString(),
          timeLeft,
          reminderIndex,
        },
      },
      priority: this.calculatePriority(reminder.deadline),
    });

    console.log(`Sent deadline reminder for ${reminder.opportunityTitle} to user ${reminder.userId}`);
  }

  // Calculate notification priority based on time left
  private calculatePriority(deadline: Date): 'low' | 'normal' | 'high' | 'urgent' {
    const now = new Date();
    const timeLeft = deadline.getTime() - now.getTime();
    const hoursLeft = timeLeft / (1000 * 60 * 60);

    if (hoursLeft <= 6) return 'urgent';
    if (hoursLeft <= 24) return 'high';
    if (hoursLeft <= 72) return 'normal';
    return 'low';
  }

  // Format time left until deadline
  private formatTimeLeft(deadline: Date): string {
    const now = new Date();
    const timeLeft = deadline.getTime() - now.getTime();

    if (timeLeft <= 0) return 'expired';

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return days === 1 ? '1 day' : `${days} days`;
    } else if (hours > 0) {
      return hours === 1 ? '1 hour' : `${hours} hours`;
    } else {
      return minutes === 1 ? '1 minute' : `${minutes} minutes`;
    }
  }

  // Clean up expired reminders
  private async cleanupExpiredReminders(): Promise<number> {
    const now = new Date();
    const expiredReminders: string[] = [];

    for (const [id, reminder] of this.reminders.entries()) {
      // Remove reminders for opportunities that are past deadline + 1 day
      const cleanupTime = new Date(reminder.deadline);
      cleanupTime.setDate(cleanupTime.getDate() + 1);

      if (now > cleanupTime) {
        expiredReminders.push(id);
      }
    }

    expiredReminders.forEach(id => {
      this.reminders.delete(id);
    });

    if (expiredReminders.length > 0) {
      // TODO: Delete from database
      console.log(`Cleaned up ${expiredReminders.length} expired deadline reminders`);
    }

    return expiredReminders.length;
  }

  // Start reminder processor
  private startReminderProcessor(): void {
    // Process reminders every 5 minutes
    this.intervalId = setInterval(() => {
      this.processReminders().catch(error => {
        console.error('Error processing deadline reminders:', error);
      });
    }, 5 * 60 * 1000);

    console.log('Deadline reminder processor started');
  }

  // Stop reminder processor
  stopReminderProcessor(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
      console.log('Deadline reminder processor stopped');
    }
  }

  // Get reminder schedules
  getReminderSchedules(): ReminderSchedule[] {
    return Array.from(this.schedules.values()).filter(schedule => schedule.active);
  }

  // Add custom reminder schedule
  addReminderSchedule(schedule: Omit<ReminderSchedule, 'id'>): ReminderSchedule {
    const id = this.generateId();
    const fullSchedule: ReminderSchedule = { ...schedule, id };
    this.schedules.set(id, fullSchedule);
    return fullSchedule;
  }

  // Get reminder statistics
  async getReminderStats(userId?: string): Promise<{
    totalReminders: number;
    activeReminders: number;
    upcomingReminders: number;
    sentReminders: number;
    byOpportunityType: Record<string, number>;
    byChannel: Record<string, number>;
  }> {
    let reminders = Array.from(this.reminders.values());
    
    if (userId) {
      reminders = reminders.filter(r => r.userId === userId);
    }

    const now = new Date();
    const activeReminders = reminders.filter(r => r.active);
    const upcomingReminders = reminders.filter(r => r.deadline > now && r.active);
    
    let sentCount = 0;
    reminders.forEach(r => {
      sentCount += r.sent.filter(Boolean).length;
    });

    const byOpportunityType: Record<string, number> = {};
    const byChannel: Record<string, number> = {};

    reminders.forEach(reminder => {
      byOpportunityType[reminder.opportunityType] = (byOpportunityType[reminder.opportunityType] || 0) + 1;
      
      reminder.channels.forEach(channel => {
        byChannel[channel] = (byChannel[channel] || 0) + 1;
      });
    });

    return {
      totalReminders: reminders.length,
      activeReminders: activeReminders.length,
      upcomingReminders: upcomingReminders.length,
      sentReminders: sentCount,
      byOpportunityType,
      byChannel,
    };
  }

  // Bulk create reminders for multiple opportunities
  async bulkCreateReminders(params: {
    userId: string;
    opportunities: Array<{
      id: string;
      title: string;
      type: 'hackathon' | 'internship' | 'workshop';
      deadline: Date;
    }>;
    scheduleId?: string;
    channels?: ('email' | 'sms' | 'in_app' | 'push')[];
  }): Promise<DeadlineReminder[]> {
    const reminders: DeadlineReminder[] = [];

    for (const opportunity of params.opportunities) {
      try {
        const reminder = await this.createReminder({
          userId: params.userId,
          opportunityId: opportunity.id,
          opportunityTitle: opportunity.title,
          opportunityType: opportunity.type,
          deadline: opportunity.deadline,
          scheduleId: params.scheduleId,
          channels: params.channels,
        });
        reminders.push(reminder);
      } catch (error) {
        console.error(`Failed to create reminder for opportunity ${opportunity.id}:`, error);
      }
    }

    return reminders;
  }

  // Generate unique ID
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// Export singleton instance
export const deadlineReminderService = new DeadlineReminderService();