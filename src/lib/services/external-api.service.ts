import { PrismaClient } from '@prisma/client';
import type { ApiResponse, Opportunity } from '../../types';
import { dataQualityService } from './data-quality.service';
import { scrapingService } from './scraping.service';
import { searchService } from './search.service';

const prisma = new PrismaClient();

export interface ExternalAPIConfig {
  id: string;
  name: string;
  type: 'rest' | 'graphql' | 'webhook';
  baseUrl: string;
  apiKey?: string;
  headers?: Record<string, string>;
  rateLimit: {
    requests: number;
    windowMs: number;
  };
  retryConfig: {
    maxRetries: number;
    backoffMs: number;
  };
  isActive: boolean;
}

export interface APIHealthStatus {
  apiId: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  lastChecked: Date;
  errorCount: number;
  successRate: number;
}

export interface SyncSchedule {
  id: string;
  sourceId: string;
  frequency: 'hourly' | 'daily' | 'weekly';
  nextRun: Date;
  lastRun?: Date;
  isActive: boolean;
}

export interface WebhookPayload {
  event: string;
  data: any;
  timestamp: Date;
  source: string;
}

export class ExternalAPIService {
  private rateLimiters: Map<string, { requests: number; resetTime: number }> =
    new Map();
  private healthStatuses: Map<string, APIHealthStatus> = new Map();

  /**
   * Create REST API client for partner platforms
   */
  async createRESTClient(config: ExternalAPIConfig): Promise<ApiResponse<any>> {
    try {
      const client = {
        get: async (endpoint: string, params?: any) => {
          return this.makeRequest(config, 'GET', endpoint, null, params);
        },
        post: async (endpoint: string, data?: any) => {
          return this.makeRequest(config, 'POST', endpoint, data);
        },
        put: async (endpoint: string, data?: any) => {
          return this.makeRequest(config, 'PUT', endpoint, data);
        },
        delete: async (endpoint: string) => {
          return this.makeRequest(config, 'DELETE', endpoint);
        },
      };

      return {
        success: true,
        data: client,
        message: 'REST client created successfully',
      };
    } catch (error) {
      console.error('Create REST client error:', error);
      return {
        success: false,
        error: 'Failed to create REST client',
      };
    }
  }

  /**
   * Create GraphQL client
   */
  async createGraphQLClient(
    config: ExternalAPIConfig
  ): Promise<ApiResponse<any>> {
    try {
      const client = {
        query: async (query: string, variables?: any) => {
          return this.makeGraphQLRequest(config, query, variables);
        },
        mutation: async (mutation: string, variables?: any) => {
          return this.makeGraphQLRequest(config, mutation, variables);
        },
      };

      return {
        success: true,
        data: client,
        message: 'GraphQL client created successfully',
      };
    } catch (error) {
      console.error('Create GraphQL client error:', error);
      return {
        success: false,
        error: 'Failed to create GraphQL client',
      };
    }
  }

  /**
   * Make HTTP request with rate limiting and error handling
   */
  private async makeRequest(
    config: ExternalAPIConfig,
    method: string,
    endpoint: string,
    data?: any,
    params?: any
  ): Promise<any> {
    // Check rate limit
    const rateLimitResult = await this.checkRateLimit(
      config.id,
      config.rateLimit
    );
    if (!rateLimitResult.allowed) {
      throw new Error(
        `Rate limit exceeded. Try again in ${rateLimitResult.resetIn}ms`
      );
    }

    const url = new URL(endpoint, config.baseUrl);
    if (params) {
      Object.keys(params).forEach(key =>
        url.searchParams.append(key, params[key])
      );
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'OpportuneX/1.0',
      ...config.headers,
    };

    if (config.apiKey) {
      headers['Authorization'] = `Bearer ${config.apiKey}`;
    }

    const requestOptions: RequestInit = {
      method,
      headers,
      ...(data && { body: JSON.stringify(data) }),
    };

    let lastError: Error | null = null;
    const startTime = Date.now();

    // Retry logic
    for (let attempt = 0; attempt <= config.retryConfig.maxRetries; attempt++) {
      try {
        const response = await fetch(url.toString(), requestOptions);
        const responseTime = Date.now() - startTime;

        // Update health status
        this.updateHealthStatus(config.id, true, responseTime);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();
        return result;
      } catch (error) {
        lastError = error as Error;

        if (attempt < config.retryConfig.maxRetries) {
          const backoffTime =
            config.retryConfig.backoffMs * Math.pow(2, attempt);
          await this.delay(backoffTime);
        }
      }
    }

    // Update health status on failure
    this.updateHealthStatus(config.id, false, Date.now() - startTime);
    throw lastError;
  }

  /**
   * Make GraphQL request
   */
  private async makeGraphQLRequest(
    config: ExternalAPIConfig,
    query: string,
    variables?: any
  ): Promise<any> {
    const data = {
      query,
      variables: variables || {},
    };

    return this.makeRequest(config, 'POST', '/graphql', data);
  }

  /**
   * Check rate limit
   */
  private async checkRateLimit(
    apiId: string,
    rateLimit: { requests: number; windowMs: number }
  ): Promise<{ allowed: boolean; resetIn: number }> {
    const now = Date.now();
    const limiter = this.rateLimiters.get(apiId);

    if (!limiter || now >= limiter.resetTime) {
      // Reset or initialize rate limiter
      this.rateLimiters.set(apiId, {
        requests: 1,
        resetTime: now + rateLimit.windowMs,
      });
      return { allowed: true, resetIn: 0 };
    }

    if (limiter.requests >= rateLimit.requests) {
      return { allowed: false, resetIn: limiter.resetTime - now };
    }

    limiter.requests++;
    return { allowed: true, resetIn: 0 };
  }

  /**
   * Update API health status
   */
  private updateHealthStatus(
    apiId: string,
    success: boolean,
    responseTime: number
  ): void {
    const existing = this.healthStatuses.get(apiId);

    if (!existing) {
      this.healthStatuses.set(apiId, {
        apiId,
        status: success ? 'healthy' : 'down',
        responseTime,
        lastChecked: new Date(),
        errorCount: success ? 0 : 1,
        successRate: success ? 1 : 0,
      });
      return;
    }

    // Update existing status
    const totalRequests = existing.errorCount + existing.successRate * 100;
    const successCount = existing.successRate * totalRequests;

    existing.responseTime = (existing.responseTime + responseTime) / 2; // Moving average
    existing.lastChecked = new Date();
    existing.errorCount = success
      ? Math.max(0, existing.errorCount - 1)
      : existing.errorCount + 1;
    existing.successRate = success
      ? (successCount + 1) / (totalRequests + 1)
      : successCount / (totalRequests + 1);

    // Determine status
    if (existing.successRate > 0.95) {
      existing.status = 'healthy';
    } else if (existing.successRate > 0.8) {
      existing.status = 'degraded';
    } else {
      existing.status = 'down';
    }
  }

  /**
   * Set up webhook handlers for real-time updates
   */
  async setupWebhookHandler(
    sourceId: string,
    webhookUrl: string,
    secret?: string
  ): Promise<ApiResponse<null>> {
    try {
      // Store webhook configuration
      await prisma.source.update({
        where: { id: sourceId },
        data: {
          // Note: This would require adding webhook fields to the Source model
          updatedAt: new Date(),
        },
      });

      return {
        success: true,
        message: 'Webhook handler configured successfully',
      };
    } catch (error) {
      console.error('Setup webhook handler error:', error);
      return {
        success: false,
        error: 'Failed to setup webhook handler',
      };
    }
  }

  /**
   * Process incoming webhook
   */
  async processWebhook(payload: WebhookPayload): Promise<ApiResponse<null>> {
    try {
      console.log(
        `Processing webhook from ${payload.source}: ${payload.event}`
      );

      switch (payload.event) {
        case 'opportunity.created':
        case 'opportunity.updated':
          await this.handleOpportunityWebhook(payload);
          break;
        case 'opportunity.deleted':
          await this.handleOpportunityDeletion(payload);
          break;
        default:
          console.log(`Unknown webhook event: ${payload.event}`);
      }

      return {
        success: true,
        message: 'Webhook processed successfully',
      };
    } catch (error) {
      console.error('Process webhook error:', error);
      return {
        success: false,
        error: 'Failed to process webhook',
      };
    }
  }

  /**
   * Handle opportunity webhook
   */
  private async handleOpportunityWebhook(
    payload: WebhookPayload
  ): Promise<void> {
    const opportunityData = payload.data;

    // Validate and standardize the data
    const standardizationResult =
      await dataQualityService.standardizeOpportunity(opportunityData);
    if (!standardizationResult.success || !standardizationResult.data) {
      console.error('Failed to standardize webhook opportunity data');
      return;
    }

    const standardizedOpportunity = standardizationResult.data.standardized;

    // Check for duplicates
    const duplicateResult = await dataQualityService.detectDuplicates(
      standardizedOpportunity
    );
    if (duplicateResult.success && duplicateResult.data?.isDuplicate) {
      console.log(
        `Duplicate opportunity detected from webhook: ${standardizedOpportunity.title}`
      );
      return;
    }

    // Check data quality
    const qualityResult = await dataQualityService.calculateQualityScore(
      standardizedOpportunity
    );
    if (
      qualityResult.success &&
      qualityResult.data &&
      qualityResult.data.overall < 0.6
    ) {
      console.log(
        `Low quality opportunity from webhook: ${standardizedOpportunity.title}`
      );
      return;
    }

    // Save to database and index
    await this.saveOpportunityFromWebhook(
      standardizedOpportunity,
      payload.source
    );
    await searchService.indexOpportunity(standardizedOpportunity);
  }

  /**
   * Handle opportunity deletion webhook
   */
  private async handleOpportunityDeletion(
    payload: WebhookPayload
  ): Promise<void> {
    const opportunityId = payload.data.id || payload.data.opportunityId;

    if (!opportunityId) {
      console.error('No opportunity ID provided in deletion webhook');
      return;
    }

    // Mark as inactive in database
    await prisma.opportunity.updateMany({
      where: { externalUrl: { contains: opportunityId } },
      data: { isActive: false, updatedAt: new Date() },
    });

    // Remove from search index
    await searchService.removeOpportunity(opportunityId);
  }

  /**
   * Save opportunity from webhook
   */
  private async saveOpportunityFromWebhook(
    opportunity: Opportunity,
    sourceId: string
  ): Promise<void> {
    try {
      await prisma.opportunity.upsert({
        where: { externalUrl: opportunity.externalUrl },
        update: {
          title: opportunity.title,
          description: opportunity.description,
          requiredSkills: opportunity.requirements.skills,
          experienceRequired: opportunity.requirements.experience,
          educationRequired: opportunity.requirements.education,
          eligibilityCriteria: opportunity.requirements.eligibility,
          mode: opportunity.details.mode,
          location: opportunity.details.location,
          duration: opportunity.details.duration,
          stipend: opportunity.details.stipend,
          prizes: opportunity.details.prizes,
          applicationDeadline: opportunity.timeline.applicationDeadline,
          startDate: opportunity.timeline.startDate,
          endDate: opportunity.timeline.endDate,
          tags: opportunity.tags,
          updatedAt: new Date(),
        },
        create: {
          id: opportunity.id,
          title: opportunity.title,
          description: opportunity.description,
          type: opportunity.type,
          organizerName: opportunity.organizer.name,
          organizerType: opportunity.organizer.type,
          organizerLogo: opportunity.organizer.logo,
          requiredSkills: opportunity.requirements.skills,
          experienceRequired: opportunity.requirements.experience,
          educationRequired: opportunity.requirements.education,
          eligibilityCriteria: opportunity.requirements.eligibility,
          mode: opportunity.details.mode,
          location: opportunity.details.location,
          duration: opportunity.details.duration,
          stipend: opportunity.details.stipend,
          prizes: opportunity.details.prizes,
          applicationDeadline: opportunity.timeline.applicationDeadline,
          startDate: opportunity.timeline.startDate,
          endDate: opportunity.timeline.endDate,
          externalUrl: opportunity.externalUrl,
          sourceId,
          tags: opportunity.tags,
          isActive: true,
          qualityScore: 0,
        },
      });
    } catch (error) {
      console.error('Save opportunity from webhook error:', error);
      throw error;
    }
  }

  /**
   * Create data synchronization schedule
   */
  async createSyncSchedule(
    sourceId: string,
    frequency: 'hourly' | 'daily' | 'weekly'
  ): Promise<ApiResponse<SyncSchedule>> {
    try {
      const nextRun = this.calculateNextRun(frequency);

      const schedule: SyncSchedule = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sourceId,
        frequency,
        nextRun,
        isActive: true,
      };

      // In a real implementation, this would be stored in the database
      console.log(`Created sync schedule for source ${sourceId}: ${frequency}`);

      return {
        success: true,
        data: schedule,
        message: 'Sync schedule created successfully',
      };
    } catch (error) {
      console.error('Create sync schedule error:', error);
      return {
        success: false,
        error: 'Failed to create sync schedule',
      };
    }
  }

  /**
   * Execute scheduled synchronization
   */
  async executeScheduledSync(): Promise<ApiResponse<{ processed: number }>> {
    try {
      const sources = await prisma.source.findMany({
        where: { isActive: true },
      });

      let processed = 0;

      for (const source of sources) {
        const hoursSinceLastScrape = source.lastScrapedAt
          ? (Date.now() - source.lastScrapedAt.getTime()) / (1000 * 60 * 60)
          : Infinity;

        if (hoursSinceLastScrape >= source.scrapeFrequencyHours) {
          console.log(`Starting scheduled sync for source: ${source.id}`);
          await scrapingService.startScrapingJob(source.id);
          processed++;
        }
      }

      return {
        success: true,
        data: { processed },
        message: `Processed ${processed} scheduled syncs`,
      };
    } catch (error) {
      console.error('Execute scheduled sync error:', error);
      return {
        success: false,
        error: 'Failed to execute scheduled sync',
      };
    }
  }

  /**
   * Monitor API health
   */
  async monitorAPIHealth(): Promise<ApiResponse<APIHealthStatus[]>> {
    try {
      const healthStatuses = Array.from(this.healthStatuses.values());

      // Check APIs that haven't been checked recently
      const sources = await prisma.source.findMany({
        where: { isActive: true },
      });

      for (const source of sources) {
        const existing = this.healthStatuses.get(source.id);
        const lastChecked = existing?.lastChecked || new Date(0);
        const minutesSinceCheck =
          (Date.now() - lastChecked.getTime()) / (1000 * 60);

        if (minutesSinceCheck > 5) {
          // Check every 5 minutes
          await this.performHealthCheck(source.id, source.url);
        }
      }

      return {
        success: true,
        data: Array.from(this.healthStatuses.values()),
        message: 'API health monitoring completed',
      };
    } catch (error) {
      console.error('Monitor API health error:', error);
      return {
        success: false,
        error: 'Failed to monitor API health',
      };
    }
  }

  /**
   * Perform health check for a specific API
   */
  private async performHealthCheck(apiId: string, url: string): Promise<void> {
    const startTime = Date.now();

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        timeout: 10000, // 10 second timeout
      } as any);

      const responseTime = Date.now() - startTime;
      this.updateHealthStatus(apiId, response.ok, responseTime);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateHealthStatus(apiId, false, responseTime);
    }
  }

  /**
   * Get API health status
   */
  async getAPIHealthStatus(
    apiId?: string
  ): Promise<ApiResponse<APIHealthStatus | APIHealthStatus[]>> {
    try {
      if (apiId) {
        const status = this.healthStatuses.get(apiId);
        if (!status) {
          return {
            success: false,
            error: 'API health status not found',
          };
        }
        return {
          success: true,
          data: status,
          message: 'API health status retrieved successfully',
        };
      } else {
        return {
          success: true,
          data: Array.from(this.healthStatuses.values()),
          message: 'All API health statuses retrieved successfully',
        };
      }
    } catch (error) {
      console.error('Get API health status error:', error);
      return {
        success: false,
        error: 'Failed to get API health status',
      };
    }
  }

  /**
   * Calculate next run time based on frequency
   */
  private calculateNextRun(frequency: 'hourly' | 'daily' | 'weekly'): Date {
    const now = new Date();

    switch (frequency) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  /**
   * Utility function for delays
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Sync opportunities from external APIs
   */
  async syncFromExternalAPIs(): Promise<
    ApiResponse<{ synced: number; errors: string[] }>
  > {
    try {
      let synced = 0;
      const errors: string[] = [];

      // Example: Sync from Devfolio API
      try {
        const devfolioData = await this.syncFromDevfolio();
        synced += devfolioData.count;
      } catch (error) {
        errors.push(
          `Devfolio sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      // Example: Sync from HackerEarth API
      try {
        const hackerEarthData = await this.syncFromHackerEarth();
        synced += hackerEarthData.count;
      } catch (error) {
        errors.push(
          `HackerEarth sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }

      return {
        success: true,
        data: { synced, errors },
        message: `Synced ${synced} opportunities from external APIs`,
      };
    } catch (error) {
      console.error('Sync from external APIs error:', error);
      return {
        success: false,
        error: 'Failed to sync from external APIs',
      };
    }
  }

  /**
   * Sync from Devfolio API (example)
   */
  private async syncFromDevfolio(): Promise<{ count: number }> {
    // Mock implementation - in reality, this would call Devfolio's API
    console.log('Syncing from Devfolio API...');
    return { count: 5 };
  }

  /**
   * Sync from HackerEarth API (example)
   */
  private async syncFromHackerEarth(): Promise<{ count: number }> {
    // Mock implementation - in reality, this would call HackerEarth's API
    console.log('Syncing from HackerEarth API...');
    return { count: 3 };
  }
}

export const externalAPIService = new ExternalAPIService();
