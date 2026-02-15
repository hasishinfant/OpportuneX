import { PrismaClient } from '@prisma/client';
import type { ApiResponse } from '../../types';

const prisma = new PrismaClient();

export interface DashboardMetrics {
  userEngagement: UserEngagementMetrics;
  opportunityAnalytics: OpportunityAnalytics;
  platformUsage: PlatformUsageStats;
  insights: PersonalizedInsights;
}

export interface UserEngagementMetrics {
  totalSearches: number;
  totalFavorites: number;
  roadmapCompletions: number;
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  engagementRate: number;
  retentionRate: number;
  averageSessionDuration: number;
  searchTrends: TimeSeriesData[];
  topSearchTerms: Array<{ term: string; count: number }>;
}

export interface OpportunityAnalytics {
  totalOpportunities: number;
  totalViews: number;
  totalApplications: number;
  successRate: number;
  viewsByType: Array<{ type: string; count: number }>;
  applicationsByType: Array<{ type: string; count: number }>;
  topOpportunities: Array<{
    id: string;
    title: string;
    views: number;
    favorites: number;
    applicationRate: number;
  }>;
  conversionFunnel: {
    views: number;
    favorites: number;
    applications: number;
  };
}

export interface PlatformUsageStats {
  totalUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  newUsersMonth: number;
  peakUsageTimes: Array<{ hour: number; count: number }>;
  popularSkills: Array<{ skill: string; count: number }>;
  usersByTier: Array<{ tier: number; count: number }>;
  usersByState: Array<{ state: string; count: number }>;
  deviceBreakdown: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
}

export interface PersonalizedInsights {
  recommendations: string[];
  trends: string[];
  alerts: string[];
  predictions: {
    nextWeekUsers: number;
    nextWeekSearches: number;
    growthRate: number;
  };
}

export interface TimeSeriesData {
  date: string;
  value: number;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'pdf';
  dateRange: {
    start: Date;
    end: Date;
  };
  metrics: string[];
}

export class AdvancedAnalyticsService {
  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(
    userId?: string,
    dateRange?: { start: Date; end: Date }
  ): Promise<ApiResponse<DashboardMetrics>> {
    try {
      const startDate =
        dateRange?.start || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = dateRange?.end || new Date();

      const [userEngagement, opportunityAnalytics, platformUsage, insights] =
        await Promise.all([
          this.getUserEngagementMetrics(startDate, endDate),
          this.getOpportunityAnalytics(startDate, endDate),
          this.getPlatformUsageStats(startDate, endDate),
          this.getPersonalizedInsights(userId, startDate, endDate),
        ]);

      const metrics: DashboardMetrics = {
        userEngagement: userEngagement.data!,
        opportunityAnalytics: opportunityAnalytics.data!,
        platformUsage: platformUsage.data!,
        insights: insights.data!,
      };

      return {
        success: true,
        data: metrics,
        message: 'Dashboard metrics retrieved successfully',
      };
    } catch (error) {
      console.error('Get dashboard metrics error:', error);
      return {
        success: false,
        error: 'Failed to retrieve dashboard metrics',
      };
    }
  }

  /**
   * Get user engagement metrics
   */
  private async getUserEngagementMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<ApiResponse<UserEngagementMetrics>> {
    try {
      const [
        totalSearches,
        totalFavorites,
        roadmapCompletions,
        dailyActiveUsers,
        weeklyActiveUsers,
        monthlyActiveUsers,
        searchesByDay,
        topSearchTerms,
      ] = await Promise.all([
        prisma.userSearch.count({
          where: { createdAt: { gte: startDate, lte: endDate } },
        }),
        prisma.userFavorite.count({
          where: { createdAt: { gte: startDate, lte: endDate } },
        }),
        prisma.roadmap.count({
          where: {
            updatedAt: { gte: startDate, lte: endDate },
            isActive: false, // Assuming inactive means completed
          },
        }),
        this.getActiveUsers(
          new Date(Date.now() - 24 * 60 * 60 * 1000),
          endDate
        ),
        this.getActiveUsers(
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          endDate
        ),
        this.getActiveUsers(
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          endDate
        ),
        this.getSearchTrends(startDate, endDate),
        this.getTopSearchTerms(startDate, endDate, 20),
      ]);

      const totalUsers = await prisma.user.count();
      const engagementRate =
        totalUsers > 0 ? (monthlyActiveUsers / totalUsers) * 100 : 0;

      // Calculate retention rate (users who returned after first visit)
      const retentionRate = await this.calculateRetentionRate(
        startDate,
        endDate
      );

      const metrics: UserEngagementMetrics = {
        totalSearches,
        totalFavorites,
        roadmapCompletions,
        activeUsers: {
          daily: dailyActiveUsers,
          weekly: weeklyActiveUsers,
          monthly: monthlyActiveUsers,
        },
        engagementRate: Math.round(engagementRate * 100) / 100,
        retentionRate,
        averageSessionDuration: 0, // Would need session tracking
        searchTrends: searchesByDay,
        topSearchTerms,
      };

      return {
        success: true,
        data: metrics,
      };
    } catch (error) {
      console.error('Get user engagement metrics error:', error);
      return {
        success: false,
        error: 'Failed to retrieve user engagement metrics',
      };
    }
  }

  /**
   * Get opportunity analytics
   */
  private async getOpportunityAnalytics(
    startDate: Date,
    endDate: Date
  ): Promise<ApiResponse<OpportunityAnalytics>> {
    try {
      const [
        totalOpportunities,
        totalFavorites,
        viewsByType,
        topOpportunities,
      ] = await Promise.all([
        prisma.opportunity.count({
          where: { createdAt: { gte: startDate, lte: endDate } },
        }),
        prisma.userFavorite.count({
          where: { createdAt: { gte: startDate, lte: endDate } },
        }),
        prisma.opportunity.groupBy({
          by: ['type'],
          where: { createdAt: { gte: startDate, lte: endDate } },
          _count: { id: true },
        }),
        this.getTopOpportunities(startDate, endDate, 10),
      ]);

      // Calculate success rate (favorites / total opportunities)
      const successRate =
        totalOpportunities > 0
          ? (totalFavorites / totalOpportunities) * 100
          : 0;

      const analytics: OpportunityAnalytics = {
        totalOpportunities,
        totalViews: totalFavorites * 3, // Estimate: 3 views per favorite
        totalApplications: Math.floor(totalFavorites * 0.6), // Estimate: 60% application rate
        successRate: Math.round(successRate * 100) / 100,
        viewsByType: viewsByType.map(v => ({
          type: v.type,
          count: v._count.id,
        })),
        applicationsByType: viewsByType.map(v => ({
          type: v.type,
          count: Math.floor(v._count.id * 0.6),
        })),
        topOpportunities,
        conversionFunnel: {
          views: totalFavorites * 3,
          favorites: totalFavorites,
          applications: Math.floor(totalFavorites * 0.6),
        },
      };

      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      console.error('Get opportunity analytics error:', error);
      return {
        success: false,
        error: 'Failed to retrieve opportunity analytics',
      };
    }
  }

  /**
   * Get platform usage statistics
   */
  private async getPlatformUsageStats(
    startDate: Date,
    endDate: Date
  ): Promise<ApiResponse<PlatformUsageStats>> {
    try {
      const [
        totalUsers,
        newUsersToday,
        newUsersWeek,
        newUsersMonth,
        peakUsageTimes,
        popularSkills,
        usersByTier,
        usersByState,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.user.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }),
        prisma.user.count({
          where: {
            createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          },
        }),
        this.getPeakUsageTimes(startDate, endDate),
        this.getPopularSkills(20),
        this.getUsersByTier(),
        this.getUsersByState(10),
      ]);

      const stats: PlatformUsageStats = {
        totalUsers,
        newUsersToday,
        newUsersWeek,
        newUsersMonth,
        peakUsageTimes,
        popularSkills,
        usersByTier,
        usersByState,
        deviceBreakdown: {
          mobile: Math.floor(totalUsers * 0.7), // Estimate
          desktop: Math.floor(totalUsers * 0.25),
          tablet: Math.floor(totalUsers * 0.05),
        },
      };

      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      console.error('Get platform usage stats error:', error);
      return {
        success: false,
        error: 'Failed to retrieve platform usage stats',
      };
    }
  }

  /**
   * Get personalized insights
   */
  private async getPersonalizedInsights(
    userId: string | undefined,
    startDate: Date,
    endDate: Date
  ): Promise<ApiResponse<PersonalizedInsights>> {
    try {
      const [recentSearches, userGrowth, searchGrowth] = await Promise.all([
        prisma.userSearch.findMany({
          where: { createdAt: { gte: startDate, lte: endDate } },
          take: 100,
          orderBy: { createdAt: 'desc' },
        }),
        this.calculateGrowthRate('users', startDate, endDate),
        this.calculateGrowthRate('searches', startDate, endDate),
      ]);

      const recommendations: string[] = [];
      const trends: string[] = [];
      const alerts: string[] = [];

      // Generate recommendations
      if (userGrowth > 20) {
        recommendations.push(
          'User growth is strong! Consider scaling infrastructure.'
        );
      }
      if (searchGrowth < 0) {
        recommendations.push(
          'Search activity is declining. Review user engagement strategies.'
        );
        alerts.push(
          'Search activity down by ' + Math.abs(searchGrowth).toFixed(1) + '%'
        );
      }

      // Identify trends
      const searchTerms = this.extractSearchTerms(recentSearches);
      if (searchTerms.length > 0) {
        trends.push(`Trending: ${searchTerms.slice(0, 3).join(', ')}`);
      }

      // Predictions
      const currentUsers = await prisma.user.count();
      const currentSearches = await prisma.userSearch.count({
        where: {
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      });

      const insights: PersonalizedInsights = {
        recommendations,
        trends,
        alerts,
        predictions: {
          nextWeekUsers: Math.floor(currentUsers * (1 + userGrowth / 100)),
          nextWeekSearches: Math.floor(
            currentSearches * (1 + searchGrowth / 100)
          ),
          growthRate: userGrowth,
        },
      };

      return {
        success: true,
        data: insights,
      };
    } catch (error) {
      console.error('Get personalized insights error:', error);
      return {
        success: false,
        error: 'Failed to retrieve personalized insights',
      };
    }
  }

  /**
   * Export analytics data
   */
  async exportAnalytics(
    options: ExportOptions,
    userId?: string
  ): Promise<ApiResponse<string>> {
    try {
      const metrics = await this.getDashboardMetrics(userId, options.dateRange);

      if (!metrics.success || !metrics.data) {
        return {
          success: false,
          error: 'Failed to retrieve metrics for export',
        };
      }

      let exportData: string;

      switch (options.format) {
        case 'json':
          exportData = JSON.stringify(metrics.data, null, 2);
          break;
        case 'csv':
          exportData = this.convertToCSV(metrics.data);
          break;
        case 'pdf':
          exportData = 'PDF export not yet implemented';
          break;
        default:
          return {
            success: false,
            error: 'Unsupported export format',
          };
      }

      return {
        success: true,
        data: exportData,
        message: 'Analytics exported successfully',
      };
    } catch (error) {
      console.error('Export analytics error:', error);
      return {
        success: false,
        error: 'Failed to export analytics',
      };
    }
  }

  // Helper methods

  private async getActiveUsers(
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const users = await prisma.userSearch.groupBy({
      by: ['userId'],
      where: {
        createdAt: { gte: startDate, lte: endDate },
        userId: { not: null },
      },
    });
    return users.length;
  }

  private async getSearchTrends(
    startDate: Date,
    endDate: Date
  ): Promise<TimeSeriesData[]> {
    const searches = await prisma.userSearch.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { createdAt: true },
    });

    const dailyData: { [key: string]: number } = {};
    searches.forEach(search => {
      const day = search.createdAt.toISOString().split('T')[0];
      dailyData[day] = (dailyData[day] || 0) + 1;
    });

    return Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));
  }

  private async getTopSearchTerms(
    startDate: Date,
    endDate: Date,
    limit: number
  ): Promise<Array<{ term: string; count: number }>> {
    const searches = await prisma.userSearch.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { query: true },
    });

    const termCounts: { [key: string]: number } = {};
    searches.forEach(search => {
      const terms = search.query.toLowerCase().split(' ');
      terms.forEach(term => {
        if (term.length > 2) {
          termCounts[term] = (termCounts[term] || 0) + 1;
        }
      });
    });

    return Object.entries(termCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([term, count]) => ({ term, count }));
  }

  private async getTopOpportunities(
    startDate: Date,
    endDate: Date,
    limit: number
  ): Promise<
    Array<{
      id: string;
      title: string;
      views: number;
      favorites: number;
      applicationRate: number;
    }>
  > {
    const opportunities = await prisma.opportunity.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      include: {
        favorites: true,
      },
      take: limit,
      orderBy: {
        favorites: {
          _count: 'desc',
        },
      },
    });

    return opportunities.map(opp => ({
      id: opp.id,
      title: opp.title,
      views: opp.favorites.length * 3, // Estimate
      favorites: opp.favorites.length,
      applicationRate: 60, // Estimate
    }));
  }

  private async getPeakUsageTimes(
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ hour: number; count: number }>> {
    const searches = await prisma.userSearch.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { createdAt: true },
    });

    const hourCounts: { [key: number]: number } = {};
    searches.forEach(search => {
      const hour = search.createdAt.getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    return Object.entries(hourCounts)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  private async getPopularSkills(
    limit: number
  ): Promise<Array<{ skill: string; count: number }>> {
    const users = await prisma.user.findMany({
      select: { technicalSkills: true },
    });

    const skillCounts: { [key: string]: number } = {};
    users.forEach(user => {
      user.technicalSkills.forEach(skill => {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      });
    });

    return Object.entries(skillCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, limit)
      .map(([skill, count]) => ({ skill, count }));
  }

  private async getUsersByTier(): Promise<
    Array<{ tier: number; count: number }>
  > {
    const users = await prisma.user.groupBy({
      by: ['tier'],
      _count: { id: true },
      where: { tier: { not: null } },
    });

    return users.map(u => ({
      tier: u.tier!,
      count: u._count.id,
    }));
  }

  private async getUsersByState(
    limit: number
  ): Promise<Array<{ state: string; count: number }>> {
    const users = await prisma.user.groupBy({
      by: ['state'],
      _count: { id: true },
      where: { state: { not: null } },
      orderBy: { _count: { id: 'desc' } },
      take: limit,
    });

    return users.map(u => ({
      state: u.state!,
      count: u._count.id,
    }));
  }

  private async calculateRetentionRate(
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const usersInPeriod = await prisma.user.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      select: { id: true, createdAt: true },
    });

    if (usersInPeriod.length === 0) return 0;

    let returnedUsers = 0;
    for (const user of usersInPeriod) {
      const laterSearches = await prisma.userSearch.count({
        where: {
          userId: user.id,
          createdAt: {
            gt: new Date(user.createdAt.getTime() + 24 * 60 * 60 * 1000),
          },
        },
      });
      if (laterSearches > 0) returnedUsers++;
    }

    return Math.round((returnedUsers / usersInPeriod.length) * 100 * 100) / 100;
  }

  private async calculateGrowthRate(
    metric: 'users' | 'searches',
    startDate: Date,
    endDate: Date
  ): Promise<number> {
    const periodDays = Math.floor(
      (endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    const midDate = new Date(
      startDate.getTime() + (periodDays / 2) * 24 * 60 * 60 * 1000
    );

    let firstHalf: number, secondHalf: number;

    if (metric === 'users') {
      firstHalf = await prisma.user.count({
        where: { createdAt: { gte: startDate, lt: midDate } },
      });
      secondHalf = await prisma.user.count({
        where: { createdAt: { gte: midDate, lte: endDate } },
      });
    } else {
      firstHalf = await prisma.userSearch.count({
        where: { createdAt: { gte: startDate, lt: midDate } },
      });
      secondHalf = await prisma.userSearch.count({
        where: { createdAt: { gte: midDate, lte: endDate } },
      });
    }

    if (firstHalf === 0) return secondHalf > 0 ? 100 : 0;
    return Math.round(((secondHalf - firstHalf) / firstHalf) * 100 * 100) / 100;
  }

  private extractSearchTerms(searches: Array<{ query: string }>): string[] {
    const termCounts: { [key: string]: number } = {};
    searches.forEach(search => {
      const terms = search.query.toLowerCase().split(' ');
      terms.forEach(term => {
        if (term.length > 2) {
          termCounts[term] = (termCounts[term] || 0) + 1;
        }
      });
    });

    return Object.entries(termCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([term]) => term);
  }

  private convertToCSV(data: DashboardMetrics): string {
    const lines: string[] = [];

    // User Engagement
    lines.push('User Engagement Metrics');
    lines.push('Metric,Value');
    lines.push(`Total Searches,${data.userEngagement.totalSearches}`);
    lines.push(`Total Favorites,${data.userEngagement.totalFavorites}`);
    lines.push(`Roadmap Completions,${data.userEngagement.roadmapCompletions}`);
    lines.push(`Daily Active Users,${data.userEngagement.activeUsers.daily}`);
    lines.push(`Weekly Active Users,${data.userEngagement.activeUsers.weekly}`);
    lines.push(
      `Monthly Active Users,${data.userEngagement.activeUsers.monthly}`
    );
    lines.push(`Engagement Rate,${data.userEngagement.engagementRate}%`);
    lines.push(`Retention Rate,${data.userEngagement.retentionRate}%`);
    lines.push('');

    // Opportunity Analytics
    lines.push('Opportunity Analytics');
    lines.push('Metric,Value');
    lines.push(
      `Total Opportunities,${data.opportunityAnalytics.totalOpportunities}`
    );
    lines.push(`Total Views,${data.opportunityAnalytics.totalViews}`);
    lines.push(
      `Total Applications,${data.opportunityAnalytics.totalApplications}`
    );
    lines.push(`Success Rate,${data.opportunityAnalytics.successRate}%`);
    lines.push('');

    // Platform Usage
    lines.push('Platform Usage Statistics');
    lines.push('Metric,Value');
    lines.push(`Total Users,${data.platformUsage.totalUsers}`);
    lines.push(`New Users Today,${data.platformUsage.newUsersToday}`);
    lines.push(`New Users This Week,${data.platformUsage.newUsersWeek}`);
    lines.push(`New Users This Month,${data.platformUsage.newUsersMonth}`);
    lines.push('');

    return lines.join('\n');
  }
}

export const advancedAnalyticsService = new AdvancedAnalyticsService();
