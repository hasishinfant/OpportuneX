import { PrismaClient } from '@prisma/client';
import type { ApiResponse } from '../../types';

const prisma = new PrismaClient();

export interface UserAnalytics {
  userId: string;
  totalSearches: number;
  totalFavorites: number;
  mostSearchedTerms: Array<{ term: string; count: number }>;
  preferredOpportunityTypes: Array<{ type: string; count: number }>;
  searchFrequency: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  lastActiveDate: Date;
  registrationDate: Date;
  engagementScore: number;
}

export interface SearchAnalytics {
  query: string;
  timestamp: Date;
  resultCount: number;
  filters?: any;
  clickedResults?: string[];
}

export class AnalyticsService {
  /**
   * Track user search behavior
   */
  async trackSearch(
    userId: string,
    query: string,
    filters: any,
    resultCount: number
  ): Promise<ApiResponse<null>> {
    try {
      // Add to search history (already implemented in user service)
      await prisma.userSearch.create({
        data: {
          userId,
          query,
          filters,
          resultCount,
        },
      });

      return {
        success: true,
        message: 'Search tracked successfully',
      };
    } catch (error) {
      console.error('Track search error:', error);
      return {
        success: false,
        error: 'Failed to track search',
      };
    }
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(userId: string): Promise<ApiResponse<UserAnalytics>> {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          searches: {
            orderBy: { createdAt: 'desc' },
          },
          favorites: true,
        },
      });

      if (!user) {
        return {
          success: false,
          error: 'User not found',
        };
      }

      // Calculate analytics
      const totalSearches = user.searches.length;
      const totalFavorites = user.favorites.length;

      // Most searched terms
      const searchTerms: { [key: string]: number } = {};
      user.searches.forEach(search => {
        const terms = search.query.toLowerCase().split(' ');
        terms.forEach(term => {
          if (term.length > 2) {
            // Ignore short words
            searchTerms[term] = (searchTerms[term] || 0) + 1;
          }
        });
      });

      const mostSearchedTerms = Object.entries(searchTerms)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([term, count]) => ({ term, count }));

      // Search frequency
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const dailySearches = user.searches.filter(
        s => s.createdAt >= oneDayAgo
      ).length;
      const weeklySearches = user.searches.filter(
        s => s.createdAt >= oneWeekAgo
      ).length;
      const monthlySearches = user.searches.filter(
        s => s.createdAt >= oneMonthAgo
      ).length;

      // Engagement score (simple calculation)
      const daysSinceRegistration = Math.max(
        1,
        Math.floor(
          (now.getTime() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000)
        )
      );
      const engagementScore = Math.min(
        100,
        Math.floor(
          ((totalSearches * 2 + totalFavorites * 3) / daysSinceRegistration) *
            10
        )
      );

      // Last active date
      const lastActiveDate =
        user.searches.length > 0 ? user.searches[0].createdAt : user.createdAt;

      // Preferred opportunity types (from user preferences)
      const preferredOpportunityTypes = user.preferredOpportunityTypes.map(
        type => ({
          type,
          count: 1, // This could be enhanced with actual search/favorite data
        })
      );

      const analytics: UserAnalytics = {
        userId: user.id,
        totalSearches,
        totalFavorites,
        mostSearchedTerms,
        preferredOpportunityTypes,
        searchFrequency: {
          daily: dailySearches,
          weekly: weeklySearches,
          monthly: monthlySearches,
        },
        lastActiveDate,
        registrationDate: user.createdAt,
        engagementScore,
      };

      return {
        success: true,
        data: analytics,
        message: 'User analytics retrieved successfully',
      };
    } catch (error) {
      console.error('Get user analytics error:', error);
      return {
        success: false,
        error: 'Failed to retrieve user analytics',
      };
    }
  }

  /**
   * Get platform-wide analytics (admin only)
   */
  async getPlatformAnalytics(): Promise<ApiResponse<any>> {
    try {
      const [
        totalUsers,
        totalSearches,
        totalFavorites,
        activeUsersToday,
        activeUsersWeek,
        recentSearches,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.userSearch.count(),
        prisma.userFavorite.count(),
        prisma.userSearch.groupBy({
          by: ['userId'],
          where: {
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.userSearch.groupBy({
          by: ['userId'],
          where: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        }),
        prisma.userSearch.findMany({
          take: 100,
          orderBy: { createdAt: 'desc' },
          select: {
            query: true,
            createdAt: true,
            resultCount: true,
          },
        }),
      ]);

      // Top search terms
      const searchTerms: { [key: string]: number } = {};
      recentSearches.forEach(search => {
        const terms = search.query.toLowerCase().split(' ');
        terms.forEach(term => {
          if (term.length > 2) {
            searchTerms[term] = (searchTerms[term] || 0) + 1;
          }
        });
      });

      const topSearchTerms = Object.entries(searchTerms)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 20)
        .map(([term, count]) => ({ term, count }));

      const analytics = {
        overview: {
          totalUsers,
          totalSearches,
          totalFavorites,
          activeUsersToday: activeUsersToday.length,
          activeUsersWeek: activeUsersWeek.length,
        },
        topSearchTerms,
        searchTrends: {
          // This could be enhanced with time-series data
          recent: recentSearches.slice(0, 10),
        },
      };

      return {
        success: true,
        data: analytics,
        message: 'Platform analytics retrieved successfully',
      };
    } catch (error) {
      console.error('Get platform analytics error:', error);
      return {
        success: false,
        error: 'Failed to retrieve platform analytics',
      };
    }
  }

  /**
   * Track user engagement event
   */
  async trackEngagement(
    userId: string,
    eventType: 'search' | 'favorite' | 'profile_update' | 'login',
    metadata?: any
  ): Promise<ApiResponse<null>> {
    try {
      // For now, we'll just log the event
      // In a production system, you might want to store these in a separate events table
      console.log(`User engagement: ${userId} - ${eventType}`, metadata);

      return {
        success: true,
        message: 'Engagement tracked successfully',
      };
    } catch (error) {
      console.error('Track engagement error:', error);
      return {
        success: false,
        error: 'Failed to track engagement',
      };
    }
  }

  /**
   * Get user engagement trends
   */
  async getUserEngagementTrends(
    userId: string,
    days = 30
  ): Promise<ApiResponse<any>> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const searches = await prisma.userSearch.findMany({
        where: {
          userId,
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'asc' },
        select: {
          createdAt: true,
          query: true,
        },
      });

      // Group by day
      const dailyActivity: { [key: string]: number } = {};
      searches.forEach(search => {
        const day = search.createdAt.toISOString().split('T')[0];
        dailyActivity[day] = (dailyActivity[day] || 0) + 1;
      });

      const trends = Object.entries(dailyActivity)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, searches: count }));

      return {
        success: true,
        data: {
          trends,
          totalSearches: searches.length,
          averageDaily: searches.length / days,
        },
        message: 'User engagement trends retrieved successfully',
      };
    } catch (error) {
      console.error('Get user engagement trends error:', error);
      return {
        success: false,
        error: 'Failed to retrieve user engagement trends',
      };
    }
  }
}

export const analyticsService = new AnalyticsService();
