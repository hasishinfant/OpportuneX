import { PrismaClient } from '@prisma/client';
import { advancedAnalyticsService } from '../lib/services/advanced-analytics.service';

// Mock Prisma Client
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    userSearch: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    userFavorite: {
      count: jest.fn(),
    },
    roadmap: {
      count: jest.fn(),
    },
    opportunity: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  return {
    PrismaClient: jest.fn(() => mockPrismaClient),
  };
});

describe('AdvancedAnalyticsService', () => {
  let prisma: any;

  beforeEach(() => {
    prisma = new PrismaClient();
    jest.clearAllMocks();
  });

  describe('getDashboardMetrics', () => {
    it('should retrieve comprehensive dashboard metrics', async () => {
      // Mock data
      const mockDate = new Date('2024-01-01');

      prisma.userSearch.count.mockResolvedValue(100);
      prisma.userFavorite.count.mockResolvedValue(50);
      prisma.roadmap.count.mockResolvedValue(10);
      prisma.user.count.mockResolvedValue(200);
      prisma.userSearch.groupBy.mockResolvedValue([
        { userId: 'user1' },
        { userId: 'user2' },
      ]);
      prisma.userSearch.findMany.mockResolvedValue([
        { createdAt: mockDate, query: 'test search' },
      ]);
      prisma.opportunity.count.mockResolvedValue(30);
      prisma.opportunity.groupBy.mockResolvedValue([
        { type: 'hackathon', _count: { id: 15 } },
        { type: 'internship', _count: { id: 10 } },
      ]);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.user.groupBy.mockResolvedValue([
        { tier: 2, _count: { id: 100 } },
        { tier: 3, _count: { id: 100 } },
      ]);

      const result = await advancedAnalyticsService.getDashboardMetrics();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.userEngagement).toBeDefined();
      expect(result.data?.opportunityAnalytics).toBeDefined();
      expect(result.data?.platformUsage).toBeDefined();
      expect(result.data?.insights).toBeDefined();
    });

    it('should handle date range filtering', async () => {
      const dateRange = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      prisma.userSearch.count.mockResolvedValue(50);
      prisma.userFavorite.count.mockResolvedValue(25);
      prisma.roadmap.count.mockResolvedValue(5);
      prisma.user.count.mockResolvedValue(100);
      prisma.userSearch.groupBy.mockResolvedValue([]);
      prisma.userSearch.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(15);
      prisma.opportunity.groupBy.mockResolvedValue([]);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.user.groupBy.mockResolvedValue([]);

      const result = await advancedAnalyticsService.getDashboardMetrics(
        undefined,
        dateRange
      );

      expect(result.success).toBe(true);
      expect(prisma.userSearch.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: dateRange.start,
              lte: dateRange.end,
            }),
          }),
        })
      );
    });

    it('should handle errors gracefully', async () => {
      prisma.userSearch.count.mockRejectedValue(new Error('Database error'));

      const result = await advancedAnalyticsService.getDashboardMetrics();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to retrieve dashboard metrics');
    });
  });

  describe('exportAnalytics', () => {
    it('should export analytics as JSON', async () => {
      prisma.userSearch.count.mockResolvedValue(100);
      prisma.userFavorite.count.mockResolvedValue(50);
      prisma.roadmap.count.mockResolvedValue(10);
      prisma.user.count.mockResolvedValue(200);
      prisma.userSearch.groupBy.mockResolvedValue([]);
      prisma.userSearch.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(30);
      prisma.opportunity.groupBy.mockResolvedValue([]);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.user.groupBy.mockResolvedValue([]);

      const result = await advancedAnalyticsService.exportAnalytics({
        format: 'json',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        metrics: ['all'],
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(typeof result.data).toBe('string');

      // Verify it's valid JSON
      const parsed = JSON.parse(result.data!);
      expect(parsed).toHaveProperty('userEngagement');
      expect(parsed).toHaveProperty('opportunityAnalytics');
    });

    it('should export analytics as CSV', async () => {
      prisma.userSearch.count.mockResolvedValue(100);
      prisma.userFavorite.count.mockResolvedValue(50);
      prisma.roadmap.count.mockResolvedValue(10);
      prisma.user.count.mockResolvedValue(200);
      prisma.userSearch.groupBy.mockResolvedValue([]);
      prisma.userSearch.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(30);
      prisma.opportunity.groupBy.mockResolvedValue([]);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.user.groupBy.mockResolvedValue([]);

      const result = await advancedAnalyticsService.exportAnalytics({
        format: 'csv',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        metrics: ['all'],
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data).toContain('User Engagement Metrics');
      expect(result.data).toContain('Opportunity Analytics');
    });

    it('should handle export errors', async () => {
      prisma.userSearch.count.mockRejectedValue(new Error('Export error'));

      const result = await advancedAnalyticsService.exportAnalytics({
        format: 'json',
        dateRange: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31'),
        },
        metrics: ['all'],
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to export analytics');
    });
  });

  describe('User Engagement Metrics', () => {
    it('should calculate engagement rate correctly', async () => {
      prisma.user.count.mockResolvedValue(100);
      prisma.userSearch.count.mockResolvedValue(50);
      prisma.userFavorite.count.mockResolvedValue(25);
      prisma.roadmap.count.mockResolvedValue(5);
      prisma.userSearch.groupBy.mockResolvedValue([
        { userId: 'user1' },
        { userId: 'user2' },
        { userId: 'user3' },
      ]);
      prisma.userSearch.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(20);
      prisma.opportunity.groupBy.mockResolvedValue([]);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.user.groupBy.mockResolvedValue([]);

      const result = await advancedAnalyticsService.getDashboardMetrics();

      expect(result.success).toBe(true);
      expect(result.data?.userEngagement.engagementRate).toBeGreaterThanOrEqual(
        0
      );
      expect(result.data?.userEngagement.engagementRate).toBeLessThanOrEqual(
        100
      );
    });

    it('should track search trends over time', async () => {
      const mockSearches = [
        { createdAt: new Date('2024-01-01'), query: 'test1' },
        { createdAt: new Date('2024-01-02'), query: 'test2' },
        { createdAt: new Date('2024-01-03'), query: 'test3' },
      ];

      prisma.userSearch.count.mockResolvedValue(3);
      prisma.userFavorite.count.mockResolvedValue(1);
      prisma.roadmap.count.mockResolvedValue(0);
      prisma.user.count.mockResolvedValue(10);
      prisma.userSearch.groupBy.mockResolvedValue([]);
      prisma.userSearch.findMany.mockResolvedValue(mockSearches);
      prisma.opportunity.count.mockResolvedValue(5);
      prisma.opportunity.groupBy.mockResolvedValue([]);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.user.groupBy.mockResolvedValue([]);

      const result = await advancedAnalyticsService.getDashboardMetrics();

      expect(result.success).toBe(true);
      expect(result.data?.userEngagement.searchTrends).toBeDefined();
      expect(Array.isArray(result.data?.userEngagement.searchTrends)).toBe(
        true
      );
    });
  });

  describe('Opportunity Analytics', () => {
    it('should calculate success rate correctly', async () => {
      prisma.userSearch.count.mockResolvedValue(10);
      prisma.userFavorite.count.mockResolvedValue(30);
      prisma.roadmap.count.mockResolvedValue(2);
      prisma.user.count.mockResolvedValue(50);
      prisma.userSearch.groupBy.mockResolvedValue([]);
      prisma.userSearch.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(100);
      prisma.opportunity.groupBy.mockResolvedValue([
        { type: 'hackathon', _count: { id: 50 } },
        { type: 'internship', _count: { id: 50 } },
      ]);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.user.groupBy.mockResolvedValue([]);

      const result = await advancedAnalyticsService.getDashboardMetrics();

      expect(result.success).toBe(true);
      expect(result.data?.opportunityAnalytics.successRate).toBeDefined();
      expect(
        result.data?.opportunityAnalytics.successRate
      ).toBeGreaterThanOrEqual(0);
    });

    it('should track opportunities by type', async () => {
      prisma.userSearch.count.mockResolvedValue(10);
      prisma.userFavorite.count.mockResolvedValue(5);
      prisma.roadmap.count.mockResolvedValue(1);
      prisma.user.count.mockResolvedValue(20);
      prisma.userSearch.groupBy.mockResolvedValue([]);
      prisma.userSearch.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(30);
      prisma.opportunity.groupBy.mockResolvedValue([
        { type: 'hackathon', _count: { id: 10 } },
        { type: 'internship', _count: { id: 15 } },
        { type: 'workshop', _count: { id: 5 } },
      ]);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.user.groupBy.mockResolvedValue([]);

      const result = await advancedAnalyticsService.getDashboardMetrics();

      expect(result.success).toBe(true);
      expect(result.data?.opportunityAnalytics.viewsByType).toBeDefined();
      expect(result.data?.opportunityAnalytics.viewsByType.length).toBe(3);
    });
  });

  describe('Platform Usage Statistics', () => {
    it('should track new users over different periods', async () => {
      prisma.user.count
        .mockResolvedValueOnce(500) // total users
        .mockResolvedValueOnce(5) // new today
        .mockResolvedValueOnce(25) // new this week
        .mockResolvedValueOnce(100); // new this month

      prisma.userSearch.count.mockResolvedValue(50);
      prisma.userFavorite.count.mockResolvedValue(25);
      prisma.roadmap.count.mockResolvedValue(10);
      prisma.userSearch.groupBy.mockResolvedValue([]);
      prisma.userSearch.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(40);
      prisma.opportunity.groupBy.mockResolvedValue([]);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.user.groupBy.mockResolvedValue([]);

      const result = await advancedAnalyticsService.getDashboardMetrics();

      expect(result.success).toBe(true);
      expect(result.data?.platformUsage.totalUsers).toBe(500);
      expect(result.data?.platformUsage.newUsersToday).toBe(5);
      expect(result.data?.platformUsage.newUsersWeek).toBe(25);
      expect(result.data?.platformUsage.newUsersMonth).toBe(100);
    });

    it('should track users by tier', async () => {
      prisma.userSearch.count.mockResolvedValue(10);
      prisma.userFavorite.count.mockResolvedValue(5);
      prisma.roadmap.count.mockResolvedValue(2);
      prisma.user.count.mockResolvedValue(200);
      prisma.userSearch.groupBy.mockResolvedValue([]);
      prisma.userSearch.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(20);
      prisma.opportunity.groupBy.mockResolvedValue([]);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.user.groupBy.mockResolvedValue([
        { tier: 2, _count: { id: 120 } },
        { tier: 3, _count: { id: 80 } },
      ]);

      const result = await advancedAnalyticsService.getDashboardMetrics();

      expect(result.success).toBe(true);
      expect(result.data?.platformUsage.usersByTier).toBeDefined();
      expect(result.data?.platformUsage.usersByTier.length).toBe(2);
    });
  });

  describe('Personalized Insights', () => {
    it('should generate recommendations based on metrics', async () => {
      prisma.userSearch.count.mockResolvedValue(100);
      prisma.userFavorite.count.mockResolvedValue(50);
      prisma.roadmap.count.mockResolvedValue(10);
      prisma.user.count
        .mockResolvedValueOnce(200)
        .mockResolvedValueOnce(150)
        .mockResolvedValueOnce(180);
      prisma.userSearch.groupBy.mockResolvedValue([]);
      prisma.userSearch.findMany.mockResolvedValue([
        { query: 'machine learning', createdAt: new Date() },
        { query: 'web development', createdAt: new Date() },
      ]);
      prisma.opportunity.count.mockResolvedValue(30);
      prisma.opportunity.groupBy.mockResolvedValue([]);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.user.groupBy.mockResolvedValue([]);

      const result = await advancedAnalyticsService.getDashboardMetrics();

      expect(result.success).toBe(true);
      expect(result.data?.insights.recommendations).toBeDefined();
      expect(Array.isArray(result.data?.insights.recommendations)).toBe(true);
    });

    it('should provide growth predictions', async () => {
      prisma.userSearch.count.mockResolvedValue(100);
      prisma.userFavorite.count.mockResolvedValue(50);
      prisma.roadmap.count.mockResolvedValue(10);
      prisma.user.count.mockResolvedValue(200);
      prisma.userSearch.groupBy.mockResolvedValue([]);
      prisma.userSearch.findMany.mockResolvedValue([]);
      prisma.opportunity.count.mockResolvedValue(30);
      prisma.opportunity.groupBy.mockResolvedValue([]);
      prisma.opportunity.findMany.mockResolvedValue([]);
      prisma.user.groupBy.mockResolvedValue([]);

      const result = await advancedAnalyticsService.getDashboardMetrics();

      expect(result.success).toBe(true);
      expect(result.data?.insights.predictions).toBeDefined();
      expect(
        result.data?.insights.predictions.nextWeekUsers
      ).toBeGreaterThanOrEqual(0);
      expect(
        result.data?.insights.predictions.nextWeekSearches
      ).toBeGreaterThanOrEqual(0);
      expect(typeof result.data?.insights.predictions.growthRate).toBe(
        'number'
      );
    });
  });
});
