import { PrismaClient } from '@prisma/client';
import type { ApiResponse, Opportunity } from '../../types';
import { searchService } from './search.service';

const prisma = new PrismaClient();

export interface ScrapingConfig {
  userAgents: string[];
  proxies: string[];
  requestDelay: number;
  maxRetries: number;
  respectRobotsTxt: boolean;
  enableJavaScript: boolean;
}

export interface ScrapingJob {
  id: string;
  sourceId: string;
  url: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  itemsScraped: number;
  errors: string[];
}

export interface ScrapedOpportunity {
  title: string;
  description: string;
  type: 'hackathon' | 'internship' | 'workshop';
  organizerName: string;
  organizerType: 'corporate' | 'startup' | 'government' | 'academic';
  organizerLogo?: string;
  requiredSkills: string[];
  experienceRequired?: string;
  educationRequired?: string;
  eligibilityCriteria: string[];
  mode: 'online' | 'offline' | 'hybrid';
  location?: string;
  duration?: string;
  stipend?: string;
  prizes: string[];
  applicationDeadline: Date;
  startDate?: Date;
  endDate?: Date;
  externalUrl: string;
  sourceUrl: string;
  tags: string[];
  rawData?: any;
}

export class ScrapingService {
  private config: ScrapingConfig;
  private activeJobs: Map<string, ScrapingJob> = new Map();

  constructor() {
    this.config = {
      userAgents: [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0',
      ],
      proxies: process.env.SCRAPING_PROXIES?.split(',') || [],
      requestDelay: parseInt(process.env.SCRAPING_DELAY || '2000'), // 2 seconds
      maxRetries: parseInt(process.env.SCRAPING_MAX_RETRIES || '3'),
      respectRobotsTxt: process.env.RESPECT_ROBOTS_TXT !== 'false',
      enableJavaScript: process.env.ENABLE_JS_SCRAPING === 'true',
    };
  }

  /**
   * Start a scraping job for a specific source
   */
  async startScrapingJob(sourceId: string): Promise<ApiResponse<ScrapingJob>> {
    try {
      // Get source configuration
      const source = await prisma.source.findUnique({
        where: { id: sourceId },
      });

      if (!source) {
        return {
          success: false,
          error: 'Source not found',
        };
      }

      if (!source.isActive) {
        return {
          success: false,
          error: 'Source is not active',
        };
      }

      // Check if job is already running
      const existingJob = Array.from(this.activeJobs.values()).find(
        job => job.sourceId === sourceId && job.status === 'running'
      );

      if (existingJob) {
        return {
          success: false,
          error: 'Scraping job already running for this source',
        };
      }

      // Create new job
      const job: ScrapingJob = {
        id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sourceId,
        url: source.url,
        status: 'pending',
        itemsScraped: 0,
        errors: [],
      };

      this.activeJobs.set(job.id, job);

      // Start scraping in background
      this.executeScrapingJob(job).catch(error => {
        console.error(`Scraping job ${job.id} failed:`, error);
        job.status = 'failed';
        job.errors.push(error.message);
        job.completedAt = new Date();
      });

      return {
        success: true,
        data: job,
        message: 'Scraping job started successfully',
      };
    } catch (error) {
      console.error('Start scraping job error:', error);
      return {
        success: false,
        error: 'Failed to start scraping job',
      };
    }
  }

  /**
   * Execute a scraping job
   */
  private async executeScrapingJob(job: ScrapingJob): Promise<void> {
    job.status = 'running';
    job.startedAt = new Date();

    try {
      // Get source-specific scraper
      const scraper = this.getScraperForSource(job.sourceId);

      if (!scraper) {
        throw new Error(`No scraper available for source ${job.sourceId}`);
      }

      // Execute scraping
      const scrapedData = await scraper.scrape(job.url);

      // Process and validate scraped data
      const validOpportunities: Opportunity[] = [];

      for (const item of scrapedData) {
        const validationResult = await this.validateScrapedOpportunity(item);

        if (validationResult.success && validationResult.data) {
          validOpportunities.push(validationResult.data);
        } else {
          job.errors.push(`Validation failed: ${validationResult.error}`);
        }
      }

      // Save to database
      for (const opportunity of validOpportunities) {
        await this.saveOpportunity(opportunity, job.sourceId);
        job.itemsScraped++;
      }

      // Index in Elasticsearch
      if (validOpportunities.length > 0) {
        await searchService.bulkIndexOpportunities(validOpportunities);
      }

      job.status = 'completed';
      job.completedAt = new Date();

      // Update source last scraped time
      await prisma.source.update({
        where: { id: job.sourceId },
        data: { lastScrapedAt: new Date() },
      });

      console.log(
        `Scraping job ${job.id} completed: ${job.itemsScraped} opportunities scraped`
      );
    } catch (error) {
      job.status = 'failed';
      job.errors.push(error instanceof Error ? error.message : 'Unknown error');
      job.completedAt = new Date();
      throw error;
    }
  }

  /**
   * Get scraper instance for a specific source
   */
  private getScraperForSource(sourceId: string): BaseScraper | null {
    switch (sourceId) {
      case 'devfolio':
        return new DevfolioScraper(this.config);
      case 'internshala':
        return new IntershalaScraper(this.config);
      case 'hackerearth':
        return new HackerEarthScraper(this.config);
      case 'eventbrite':
        return new EventbriteScraper(this.config);
      default:
        return new GenericScraper(this.config);
    }
  }

  /**
   * Validate scraped opportunity data
   */
  private async validateScrapedOpportunity(
    scrapedData: ScrapedOpportunity
  ): Promise<ApiResponse<Opportunity>> {
    try {
      // Basic validation
      if (!scrapedData.title || scrapedData.title.trim().length < 5) {
        return {
          success: false,
          error: 'Title is required and must be at least 5 characters',
        };
      }

      if (
        !scrapedData.applicationDeadline ||
        scrapedData.applicationDeadline < new Date()
      ) {
        return {
          success: false,
          error: 'Valid future application deadline is required',
        };
      }

      if (
        !scrapedData.externalUrl ||
        !this.isValidUrl(scrapedData.externalUrl)
      ) {
        return {
          success: false,
          error: 'Valid external URL is required',
        };
      }

      // Transform to Opportunity format
      const opportunity: Opportunity = {
        id: `opp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: scrapedData.title.trim(),
        description: scrapedData.description || '',
        type: scrapedData.type,
        organizer: {
          name: scrapedData.organizerName,
          type: scrapedData.organizerType,
          logo: scrapedData.organizerLogo,
        },
        requirements: {
          skills: scrapedData.requiredSkills,
          experience: scrapedData.experienceRequired,
          education: scrapedData.educationRequired,
          eligibility: scrapedData.eligibilityCriteria,
        },
        details: {
          mode: scrapedData.mode,
          location: scrapedData.location,
          duration: scrapedData.duration,
          stipend: scrapedData.stipend,
          prizes: scrapedData.prizes,
        },
        timeline: {
          applicationDeadline: scrapedData.applicationDeadline,
          startDate: scrapedData.startDate,
          endDate: scrapedData.endDate,
        },
        externalUrl: scrapedData.externalUrl,
        sourceId: '', // Will be set by caller
        tags: scrapedData.tags,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
      };

      return {
        success: true,
        data: opportunity,
        message: 'Opportunity validated successfully',
      };
    } catch (error) {
      console.error('Validate scraped opportunity error:', error);
      return {
        success: false,
        error: 'Failed to validate scraped opportunity',
      };
    }
  }

  /**
   * Save opportunity to database
   */
  private async saveOpportunity(
    opportunity: Opportunity,
    sourceId: string
  ): Promise<void> {
    try {
      // Check for duplicates
      const existing = await prisma.opportunity.findFirst({
        where: {
          title: opportunity.title,
          organizerName: opportunity.organizer.name,
          applicationDeadline: opportunity.timeline.applicationDeadline,
        },
      });

      if (existing) {
        // Update existing opportunity
        await prisma.opportunity.update({
          where: { id: existing.id },
          data: {
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
            startDate: opportunity.timeline.startDate,
            endDate: opportunity.timeline.endDate,
            externalUrl: opportunity.externalUrl,
            tags: opportunity.tags,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new opportunity
        await prisma.opportunity.create({
          data: {
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
      }
    } catch (error) {
      console.error('Save opportunity error:', error);
      throw error;
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<ApiResponse<ScrapingJob>> {
    const job = this.activeJobs.get(jobId);

    if (!job) {
      return {
        success: false,
        error: 'Job not found',
      };
    }

    return {
      success: true,
      data: job,
      message: 'Job status retrieved successfully',
    };
  }

  /**
   * Get all active jobs
   */
  async getActiveJobs(): Promise<ApiResponse<ScrapingJob[]>> {
    const jobs = Array.from(this.activeJobs.values());

    return {
      success: true,
      data: jobs,
      message: 'Active jobs retrieved successfully',
    };
  }

  /**
   * Cancel a running job
   */
  async cancelJob(jobId: string): Promise<ApiResponse<null>> {
    const job = this.activeJobs.get(jobId);

    if (!job) {
      return {
        success: false,
        error: 'Job not found',
      };
    }

    if (job.status !== 'running') {
      return {
        success: false,
        error: 'Job is not running',
      };
    }

    job.status = 'failed';
    job.errors.push('Job cancelled by user');
    job.completedAt = new Date();

    return {
      success: true,
      message: 'Job cancelled successfully',
    };
  }

  /**
   * Utility function to validate URLs
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Schedule regular scraping for all active sources
   */
  async scheduleRegularScraping(): Promise<void> {
    try {
      const sources = await prisma.source.findMany({
        where: { isActive: true },
      });

      for (const source of sources) {
        const hoursSinceLastScrape = source.lastScrapedAt
          ? (Date.now() - source.lastScrapedAt.getTime()) / (1000 * 60 * 60)
          : Infinity;

        if (hoursSinceLastScrape >= source.scrapeFrequencyHours) {
          console.log(`Scheduling scraping for source ${source.id}`);
          await this.startScrapingJob(source.id);
        }
      }
    } catch (error) {
      console.error('Schedule regular scraping error:', error);
    }
  }
}

/**
 * Base scraper class
 */
abstract class BaseScraper {
  protected config: ScrapingConfig;

  constructor(config: ScrapingConfig) {
    this.config = config;
  }

  abstract scrape(url: string): Promise<ScrapedOpportunity[]>;

  protected async makeRequest(
    url: string,
    options: any = {}
  ): Promise<Response> {
    const userAgent = this.getRandomUserAgent();
    const proxy = this.getRandomProxy();

    const fetchOptions: RequestInit = {
      headers: {
        'User-Agent': userAgent,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        Connection: 'keep-alive',
        ...options.headers,
      },
      ...options,
    };

    // Add proxy if available
    if (proxy) {
      // Note: In a real implementation, you'd configure proxy here
      // This is a simplified example
    }

    // Add delay to be respectful
    await this.delay(this.config.requestDelay);

    return fetch(url, fetchOptions);
  }

  protected getRandomUserAgent(): string {
    return this.config.userAgents[
      Math.floor(Math.random() * this.config.userAgents.length)
    ];
  }

  protected getRandomProxy(): string | null {
    if (this.config.proxies.length === 0) return null;
    return this.config.proxies[
      Math.floor(Math.random() * this.config.proxies.length)
    ];
  }

  protected async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Generic scraper for unknown sources
 */
class GenericScraper extends BaseScraper {
  async scrape(url: string): Promise<ScrapedOpportunity[]> {
    // This would implement generic scraping logic
    // For now, return empty array
    console.log(`Generic scraping not implemented for ${url}`);
    return [];
  }
}

/**
 * Devfolio scraper
 */
class DevfolioScraper extends BaseScraper {
  async scrape(url: string): Promise<ScrapedOpportunity[]> {
    // Mock implementation - in reality, this would parse Devfolio pages
    return [
      {
        title: 'AI Innovation Hackathon 2024',
        description: 'Build innovative AI solutions for real-world problems',
        type: 'hackathon',
        organizerName: 'TechCorp',
        organizerType: 'corporate',
        requiredSkills: ['Python', 'Machine Learning', 'AI'],
        eligibilityCriteria: ['Students', 'Professionals'],
        mode: 'online',
        prizes: ['₹1,00,000', '₹50,000', '₹25,000'],
        applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        externalUrl: 'https://devfolio.co/hackathon/ai-innovation-2024',
        sourceUrl: url,
        tags: ['AI', 'Machine Learning', 'Innovation'],
      },
    ];
  }
}

/**
 * Internshala scraper
 */
class IntershalaScraper extends BaseScraper {
  async scrape(url: string): Promise<ScrapedOpportunity[]> {
    // Mock implementation
    return [
      {
        title: 'Software Development Internship',
        description: 'Work on cutting-edge web applications',
        type: 'internship',
        organizerName: 'StartupXYZ',
        organizerType: 'startup',
        requiredSkills: ['JavaScript', 'React', 'Node.js'],
        eligibilityCriteria: ['Computer Science Students'],
        mode: 'hybrid',
        location: 'Mumbai',
        duration: '3 months',
        stipend: '₹15,000/month',
        prizes: [],
        applicationDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        externalUrl:
          'https://internshala.com/internship/detail/software-dev-123',
        sourceUrl: url,
        tags: ['Software Development', 'Web Development', 'Internship'],
      },
    ];
  }
}

/**
 * HackerEarth scraper
 */
class HackerEarthScraper extends BaseScraper {
  async scrape(url: string): Promise<ScrapedOpportunity[]> {
    // Mock implementation
    return [
      {
        title: 'Data Science Challenge 2024',
        description: 'Solve complex data problems and win prizes',
        type: 'hackathon',
        organizerName: 'DataCorp',
        organizerType: 'corporate',
        requiredSkills: ['Python', 'Data Science', 'Machine Learning'],
        eligibilityCriteria: ['All levels welcome'],
        mode: 'online',
        prizes: ['₹2,00,000', '₹1,00,000', '₹50,000'],
        applicationDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        externalUrl:
          'https://hackerearth.com/challenge/competitive/data-science-2024',
        sourceUrl: url,
        tags: ['Data Science', 'Analytics', 'Competition'],
      },
    ];
  }
}

/**
 * Eventbrite scraper
 */
class EventbriteScraper extends BaseScraper {
  async scrape(url: string): Promise<ScrapedOpportunity[]> {
    // Mock implementation
    return [
      {
        title: 'Web Development Workshop',
        description: 'Learn modern web development techniques',
        type: 'workshop',
        organizerName: 'TechEducation',
        organizerType: 'academic',
        requiredSkills: ['Basic HTML', 'CSS'],
        eligibilityCriteria: ['Beginners welcome'],
        mode: 'offline',
        location: 'Bangalore',
        duration: '2 days',
        prizes: [],
        applicationDeadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
        externalUrl: 'https://eventbrite.com/e/web-dev-workshop-123',
        sourceUrl: url,
        tags: ['Web Development', 'Workshop', 'Learning'],
      },
    ];
  }
}

export const scrapingService = new ScrapingService();
