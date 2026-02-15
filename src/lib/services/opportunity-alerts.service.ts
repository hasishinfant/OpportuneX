import { z } from 'zod';
import { notificationService } from './notification.service';

// Opportunity alert interfaces
export interface OpportunityAlert {
  id: string;
  userId: string;
  name: string;
  description?: string;
  criteria: AlertCriteria;
  channels: Array<'email' | 'sms' | 'in_app' | 'push'>;
  frequency: 'immediate' | 'daily' | 'weekly';
  active: boolean;
  lastTriggered?: Date;
  matchCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertCriteria {
  keywords?: string[];
  skills?: string[];
  opportunityTypes?: Array<'hackathon' | 'internship' | 'workshop'>;
  organizerTypes?: Array<'corporate' | 'startup' | 'government' | 'academic'>;
  modes?: Array<'online' | 'offline' | 'hybrid'>;
  locations?: string[];
  minStipend?: number;
  maxStipend?: number;
  deadlineRange?: {
    min: number; // days from now
    max: number; // days from now
  };
  excludeKeywords?: string[];
}

export interface OpportunityMatch {
  alertId: string;
  opportunityId: string;
  matchScore: number;
  matchedCriteria: string[];
  opportunity: {
    id: string;
    title: string;
    description: string;
    type: 'hackathon' | 'internship' | 'workshop';
    organizer: {
      name: string;
      type: 'corporate' | 'startup' | 'government' | 'academic';
    };
    deadline: Date;
    location?: string;
    mode: 'online' | 'offline' | 'hybrid';
    stipend?: string;
    skills: string[];
    url: string;
  };
  createdAt: Date;
}

// Validation schemas
const alertCriteriaSchema = z.object({
  keywords: z.array(z.string()).optional(),
  skills: z.array(z.string()).optional(),
  opportunityTypes: z
    .array(z.enum(['hackathon', 'internship', 'workshop']))
    .optional(),
  organizerTypes: z
    .array(z.enum(['corporate', 'startup', 'government', 'academic']))
    .optional(),
  modes: z.array(z.enum(['online', 'offline', 'hybrid'])).optional(),
  locations: z.array(z.string()).optional(),
  minStipend: z.number().min(0).optional(),
  maxStipend: z.number().min(0).optional(),
  deadlineRange: z
    .object({
      min: z.number().min(0),
      max: z.number().min(0),
    })
    .optional(),
  excludeKeywords: z.array(z.string()).optional(),
});

const opportunityAlertSchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  criteria: alertCriteriaSchema,
  channels: z.array(z.enum(['email', 'sms', 'in_app', 'push'])).min(1),
  frequency: z.enum(['immediate', 'daily', 'weekly']).default('immediate'),
});

// Opportunity alerts service
export class OpportunityAlertsService {
  private alerts: Map<string, OpportunityAlert> = new Map();
  private matches: Map<string, OpportunityMatch[]> = new Map();
  private processingInterval?: NodeJS.Timeout;

  constructor() {
    this.startAlertProcessor();
  }

  // Create opportunity alert
  async createAlert(params: {
    userId: string;
    name: string;
    description?: string;
    criteria: AlertCriteria;
    channels: Array<'email' | 'sms' | 'in_app' | 'push'>;
    frequency?: 'immediate' | 'daily' | 'weekly';
  }): Promise<OpportunityAlert> {
    // Validate input
    const validatedParams = opportunityAlertSchema.parse(params);

    const alert: OpportunityAlert = {
      id: this.generateId(),
      userId: validatedParams.userId,
      name: validatedParams.name,
      description: validatedParams.description,
      criteria: validatedParams.criteria,
      channels: validatedParams.channels,
      frequency: validatedParams.frequency,
      active: true,
      matchCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.alerts.set(alert.id, alert);
    this.matches.set(alert.id, []);

    // TODO: Store in database
    console.log(
      `Created opportunity alert ${alert.id} for user ${params.userId}`
    );

    return alert;
  }

  // Get user's alerts
  async getUserAlerts(
    userId: string,
    options: {
      active?: boolean;
    } = {}
  ): Promise<OpportunityAlert[]> {
    let userAlerts = Array.from(this.alerts.values()).filter(
      alert => alert.userId === userId
    );

    if (options.active !== undefined) {
      userAlerts = userAlerts.filter(alert => alert.active === options.active);
    }

    return userAlerts.sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  // Get alert by ID
  async getAlert(
    alertId: string,
    userId: string
  ): Promise<OpportunityAlert | null> {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.userId !== userId) {
      return null;
    }
    return alert;
  }

  // Update alert
  async updateAlert(
    alertId: string,
    userId: string,
    updates: {
      name?: string;
      description?: string;
      criteria?: Partial<AlertCriteria>;
      channels?: Array<'email' | 'sms' | 'in_app' | 'push'>;
      frequency?: 'immediate' | 'daily' | 'weekly';
      active?: boolean;
    }
  ): Promise<OpportunityAlert | null> {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.userId !== userId) {
      return null;
    }

    if (updates.name) alert.name = updates.name;
    if (updates.description !== undefined)
      alert.description = updates.description;
    if (updates.criteria) {
      alert.criteria = { ...alert.criteria, ...updates.criteria };
    }
    if (updates.channels) alert.channels = updates.channels;
    if (updates.frequency) alert.frequency = updates.frequency;
    if (updates.active !== undefined) alert.active = updates.active;

    alert.updatedAt = new Date();
    this.alerts.set(alertId, alert);

    // TODO: Update in database
    console.log(`Updated alert ${alertId}`);

    return alert;
  }

  // Delete alert
  async deleteAlert(alertId: string, userId: string): Promise<boolean> {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.userId !== userId) {
      return false;
    }

    this.alerts.delete(alertId);
    this.matches.delete(alertId);

    // TODO: Delete from database
    console.log(`Deleted alert ${alertId}`);

    return true;
  }

  // Check opportunities against alerts
  async checkOpportunityAgainstAlerts(
    opportunity: OpportunityMatch['opportunity']
  ): Promise<OpportunityMatch[]> {
    const matches: OpportunityMatch[] = [];

    for (const alert of this.alerts.values()) {
      if (!alert.active) continue;

      const matchScore = this.calculateMatchScore(opportunity, alert.criteria);
      if (matchScore > 0) {
        const matchedCriteria = this.getMatchedCriteria(
          opportunity,
          alert.criteria
        );

        const match: OpportunityMatch = {
          alertId: alert.id,
          opportunityId: opportunity.id,
          matchScore,
          matchedCriteria,
          opportunity,
          createdAt: new Date(),
        };

        matches.push(match);

        // Store match
        const alertMatches = this.matches.get(alert.id) || [];
        alertMatches.push(match);
        this.matches.set(alert.id, alertMatches);

        // Update alert match count
        alert.matchCount++;
        alert.lastTriggered = new Date();
        alert.updatedAt = new Date();
        this.alerts.set(alert.id, alert);

        // Send immediate notification if frequency is immediate
        if (alert.frequency === 'immediate') {
          await this.sendAlertNotification(alert, [match]);
        }
      }
    }

    return matches;
  }

  // Calculate match score between opportunity and criteria
  private calculateMatchScore(
    opportunity: OpportunityMatch['opportunity'],
    criteria: AlertCriteria
  ): number {
    let score = 0;
    let maxScore = 0;

    // Keywords matching
    if (criteria.keywords && criteria.keywords.length > 0) {
      maxScore += 30;
      const keywordMatches = criteria.keywords.filter(
        keyword =>
          opportunity.title.toLowerCase().includes(keyword.toLowerCase()) ||
          opportunity.description.toLowerCase().includes(keyword.toLowerCase())
      );
      score += (keywordMatches.length / criteria.keywords.length) * 30;
    }

    // Skills matching
    if (criteria.skills && criteria.skills.length > 0) {
      maxScore += 25;
      const skillMatches = criteria.skills.filter(skill =>
        opportunity.skills.some(oppSkill =>
          oppSkill.toLowerCase().includes(skill.toLowerCase())
        )
      );
      score += (skillMatches.length / criteria.skills.length) * 25;
    }

    // Opportunity type matching
    if (criteria.opportunityTypes && criteria.opportunityTypes.length > 0) {
      maxScore += 20;
      if (criteria.opportunityTypes.includes(opportunity.type)) {
        score += 20;
      }
    }

    // Organizer type matching
    if (criteria.organizerTypes && criteria.organizerTypes.length > 0) {
      maxScore += 10;
      if (criteria.organizerTypes.includes(opportunity.organizer.type)) {
        score += 10;
      }
    }

    // Mode matching
    if (criteria.modes && criteria.modes.length > 0) {
      maxScore += 10;
      if (criteria.modes.includes(opportunity.mode)) {
        score += 10;
      }
    }

    // Location matching
    if (
      criteria.locations &&
      criteria.locations.length > 0 &&
      opportunity.location
    ) {
      maxScore += 15;
      const locationMatches = criteria.locations.some(location =>
        opportunity.location!.toLowerCase().includes(location.toLowerCase())
      );
      if (locationMatches) {
        score += 15;
      }
    }

    // Deadline range matching
    if (criteria.deadlineRange) {
      maxScore += 10;
      const now = new Date();
      const daysUntilDeadline = Math.ceil(
        (opportunity.deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (
        daysUntilDeadline >= criteria.deadlineRange.min &&
        daysUntilDeadline <= criteria.deadlineRange.max
      ) {
        score += 10;
      }
    }

    // Exclude keywords (negative scoring)
    if (criteria.excludeKeywords && criteria.excludeKeywords.length > 0) {
      const excludeMatches = criteria.excludeKeywords.filter(
        keyword =>
          opportunity.title.toLowerCase().includes(keyword.toLowerCase()) ||
          opportunity.description.toLowerCase().includes(keyword.toLowerCase())
      );
      if (excludeMatches.length > 0) {
        return 0; // Exclude this opportunity
      }
    }

    // Return percentage score (0-100)
    return maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  }

  // Get matched criteria for an opportunity
  private getMatchedCriteria(
    opportunity: OpportunityMatch['opportunity'],
    criteria: AlertCriteria
  ): string[] {
    const matched: string[] = [];

    if (criteria.keywords) {
      const keywordMatches = criteria.keywords.filter(
        keyword =>
          opportunity.title.toLowerCase().includes(keyword.toLowerCase()) ||
          opportunity.description.toLowerCase().includes(keyword.toLowerCase())
      );
      if (keywordMatches.length > 0) {
        matched.push(`Keywords: ${keywordMatches.join(', ')}`);
      }
    }

    if (criteria.skills) {
      const skillMatches = criteria.skills.filter(skill =>
        opportunity.skills.some(oppSkill =>
          oppSkill.toLowerCase().includes(skill.toLowerCase())
        )
      );
      if (skillMatches.length > 0) {
        matched.push(`Skills: ${skillMatches.join(', ')}`);
      }
    }

    if (criteria.opportunityTypes?.includes(opportunity.type)) {
      matched.push(`Type: ${opportunity.type}`);
    }

    if (criteria.organizerTypes?.includes(opportunity.organizer.type)) {
      matched.push(`Organizer: ${opportunity.organizer.type}`);
    }

    if (criteria.modes?.includes(opportunity.mode)) {
      matched.push(`Mode: ${opportunity.mode}`);
    }

    if (criteria.locations && opportunity.location) {
      const locationMatches = criteria.locations.filter(location =>
        opportunity.location!.toLowerCase().includes(location.toLowerCase())
      );
      if (locationMatches.length > 0) {
        matched.push(`Location: ${locationMatches.join(', ')}`);
      }
    }

    return matched;
  }

  // Send alert notification
  private async sendAlertNotification(
    alert: OpportunityAlert,
    matches: OpportunityMatch[]
  ): Promise<void> {
    if (matches.length === 0) return;

    const title =
      matches.length === 1
        ? `New Opportunity Alert: ${matches[0].opportunity.title}`
        : `${matches.length} New Opportunities Match Your Alert`;

    let message: string;
    if (matches.length === 1) {
      const match = matches[0];
      message = `${match.opportunity.type} by ${match.opportunity.organizer.name}. Deadline: ${match.opportunity.deadline.toLocaleDateString()}`;
    } else {
      message = `${matches.length} new opportunities match your "${alert.name}" alert. Check them out now!`;
    }

    await notificationService.sendNotification({
      userId: alert.userId,
      type: 'new_opportunity',
      channels: alert.channels,
      content: {
        title,
        message,
        data: {
          alertId: alert.id,
          alertName: alert.name,
          matchCount: matches.length,
          matches: matches.map(match => ({
            opportunityId: match.opportunityId,
            title: match.opportunity.title,
            type: match.opportunity.type,
            organizer: match.opportunity.organizer.name,
            deadline: match.opportunity.deadline.toISOString(),
            matchScore: match.matchScore,
            url: match.opportunity.url,
          })),
        },
      },
      priority: matches.length > 3 ? 'high' : 'normal',
    });

    console.log(
      `Sent alert notification for ${matches.length} opportunities to user ${alert.userId}`
    );
  }

  // Get alert matches
  async getAlertMatches(
    alertId: string,
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      minScore?: number;
    } = {}
  ): Promise<{
    matches: OpportunityMatch[];
    total: number;
  }> {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.userId !== userId) {
      return { matches: [], total: 0 };
    }

    let matches = this.matches.get(alertId) || [];

    // Filter by minimum score
    if (options.minScore) {
      matches = matches.filter(match => match.matchScore >= options.minScore);
    }

    // Sort by match score and creation date
    matches.sort((a, b) => {
      if (a.matchScore !== b.matchScore) {
        return b.matchScore - a.matchScore;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    const total = matches.length;
    const offset = options.offset || 0;
    const limit = options.limit || 20;

    const paginatedMatches = matches.slice(offset, offset + limit);

    return {
      matches: paginatedMatches,
      total,
    };
  }

  // Process daily/weekly alerts
  private async processBatchAlerts(): Promise<void> {
    const now = new Date();
    const dailyAlerts = Array.from(this.alerts.values()).filter(
      alert => alert.active && alert.frequency === 'daily'
    );

    const weeklyAlerts = Array.from(this.alerts.values()).filter(
      alert => alert.active && alert.frequency === 'weekly'
    );

    // Process daily alerts (send if last triggered > 24 hours ago)
    for (const alert of dailyAlerts) {
      const shouldSend =
        !alert.lastTriggered ||
        now.getTime() - alert.lastTriggered.getTime() > 24 * 60 * 60 * 1000;

      if (shouldSend) {
        const matches = this.matches.get(alert.id) || [];
        const recentMatches = matches.filter(
          match =>
            now.getTime() - match.createdAt.getTime() <= 24 * 60 * 60 * 1000
        );

        if (recentMatches.length > 0) {
          await this.sendAlertNotification(alert, recentMatches);
        }
      }
    }

    // Process weekly alerts (send if last triggered > 7 days ago)
    for (const alert of weeklyAlerts) {
      const shouldSend =
        !alert.lastTriggered ||
        now.getTime() - alert.lastTriggered.getTime() > 7 * 24 * 60 * 60 * 1000;

      if (shouldSend) {
        const matches = this.matches.get(alert.id) || [];
        const recentMatches = matches.filter(
          match =>
            now.getTime() - match.createdAt.getTime() <= 7 * 24 * 60 * 60 * 1000
        );

        if (recentMatches.length > 0) {
          await this.sendAlertNotification(alert, recentMatches);
        }
      }
    }
  }

  // Start alert processor
  private startAlertProcessor(): void {
    // Process batch alerts every hour
    this.processingInterval = setInterval(
      () => {
        this.processBatchAlerts().catch(error => {
          console.error('Error processing batch alerts:', error);
        });
      },
      60 * 60 * 1000
    );

    console.log('Opportunity alerts processor started');
  }

  // Stop alert processor
  stopAlertProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
      console.log('Opportunity alerts processor stopped');
    }
  }

  // Get alert statistics
  async getAlertStats(userId?: string): Promise<{
    totalAlerts: number;
    activeAlerts: number;
    totalMatches: number;
    avgMatchScore: number;
    byFrequency: Record<string, number>;
    byChannel: Record<string, number>;
    topMatchingCriteria: Array<{ criteria: string; count: number }>;
  }> {
    let alerts = Array.from(this.alerts.values());

    if (userId) {
      alerts = alerts.filter(alert => alert.userId === userId);
    }

    const activeAlerts = alerts.filter(alert => alert.active);

    let totalMatches = 0;
    let totalScore = 0;
    const byFrequency: Record<string, number> = {};
    const byChannel: Record<string, number> = {};
    const criteriaCount: Record<string, number> = {};

    alerts.forEach(alert => {
      const matches = this.matches.get(alert.id) || [];
      totalMatches += matches.length;

      matches.forEach(match => {
        totalScore += match.matchScore;
        match.matchedCriteria.forEach(criteria => {
          criteriaCount[criteria] = (criteriaCount[criteria] || 0) + 1;
        });
      });

      byFrequency[alert.frequency] = (byFrequency[alert.frequency] || 0) + 1;

      alert.channels.forEach(channel => {
        byChannel[channel] = (byChannel[channel] || 0) + 1;
      });
    });

    const avgMatchScore = totalMatches > 0 ? totalScore / totalMatches : 0;

    const topMatchingCriteria = Object.entries(criteriaCount)
      .map(([criteria, count]) => ({ criteria, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalAlerts: alerts.length,
      activeAlerts: activeAlerts.length,
      totalMatches,
      avgMatchScore: Math.round(avgMatchScore),
      byFrequency,
      byChannel,
      topMatchingCriteria,
    };
  }

  // Create alert from user profile
  async createAlertFromProfile(
    userId: string,
    userProfile: {
      skills: string[];
      interests: string[];
      location?: string;
      preferredTypes?: Array<'hackathon' | 'internship' | 'workshop'>;
    }
  ): Promise<OpportunityAlert> {
    const criteria: AlertCriteria = {
      skills: userProfile.skills,
      keywords: userProfile.interests,
      opportunityTypes: userProfile.preferredTypes,
      locations: userProfile.location ? [userProfile.location] : undefined,
      deadlineRange: { min: 1, max: 90 }, // Next 3 months
    };

    return this.createAlert({
      userId,
      name: 'Profile-based Alert',
      description: 'Automatically created based on your profile preferences',
      criteria,
      channels: ['in_app', 'email'],
      frequency: 'daily',
    });
  }

  // Generate unique ID
  private generateId(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

// Export singleton instance
export const opportunityAlertsService = new OpportunityAlertsService();
