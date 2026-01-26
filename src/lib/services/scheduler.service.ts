import { dataQualityService } from './data-quality.service';
import { externalAPIService } from './external-api.service';
import { scrapingService } from './scraping.service';
import { searchService } from './search.service';

export interface ScheduledTask {
  id: string;
  name: string;
  schedule: string; // cron expression
  lastRun?: Date;
  nextRun: Date;
  isActive: boolean;
  handler: () => Promise<void>;
}

export class SchedulerService {
  private tasks: Map<string, ScheduledTask> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.initializeDefaultTasks();
  }

  /**
   * Initialize default scheduled tasks
   */
  private initializeDefaultTasks(): void {
    // Regular scraping (every 6 hours)
    this.addTask({
      id: 'regular_scraping',
      name: 'Regular Scraping',
      schedule: '0 */6 * * *', // Every 6 hours
      nextRun: this.calculateNextRun('0 */6 * * *'),
      isActive: true,
      handler: async () => {
        console.log('🕷️ Starting regular scraping...');
        await scrapingService.scheduleRegularScraping();
      },
    });

    // Data quality cleanup (daily at 2 AM)
    this.addTask({
      id: 'data_cleanup',
      name: 'Data Quality Cleanup',
      schedule: '0 2 * * *', // Daily at 2 AM
      nextRun: this.calculateNextRun('0 2 * * *'),
      isActive: true,
      handler: async () => {
        console.log('🧹 Starting data cleanup...');
        await dataQualityService.cleanupExpiredOpportunities();
      },
    });

    // External API sync (every 4 hours)
    this.addTask({
      id: 'external_api_sync',
      name: 'External API Sync',
      schedule: '0 */4 * * *', // Every 4 hours
      nextRun: this.calculateNextRun('0 */4 * * *'),
      isActive: true,
      handler: async () => {
        console.log('🔄 Starting external API sync...');
        await externalAPIService.executeScheduledSync();
      },
    });

    // API health monitoring (every 5 minutes)
    this.addTask({
      id: 'api_health_monitoring',
      name: 'API Health Monitoring',
      schedule: '*/5 * * * *', // Every 5 minutes
      nextRun: this.calculateNextRun('*/5 * * * *'),
      isActive: true,
      handler: async () => {
        console.log('🏥 Monitoring API health...');
        await externalAPIService.monitorAPIHealth();
      },
    });

    // Search index sync (every 2 hours)
    this.addTask({
      id: 'search_index_sync',
      name: 'Search Index Sync',
      schedule: '0 */2 * * *', // Every 2 hours
      nextRun: this.calculateNextRun('0 */2 * * *'),
      isActive: true,
      handler: async () => {
        console.log('🔍 Syncing search index...');
        await searchService.syncOpportunities();
      },
    });
  }

  /**
   * Add a scheduled task
   */
  addTask(task: ScheduledTask): void {
    this.tasks.set(task.id, task);

    if (task.isActive) {
      this.scheduleTask(task);
    }
  }

  /**
   * Remove a scheduled task
   */
  removeTask(taskId: string): boolean {
    const interval = this.intervals.get(taskId);
    if (interval) {
      clearTimeout(interval);
      this.intervals.delete(taskId);
    }

    return this.tasks.delete(taskId);
  }

  /**
   * Start the scheduler
   */
  start(): void {
    console.log('📅 Starting scheduler service...');

    for (const task of this.tasks.values()) {
      if (task.isActive) {
        this.scheduleTask(task);
      }
    }

    console.log(`📅 Scheduler started with ${this.tasks.size} tasks`);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    console.log('📅 Stopping scheduler service...');

    for (const interval of this.intervals.values()) {
      clearTimeout(interval);
    }

    this.intervals.clear();
    console.log('📅 Scheduler stopped');
  }

  /**
   * Schedule a specific task
   */
  private scheduleTask(task: ScheduledTask): void {
    const now = new Date();
    const delay = task.nextRun.getTime() - now.getTime();

    if (delay <= 0) {
      // Task should run immediately
      this.executeTask(task);
    } else {
      // Schedule task for future execution
      const timeout = setTimeout(() => {
        this.executeTask(task);
      }, delay);

      this.intervals.set(task.id, timeout);
    }
  }

  /**
   * Execute a task
   */
  private async executeTask(task: ScheduledTask): Promise<void> {
    try {
      console.log(`⏰ Executing task: ${task.name}`);

      task.lastRun = new Date();
      await task.handler();

      console.log(`✅ Task completed: ${task.name}`);
    } catch (error) {
      console.error(`❌ Task failed: ${task.name}`, error);
    } finally {
      // Schedule next run
      task.nextRun = this.calculateNextRun(task.schedule);
      this.scheduleTask(task);
    }
  }

  /**
   * Calculate next run time based on cron expression
   * This is a simplified implementation - in production, use a proper cron library
   */
  private calculateNextRun(cronExpression: string): Date {
    const now = new Date();

    // Simple cron parsing for common patterns
    switch (cronExpression) {
      case '*/5 * * * *': // Every 5 minutes
        return new Date(now.getTime() + 5 * 60 * 1000);
      case '0 */2 * * *': // Every 2 hours
        return new Date(now.getTime() + 2 * 60 * 60 * 1000);
      case '0 */4 * * *': // Every 4 hours
        return new Date(now.getTime() + 4 * 60 * 60 * 1000);
      case '0 */6 * * *': // Every 6 hours
        return new Date(now.getTime() + 6 * 60 * 60 * 1000);
      case '0 2 * * *': // Daily at 2 AM
        const tomorrow2AM = new Date(now);
        tomorrow2AM.setDate(tomorrow2AM.getDate() + 1);
        tomorrow2AM.setHours(2, 0, 0, 0);
        return tomorrow2AM;
      default:
        // Default to 1 hour
        return new Date(now.getTime() + 60 * 60 * 1000);
    }
  }

  /**
   * Get all tasks
   */
  getTasks(): ScheduledTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * Get task by ID
   */
  getTask(taskId: string): ScheduledTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * Enable/disable a task
   */
  toggleTask(taskId: string, isActive: boolean): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.isActive = isActive;

    if (isActive) {
      this.scheduleTask(task);
    } else {
      const interval = this.intervals.get(taskId);
      if (interval) {
        clearTimeout(interval);
        this.intervals.delete(taskId);
      }
    }

    return true;
  }

  /**
   * Run a task immediately
   */
  async runTaskNow(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    await this.executeTask(task);
    return true;
  }

  /**
   * Get scheduler status
   */
  getStatus(): {
    isRunning: boolean;
    totalTasks: number;
    activeTasks: number;
    nextTask?: { name: string; nextRun: Date };
  } {
    const activeTasks = Array.from(this.tasks.values()).filter(
      task => task.isActive
    );
    const nextTask = activeTasks.sort(
      (a, b) => a.nextRun.getTime() - b.nextRun.getTime()
    )[0];

    return {
      isRunning: this.intervals.size > 0,
      totalTasks: this.tasks.size,
      activeTasks: activeTasks.length,
      nextTask: nextTask
        ? {
            name: nextTask.name,
            nextRun: nextTask.nextRun,
          }
        : undefined,
    };
  }

  /**
   * Update task schedule
   */
  updateTaskSchedule(taskId: string, newSchedule: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task) return false;

    task.schedule = newSchedule;
    task.nextRun = this.calculateNextRun(newSchedule);

    // Reschedule if active
    if (task.isActive) {
      const interval = this.intervals.get(taskId);
      if (interval) {
        clearTimeout(interval);
      }
      this.scheduleTask(task);
    }

    return true;
  }

  /**
   * Get task execution history (simplified)
   */
  getTaskHistory(taskId: string): {
    taskId: string;
    name: string;
    lastRun?: Date;
    nextRun: Date;
    isActive: boolean;
  } | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    return {
      taskId: task.id,
      name: task.name,
      lastRun: task.lastRun,
      nextRun: task.nextRun,
      isActive: task.isActive,
    };
  }
}

// Create singleton instance
export const schedulerService = new SchedulerService();

// Auto-start scheduler when module is loaded
if (process.env.NODE_ENV !== 'test') {
  schedulerService.start();

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('📅 Received SIGTERM, stopping scheduler...');
    schedulerService.stop();
  });

  process.on('SIGINT', () => {
    console.log('📅 Received SIGINT, stopping scheduler...');
    schedulerService.stop();
  });
}
