/**
 * Unit tests for Data Aggregation Pipeline
 * Tests scraping service, data quality service, and external API service
 */

import { PrismaClient } from '@prisma/client';
import { DataQualityService } from '../lib/services/data-quality.service';
import { ExternalAPIService } from '../lib/services/external-api.service';
import type { Opportunity } from '../lib/services/scraping.service';
import { ScrapingService } from '../lib/services/scraping.service';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../lib/services/search.service', () => ({
  searchService: {
    bulkIndexOpportunities: jest.fn(),
    indexOpportunity: jest.fn(),
    removeOpportunity: jest.fn(),
  },
}));

const mockPrisma = {
  source: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  opportunity: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
  },
};

(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(
  () => mockPrisma as any
);

describe('Data Aggregation Pipeline', () => {
  let scrapingService: ScrapingService;
  let dataQualityService: DataQualityService;
  let externalAPIService: ExternalAPIService;

  beforeEach(() => {
    scrapingService = new ScrapingService();
    dataQualityService = new DataQualityService();
    externalAPIService = new ExternalAPIService();
    jest.clearAllMocks();
  });

  const mockOpportunity: Opportunity = {
    id: 'opp-123',
    title: 'AI Hackathon 2024',
    description: 'Build innovative AI solutions',
    type: 'hackathon',
    organizer: {
      name: 'TechCorp',
      type: 'corporate',
    },
    requirements: {
      skills: ['JavaScript', 'Python', 'Machine Learning'],
      experience: '1-2 years',
      education: "Bachelor's degree",
      eligibility: ['Students', 'Professionals'],
    },
    details: {
      mode: 'hybrid',
      location: 'Mumbai, India',
      duration: '48 hours',
      stipend: '₹50,000',
      prizes: ['₹1,00,000', '₹50,000', '₹25,000'],
    },
    timeline: {
      applicationDeadline: new Date('2024-03-01'),
      startDate: new Date('2024-03-15'),
      endDate: new Date('2024-03-17'),
    },
    externalUrl: 'https://example.com/hackathon',
    sourceId: 'source-1',
    tags: ['AI', 'Machine Learning', 'Innovation'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    isActive: true,
  };

  describe('ScrapingService', () => {
    describe('startScrapingJob', () => {
      const mockSource = {
        id: 'source-1',
        name: 'TechCorp',
        url: 'https://example.com/opportunities',
        isActive: true,
        scrapeFrequencyHours: 24,
        lastScrapedAt: new Date('2024-01-01'),
      };

      it('should successfully start a scraping job', async () => {
        mockPrisma.source.findUnique.mockResolvedValue(mockSource);

        const result = await scrapingService.startScrapingJob('source-1');

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(result.data?.sourceId).toBe('source-1');
        expect(result.data?.status).toBe('pending');
        expect(result.message).toBe('Scraping job started successfully');

        expect(mockPrisma.source.findUnique).toHaveBeenCalledWith({
          where: { id: 'source-1' },
        });
      });

      it('should return error when source not found', async () => {
        mockPrisma.source.findUnique.mockResolvedValue(null);

        const result = await scrapingService.startScrapingJob('non-existent');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Source not found');
      });

      it('should return error when source is inactive', async () => {
        mockPrisma.source.findUnique.mockResolvedValue({
          ...mockSource,
          isActive: false,
        });

        const result = await scrapingService.startScrapingJob('source-1');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Source is not active');
      });

      it('should prevent duplicate jobs for same source', async () => {
        mockPrisma.source.findUnique.mockResolvedValue(mockSource);

        // Start first job
        await scrapingService.startScrapingJob('source-1');

        // Try to start second job
        const result = await scrapingService.startScrapingJob('source-1');

        expect(result.success).toBe(false);
        expect(result.error).toBe(
          'Scraping job already running for this source'
        );
      });
    });

    describe('getJobStatus', () => {
      it('should return job status for existing job', async () => {
        mockPrisma.source.findUnique.mockResolvedValue({
          id: 'source-1',
          isActive: true,
          url: 'https://example.com',
        });

        // Start a job first
        const startResult = await scrapingService.startScrapingJob('source-1');
        const jobId = startResult.data?.id;

        const result = await scrapingService.getJobStatus(jobId!);

        expect(result.success).toBe(true);
        expect(result.data?.id).toBe(jobId);
        expect(result.message).toBe('Job status retrieved successfully');
      });

      it('should return error for non-existent job', async () => {
        const result = await scrapingService.getJobStatus('non-existent-job');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Job not found');
      });
    });

    describe('getActiveJobs', () => {
      it('should return all active jobs', async () => {
        const result = await scrapingService.getActiveJobs();

        expect(result.success).toBe(true);
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.message).toBe('Active jobs retrieved successfully');
      });
    });

    describe('cancelJob', () => {
      it('should successfully cancel a running job', async () => {
        mockPrisma.source.findUnique.mockResolvedValue({
          id: 'source-1',
          isActive: true,
          url: 'https://example.com',
        });

        // Start a job first
        const startResult = await scrapingService.startScrapingJob('source-1');
        const jobId = startResult.data?.id;

        const result = await scrapingService.cancelJob(jobId!);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Job cancelled successfully');
      });

      it('should return error for non-existent job', async () => {
        const result = await scrapingService.cancelJob('non-existent-job');

        expect(result.success).toBe(false);
        expect(result.error).toBe('Job not found');
      });
    });

    describe('scheduleRegularScraping', () => {
      it('should schedule scraping for sources that need it', async () => {
        const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
        mockPrisma.source.findMany.mockResolvedValue([
          {
            id: 'source-1',
            isActive: true,
            scrapeFrequencyHours: 24,
            lastScrapedAt: oldDate,
            url: 'https://example.com',
          },
        ]);

        await scrapingService.scheduleRegularScraping();

        expect(mockPrisma.source.findMany).toHaveBeenCalledWith({
          where: { isActive: true },
        });
      });
    });
  });

  describe('DataQualityService', () => {
    describe('detectDuplicates', () => {
      it('should detect no duplicates for unique opportunity', async () => {
        mockPrisma.opportunity.findMany.mockResolvedValue([]);

        const result =
          await dataQualityService.detectDuplicates(mockOpportunity);

        expect(result.success).toBe(true);
        expect(result.data?.isDuplicate).toBe(false);
        expect(result.data?.similarityScore).toBe(0);
        expect(result.message).toBe('No duplicates found');
      });

      it('should detect duplicates with high similarity', async () => {
        const similarOpportunity = {
          id: 'opp-456',
          title: 'AI Hackathon 2024',
          organizerName: 'TechCorp',
          applicationDeadline: new Date('2024-03-01'),
          externalUrl: 'https://example.com/hackathon',
          type: 'hackathon',
        };

        mockPrisma.opportunity.findMany.mockResolvedValue([similarOpportunity]);

        const result =
          await dataQualityService.detectDuplicates(mockOpportunity);

        expect(result.success).toBe(true);
        expect(result.data?.isDuplicate).toBe(true);
        expect(result.data?.similarityScore).toBeGreaterThan(0.8);
        expect(result.data?.existingOpportunityId).toBe('opp-456');
        expect(result.data?.matchedFields).toContain('title');
        expect(result.data?.matchedFields).toContain('organizer');
      });

      it('should handle database errors gracefully', async () => {
        const dbError = new Error('Database connection failed');
        mockPrisma.opportunity.findMany.mockRejectedValue(dbError);

        const result =
          await dataQualityService.detectDuplicates(mockOpportunity);

        expect(result.success).toBe(false);
        expect(result.error).toBe('Failed to detect duplicates');
      });
    });

    describe('standardizeOpportunity', () => {
      it('should standardize opportunity data', async () => {
        const messyOpportunity = {
          ...mockOpportunity,
          title: '  ai   hackathon   2024  ',
          organizer: {
            ...mockOpportunity.organizer,
            name: 'TechCorp Inc.',
          },
          requirements: {
            ...mockOpportunity.requirements,
            skills: ['js', 'python', 'ml'],
          },
          details: {
            ...mockOpportunity.details,
            location: 'mumbai',
          },
          tags: ['ai', 'machine learning', 'AI'],
        };

        const result =
          await dataQualityService.standardizeOpportunity(messyOpportunity);

        expect(result.success).toBe(true);
        expect(result.data?.standardized.title).toBe('Ai Hackathon 2024');
        expect(result.data?.standardized.organizer.name).toBe('TechCorp');
        expect(result.data?.standardized.requirements.skills).toContain(
          'JavaScript'
        );
        expect(result.data?.standardized.requirements.skills).toContain(
          'Python'
        );
        expect(result.data?.standardized.requirements.skills).toContain(
          'Machine Learning'
        );
        expect(result.data?.standardized.details.location).toBe('Mumbai');
        expect(result.data?.standardized.tags).not.toContain('ai'); // Should be standardized
        expect(result.data?.changes.length).toBeGreaterThan(0);
      });

      it('should detect date inconsistencies', async () => {
        const inconsistentOpportunity = {
          ...mockOpportunity,
          timeline: {
            applicationDeadline: new Date('2024-03-15'),
            startDate: new Date('2024-03-01'), // Start before deadline
            endDate: new Date('2024-02-28'), // End before start
          },
        };

        const result = await dataQualityService.standardizeOpportunity(
          inconsistentOpportunity
        );

        expect(result.success).toBe(true);
        expect(result.data?.warnings).toContain(
          'Start date is before application deadline'
        );
        expect(result.data?.warnings).toContain(
          'End date is before start date'
        );
      });
    });

    describe('calculateQualityScore', () => {
      it('should calculate high quality score for complete opportunity', async () => {
        const result =
          await dataQualityService.calculateQualityScore(mockOpportunity);

        expect(result.success).toBe(true);
        expect(result.data?.overall).toBeGreaterThan(0.8);
        expect(result.data?.completeness).toBeGreaterThan(0.8);
        expect(result.data?.accuracy).toBeGreaterThan(0.8);
        expect(result.data?.details.missingFields).toHaveLength(0);
      });

      it('should calculate low quality score for incomplete opportunity', async () => {
        const incompleteOpportunity = {
          ...mockOpportunity,
          description: '',
          requirements: {
            skills: [],
            eligibility: [],
          },
          details: {
            mode: 'online' as const,
          },
          timeline: {
            applicationDeadline: new Date(Date.now() - 24 * 60 * 60 * 1000), // Past deadline
          },
        };

        const result = await dataQualityService.calculateQualityScore(
          incompleteOpportunity
        );

        expect(result.success).toBe(true);
        expect(result.data?.overall).toBeLessThan(0.6);
        expect(result.data?.completeness).toBeLessThan(0.8);
        expect(result.data?.details.missingFields.length).toBeGreaterThan(0);
        expect(result.data?.details.qualityIssues).toContain(
          'Application deadline is in the past'
        );
      });

      it('should detect invalid URLs', async () => {
        const invalidUrlOpportunity = {
          ...mockOpportunity,
          externalUrl: 'not-a-valid-url',
        };

        const result = await dataQualityService.calculateQualityScore(
          invalidUrlOpportunity
        );

        expect(result.success).toBe(true);
        expect(result.data?.details.qualityIssues).toContain(
          'Invalid external URL'
        );
      });
    });

    describe('detectFraud', () => {
      it('should detect suspicious keywords', async () => {
        const suspiciousOpportunity = {
          ...mockOpportunity,
          title: 'Guaranteed Easy Money Hackathon',
          description: 'Make money fast with no experience required!',
        };

        mockPrisma.opportunity.findMany.mockResolvedValue([]);

        const result = await dataQualityService.detectFraud(
          suspiciousOpportunity
        );

        expect(result.success).toBe(true);
        expect(result.data?.isSuspicious).toBe(true);
        expect(result.data?.flags).toContain('suspicious_keywords');
        expect(result.data?.reasons[0]).toContain('suspicious keywords');
      });

      it('should detect unrealistic prizes', async () => {
        const unrealisticOpportunity = {
          ...mockOpportunity,
          details: {
            ...mockOpportunity.details,
            prizes: ['₹50,00,00,000'], // 50 crores
          },
        };

        mockPrisma.opportunity.findMany.mockResolvedValue([]);

        const result = await dataQualityService.detectFraud(
          unrealisticOpportunity
        );

        expect(result.success).toBe(true);
        expect(result.data?.flags).toContain('unrealistic_prizes');
        expect(result.data?.reasons).toContain(
          'Prize amount seems unrealistic'
        );
      });

      it('should detect suspicious URLs', async () => {
        const suspiciousUrlOpportunity = {
          ...mockOpportunity,
          externalUrl: 'https://bit.ly/suspicious-link',
        };

        mockPrisma.opportunity.findMany.mockResolvedValue([]);

        const result = await dataQualityService.detectFraud(
          suspiciousUrlOpportunity
        );

        expect(result.success).toBe(true);
        expect(result.data?.flags).toContain('suspicious_url');
        expect(result.data?.reasons).toContain(
          'Uses suspicious or shortened URL'
        );
      });

      it('should detect urgent deadlines', async () => {
        const urgentOpportunity = {
          ...mockOpportunity,
          timeline: {
            ...mockOpportunity.timeline,
            applicationDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
          },
        };

        mockPrisma.opportunity.findMany.mockResolvedValue([]);

        const result = await dataQualityService.detectFraud(urgentOpportunity);

        expect(result.success).toBe(true);
        expect(result.data?.flags).toContain('urgent_deadline');
        expect(result.data?.reasons).toContain(
          'Extremely short application deadline'
        );
      });
    });

    describe('cleanupExpiredOpportunities', () => {
      it('should cleanup expired opportunities', async () => {
        const expiredOpportunities = [
          { id: 'opp-1', title: 'Expired Hackathon' },
          { id: 'opp-2', title: 'Another Expired Event' },
        ];

        mockPrisma.opportunity.findMany.mockResolvedValue(expiredOpportunities);
        mockPrisma.opportunity.updateMany.mockResolvedValue({ count: 2 });

        const result = await dataQualityService.cleanupExpiredOpportunities();

        expect(result.success).toBe(true);
        expect(result.data?.removed).toBe(2);
        expect(result.message).toBe('Cleaned up 2 expired opportunities');

        expect(mockPrisma.opportunity.updateMany).toHaveBeenCalledWith({
          where: {
            applicationDeadline: { lt: expect.any(Date) },
            isActive: true,
          },
          data: {
            isActive: false,
            updatedAt: expect.any(Date),
          },
        });
      });
    });

    describe('mergeDuplicateOpportunities', () => {
      const primaryOpportunity = {
        id: 'opp-primary',
        title: 'AI Hackathon',
        description: 'Primary description',
        requiredSkills: ['JavaScript'],
        tags: ['AI'],
        prizes: ['₹1,00,000'],
        eligibilityCriteria: ['Students'],
      };

      const duplicateOpportunity = {
        id: 'opp-duplicate',
        title: 'AI Hackathon',
        description: '',
        requiredSkills: ['Python'],
        tags: ['Machine Learning'],
        prizes: ['₹50,000'],
        eligibilityCriteria: ['Professionals'],
      };

      it('should successfully merge duplicate opportunities', async () => {
        mockPrisma.opportunity.findUnique
          .mockResolvedValueOnce(primaryOpportunity)
          .mockResolvedValueOnce(duplicateOpportunity);
        mockPrisma.opportunity.update.mockResolvedValue({});

        const result = await dataQualityService.mergeDuplicateOpportunities(
          'opp-primary',
          'opp-duplicate'
        );

        expect(result.success).toBe(true);
        expect(result.message).toBe('Opportunities merged successfully');

        expect(mockPrisma.opportunity.update).toHaveBeenCalledWith({
          where: { id: 'opp-primary' },
          data: expect.objectContaining({
            description: 'Primary description', // Keep primary
            requiredSkills: ['JavaScript', 'Python'], // Merge unique skills
            tags: ['AI', 'Machine Learning'], // Merge unique tags
            prizes: ['₹1,00,000', '₹50,000'], // Merge unique prizes
            eligibilityCriteria: ['Students', 'Professionals'], // Merge unique criteria
          }),
        });

        expect(mockPrisma.opportunity.update).toHaveBeenCalledWith({
          where: { id: 'opp-duplicate' },
          data: {
            isActive: false,
            updatedAt: expect.any(Date),
          },
        });
      });

      it('should return error when opportunities not found', async () => {
        mockPrisma.opportunity.findUnique
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(duplicateOpportunity);

        const result = await dataQualityService.mergeDuplicateOpportunities(
          'non-existent',
          'opp-duplicate'
        );

        expect(result.success).toBe(false);
        expect(result.error).toBe('One or both opportunities not found');
      });
    });
  });

  describe('ExternalAPIService', () => {
    describe('createRESTClient', () => {
      const mockConfig = {
        id: 'api-1',
        name: 'Test API',
        type: 'rest' as const,
        baseUrl: 'https://api.example.com',
        apiKey: 'test-key',
        headers: { 'Custom-Header': 'value' },
        rateLimit: { requests: 100, windowMs: 60000 },
        retryConfig: { maxRetries: 3, backoffMs: 1000 },
        isActive: true,
      };

      it('should create REST client successfully', async () => {
        const result = await externalAPIService.createRESTClient(mockConfig);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(typeof result.data.get).toBe('function');
        expect(typeof result.data.post).toBe('function');
        expect(typeof result.data.put).toBe('function');
        expect(typeof result.data.delete).toBe('function');
        expect(result.message).toBe('REST client created successfully');
      });
    });

    describe('createGraphQLClient', () => {
      const mockConfig = {
        id: 'graphql-1',
        name: 'GraphQL API',
        type: 'graphql' as const,
        baseUrl: 'https://api.example.com/graphql',
        rateLimit: { requests: 50, windowMs: 60000 },
        retryConfig: { maxRetries: 2, backoffMs: 500 },
        isActive: true,
      };

      it('should create GraphQL client successfully', async () => {
        const result = await externalAPIService.createGraphQLClient(mockConfig);

        expect(result.success).toBe(true);
        expect(result.data).toBeDefined();
        expect(typeof result.data.query).toBe('function');
        expect(typeof result.data.mutation).toBe('function');
        expect(result.message).toBe('GraphQL client created successfully');
      });
    });

    describe('setupWebhookHandler', () => {
      it('should setup webhook handler successfully', async () => {
        mockPrisma.source.update.mockResolvedValue({});

        const result = await externalAPIService.setupWebhookHandler(
          'source-1',
          'https://example.com/webhook',
          'secret-key'
        );

        expect(result.success).toBe(true);
        expect(result.message).toBe('Webhook handler configured successfully');

        expect(mockPrisma.source.update).toHaveBeenCalledWith({
          where: { id: 'source-1' },
          data: { updatedAt: expect.any(Date) },
        });
      });
    });

    describe('processWebhook', () => {
      const mockWebhookPayload = {
        event: 'opportunity.created',
        data: mockOpportunity,
        timestamp: new Date(),
        source: 'devfolio',
      };

      it('should process opportunity creation webhook', async () => {
        mockPrisma.opportunity.upsert.mockResolvedValue({});

        const result =
          await externalAPIService.processWebhook(mockWebhookPayload);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Webhook processed successfully');
      });

      it('should process opportunity deletion webhook', async () => {
        const deletionPayload = {
          event: 'opportunity.deleted',
          data: { id: 'opp-123' },
          timestamp: new Date(),
          source: 'devfolio',
        };

        mockPrisma.opportunity.updateMany.mockResolvedValue({ count: 1 });

        const result = await externalAPIService.processWebhook(deletionPayload);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Webhook processed successfully');

        expect(mockPrisma.opportunity.updateMany).toHaveBeenCalledWith({
          where: { externalUrl: { contains: 'opp-123' } },
          data: { isActive: false, updatedAt: expect.any(Date) },
        });
      });

      it('should handle unknown webhook events', async () => {
        const unknownPayload = {
          event: 'unknown.event',
          data: {},
          timestamp: new Date(),
          source: 'unknown',
        };

        const result = await externalAPIService.processWebhook(unknownPayload);

        expect(result.success).toBe(true);
        expect(result.message).toBe('Webhook processed successfully');
      });
    });

    describe('createSyncSchedule', () => {
      it('should create sync schedule successfully', async () => {
        const result = await externalAPIService.createSyncSchedule(
          'source-1',
          'daily'
        );

        expect(result.success).toBe(true);
        expect(result.data?.sourceId).toBe('source-1');
        expect(result.data?.frequency).toBe('daily');
        expect(result.data?.isActive).toBe(true);
        expect(result.data?.nextRun).toBeInstanceOf(Date);
        expect(result.message).toBe('Sync schedule created successfully');
      });
    });

    describe('executeScheduledSync', () => {
      it('should execute scheduled sync for eligible sources', async () => {
        const oldDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
        mockPrisma.source.findMany.mockResolvedValue([
          {
            id: 'source-1',
            isActive: true,
            scrapeFrequencyHours: 24,
            lastScrapedAt: oldDate,
          },
          {
            id: 'source-2',
            isActive: true,
            scrapeFrequencyHours: 24,
            lastScrapedAt: new Date(), // Recent, shouldn't sync
          },
        ]);

        const result = await externalAPIService.executeScheduledSync();

        expect(result.success).toBe(true);
        expect(result.data?.processed).toBe(1);
        expect(result.message).toBe('Processed 1 scheduled syncs');
      });
    });

    describe('monitorAPIHealth', () => {
      it('should monitor API health successfully', async () => {
        mockPrisma.source.findMany.mockResolvedValue([
          {
            id: 'source-1',
            isActive: true,
            url: 'https://api.example.com',
          },
        ]);

        const result = await externalAPIService.monitorAPIHealth();

        expect(result.success).toBe(true);
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.message).toBe('API health monitoring completed');
      });
    });

    describe('getAPIHealthStatus', () => {
      it('should return all health statuses when no ID provided', async () => {
        const result = await externalAPIService.getAPIHealthStatus();

        expect(result.success).toBe(true);
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.message).toBe(
          'All API health statuses retrieved successfully'
        );
      });

      it('should return error for non-existent API ID', async () => {
        const result =
          await externalAPIService.getAPIHealthStatus('non-existent');

        expect(result.success).toBe(false);
        expect(result.error).toBe('API health status not found');
      });
    });

    describe('syncFromExternalAPIs', () => {
      it('should sync from multiple external APIs', async () => {
        const result = await externalAPIService.syncFromExternalAPIs();

        expect(result.success).toBe(true);
        expect(result.data?.synced).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(result.data?.errors)).toBe(true);
        expect(result.message).toContain('Synced');
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete data aggregation workflow', async () => {
      // Mock source data
      mockPrisma.source.findUnique.mockResolvedValue({
        id: 'source-1',
        isActive: true,
        url: 'https://example.com',
      });

      // Mock no duplicates found
      mockPrisma.opportunity.findMany.mockResolvedValue([]);
      mockPrisma.opportunity.create.mockResolvedValue({});

      // Start scraping job
      const scrapingResult = await scrapingService.startScrapingJob('source-1');
      expect(scrapingResult.success).toBe(true);

      // Check for duplicates
      const duplicateResult =
        await dataQualityService.detectDuplicates(mockOpportunity);
      expect(duplicateResult.success).toBe(true);
      expect(duplicateResult.data?.isDuplicate).toBe(false);

      // Standardize data
      const standardizeResult =
        await dataQualityService.standardizeOpportunity(mockOpportunity);
      expect(standardizeResult.success).toBe(true);

      // Calculate quality score
      const qualityResult =
        await dataQualityService.calculateQualityScore(mockOpportunity);
      expect(qualityResult.success).toBe(true);
      expect(qualityResult.data?.overall).toBeGreaterThan(0.5);

      // Check for fraud
      const fraudResult = await dataQualityService.detectFraud(mockOpportunity);
      expect(fraudResult.success).toBe(true);
      expect(fraudResult.data?.isSuspicious).toBe(false);
    });

    it('should handle data quality issues in pipeline', async () => {
      const lowQualityOpportunity = {
        ...mockOpportunity,
        title: 'Guaranteed Easy Money!!!',
        description: '',
        requirements: { skills: [], eligibility: [] },
        externalUrl: 'https://bit.ly/suspicious',
        timeline: {
          applicationDeadline: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours
        },
      };

      // Check quality score
      const qualityResult = await dataQualityService.calculateQualityScore(
        lowQualityOpportunity
      );
      expect(qualityResult.success).toBe(true);
      expect(qualityResult.data?.overall).toBeLessThan(0.6);

      // Check for fraud
      const fraudResult = await dataQualityService.detectFraud(
        lowQualityOpportunity
      );
      expect(fraudResult.success).toBe(true);
      expect(fraudResult.data?.isSuspicious).toBe(true);
      expect(fraudResult.data?.flags.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection failures', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.source.findUnique.mockRejectedValue(dbError);

      const result = await scrapingService.startScrapingJob('source-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to start scraping job');
    });

    it('should handle malformed opportunity data', async () => {
      const malformedOpportunity = {
        title: '', // Empty title
        timeline: {
          applicationDeadline: null, // Invalid date
        },
        externalUrl: 'not-a-url', // Invalid URL
      } as any;

      const qualityResult =
        await dataQualityService.calculateQualityScore(malformedOpportunity);
      expect(qualityResult.success).toBe(false);
      expect(qualityResult.error).toBe('Failed to calculate quality score');
    });

    it('should handle network timeouts in external API calls', async () => {
      const config = {
        id: 'timeout-api',
        name: 'Timeout API',
        type: 'rest' as const,
        baseUrl: 'https://timeout.example.com',
        rateLimit: { requests: 10, windowMs: 60000 },
        retryConfig: { maxRetries: 1, backoffMs: 100 },
        isActive: true,
      };

      // Mock fetch to simulate timeout
      global.fetch = jest.fn().mockRejectedValue(new Error('Network timeout'));

      const clientResult = await externalAPIService.createRESTClient(config);
      expect(clientResult.success).toBe(true);

      // Attempting to use the client should handle the timeout
      try {
        await clientResult.data.get('/test');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle rate limiting correctly', async () => {
      const config = {
        id: 'rate-limited-api',
        name: 'Rate Limited API',
        type: 'rest' as const,
        baseUrl: 'https://api.example.com',
        rateLimit: { requests: 1, windowMs: 60000 }, // Very restrictive
        retryConfig: { maxRetries: 0, backoffMs: 100 },
        isActive: true,
      };

      const clientResult = await externalAPIService.createRESTClient(config);
      expect(clientResult.success).toBe(true);

      // Mock successful first request
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'success' }),
      } as any);

      // First request should succeed
      await clientResult.data.get('/test');

      // Second immediate request should be rate limited
      try {
        await clientResult.data.get('/test');
      } catch (error) {
        expect((error as Error).message).toContain('Rate limit exceeded');
      }
    });
  });
});
