import { Prisma } from '@prisma/client';
import { prisma } from './database';

/**
 * Database Query Optimization Utilities
 * Provides optimized queries and performance monitoring for OpportuneX
 */

// Query performance monitoring
interface QueryMetrics {
  query: string;
  duration: number;
  timestamp: Date;
  params?: any;
}

class QueryPerformanceMonitor {
  private metrics: QueryMetrics[] = [];
  private readonly maxMetrics = 1000;

  logQuery(query: string, duration: number, params?: any) {
    this.metrics.push({
      query,
      duration,
      timestamp: new Date(),
      params,
    });

    // Keep only the most recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getSlowQueries(thresholdMs: number = 1000): QueryMetrics[] {
    return this.metrics.filter(m => m.duration > thresholdMs);
  }

  getAverageQueryTime(): number {
    if (this.metrics.length === 0) return 0;
    const total = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / this.metrics.length;
  }

  clearMetrics() {
    this.metrics = [];
  }
}

export const queryMonitor = new QueryPerformanceMonitor();

// Optimized query utilities
export class OptimizedQueries {
  /**
   * Get opportunities with optimized pagination and filtering
   */
  static async getOpportunities({
    page = 1,
    limit = 20,
    type,
    skills,
    location,
    organizerType,
    mode,
    isActive = true,
    userId,
  }: {
    page?: number;
    limit?: number;
    type?: string;
    skills?: string[];
    location?: string;
    organizerType?: string;
    mode?: string;
    isActive?: boolean;
    userId?: string;
  }) {
    const startTime = Date.now();
    const offset = (page - 1) * limit;

    try {
      // Build where clause dynamically
      const where: Prisma.OpportunityWhereInput = {
        isActive,
        ...(type && { type: type as any }),
        ...(organizerType && { organizerType: organizerType as any }),
        ...(mode && { mode: mode as any }),
        ...(location && {
          location: {
            contains: location,
            mode: 'insensitive',
          },
        }),
        ...(skills && skills.length > 0 && {
          requiredSkills: {
            hasSome: skills,
          },
        }),
        // Only show opportunities with future deadlines
        applicationDeadline: {
          gte: new Date(),
        },
      };

      // Execute optimized query with selected fields only
      const [opportunities, total] = await Promise.all([
        prisma.opportunity.findMany({
          where,
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            organizerName: true,
            organizerType: true,
            organizerLogo: true,
            requiredSkills: true,
            mode: true,
            location: true,
            duration: true,
            stipend: true,
            prizes: true,
            applicationDeadline: true,
            startDate: true,
            endDate: true,
            externalUrl: true,
            tags: true,
            qualityScore: true,
            createdAt: true,
            // Include favorite status if user is provided
            ...(userId && {
              favorites: {
                where: { userId },
                select: { id: true },
              },
            }),
          },
          orderBy: [
            { qualityScore: 'desc' },
            { applicationDeadline: 'asc' },
            { createdAt: 'desc' },
          ],
          skip: offset,
          take: limit,
        }),
        prisma.opportunity.count({ where }),
      ]);

      const duration = Date.now() - startTime;
      queryMonitor.logQuery('getOpportunities', duration, { page, limit, type, skills, location });

      return {
        opportunities: opportunities.map(opp => ({
          ...opp,
          isFavorite: userId ? opp.favorites?.length > 0 : false,
          favorites: undefined, // Remove from response
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      queryMonitor.logQuery('getOpportunities:ERROR', duration, { error: error.message });
      throw error;
    }
  }

  /**
   * Search opportunities with full-text search optimization
   */
  static async searchOpportunities({
    query,
    page = 1,
    limit = 20,
    filters = {},
    userId,
  }: {
    query: string;
    page?: number;
    limit?: number;
    filters?: any;
    userId?: string;
  }) {
    const startTime = Date.now();
    const offset = (page - 1) * limit;

    try {
      // Use PostgreSQL full-text search for better performance
      const searchQuery = query.trim().split(' ').join(' & ');
      
      const where: Prisma.OpportunityWhereInput = {
        isActive: true,
        applicationDeadline: { gte: new Date() },
        OR: [
          {
            title: {
              search: searchQuery,
            },
          },
          {
            description: {
              search: searchQuery,
            },
          },
          {
            requiredSkills: {
              hasSome: query.split(' '),
            },
          },
          {
            tags: {
              hasSome: query.split(' '),
            },
          },
        ],
        ...filters,
      };

      const [opportunities, total] = await Promise.all([
        prisma.opportunity.findMany({
          where,
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            organizerName: true,
            organizerType: true,
            organizerLogo: true,
            requiredSkills: true,
            mode: true,
            location: true,
            duration: true,
            stipend: true,
            prizes: true,
            applicationDeadline: true,
            startDate: true,
            endDate: true,
            externalUrl: true,
            tags: true,
            qualityScore: true,
            createdAt: true,
            ...(userId && {
              favorites: {
                where: { userId },
                select: { id: true },
              },
            }),
          },
          orderBy: [
            { qualityScore: 'desc' },
            { applicationDeadline: 'asc' },
          ],
          skip: offset,
          take: limit,
        }),
        prisma.opportunity.count({ where }),
      ]);

      const duration = Date.now() - startTime;
      queryMonitor.logQuery('searchOpportunities', duration, { query, page, limit });

      return {
        opportunities: opportunities.map(opp => ({
          ...opp,
          isFavorite: userId ? opp.favorites?.length > 0 : false,
          favorites: undefined,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      queryMonitor.logQuery('searchOpportunities:ERROR', duration, { error: error.message });
      throw error;
    }
  }

  /**
   * Get user profile with optimized relations
   */
  static async getUserProfile(userId: string) {
    const startTime = Date.now();

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          city: true,
          state: true,
          tier: true,
          institution: true,
          degree: true,
          year: true,
          cgpa: true,
          technicalSkills: true,
          domains: true,
          proficiencyLevel: true,
          preferredOpportunityTypes: true,
          preferredMode: true,
          maxDistance: true,
          emailNotifications: true,
          smsNotifications: true,
          inAppNotifications: true,
          notificationFrequency: true,
          notificationTypes: true,
          createdAt: true,
          updatedAt: true,
          // Get recent searches (last 10)
          searches: {
            select: {
              id: true,
              query: true,
              filters: true,
              resultCount: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
          // Get favorite opportunities count
          _count: {
            select: {
              favorites: true,
              notifications: {
                where: { isRead: false },
              },
            },
          },
        },
      });

      const duration = Date.now() - startTime;
      queryMonitor.logQuery('getUserProfile', duration, { userId });

      return user;
    } catch (error) {
      const duration = Date.now() - startTime;
      queryMonitor.logQuery('getUserProfile:ERROR', duration, { error: error.message });
      throw error;
    }
  }

  /**
   * Get personalized recommendations for user
   */
  static async getPersonalizedRecommendations(userId: string, limit: number = 10) {
    const startTime = Date.now();

    try {
      // Get user profile for personalization
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          technicalSkills: true,
          domains: true,
          preferredOpportunityTypes: true,
          preferredMode: true,
          city: true,
          state: true,
          proficiencyLevel: true,
        },
      });

      if (!user) {
        throw new Error('User not found');
      }

      // Build personalized where clause
      const where: Prisma.OpportunityWhereInput = {
        isActive: true,
        applicationDeadline: { gte: new Date() },
        AND: [
          // Match preferred opportunity types
          user.preferredOpportunityTypes.length > 0 ? {
            type: { in: user.preferredOpportunityTypes },
          } : {},
          // Match preferred mode
          user.preferredMode ? {
            mode: user.preferredMode,
          } : {},
          // Match skills or domains
          {
            OR: [
              user.technicalSkills.length > 0 ? {
                requiredSkills: { hasSome: user.technicalSkills },
              } : {},
              user.domains.length > 0 ? {
                tags: { hasSome: user.domains },
              } : {},
            ],
          },
        ],
      };

      const recommendations = await prisma.opportunity.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          type: true,
          organizerName: true,
          organizerType: true,
          organizerLogo: true,
          requiredSkills: true,
          mode: true,
          location: true,
          duration: true,
          stipend: true,
          prizes: true,
          applicationDeadline: true,
          startDate: true,
          endDate: true,
          externalUrl: true,
          tags: true,
          qualityScore: true,
          createdAt: true,
          favorites: {
            where: { userId },
            select: { id: true },
          },
        },
        orderBy: [
          { qualityScore: 'desc' },
          { applicationDeadline: 'asc' },
        ],
        take: limit,
      });

      const duration = Date.now() - startTime;
      queryMonitor.logQuery('getPersonalizedRecommendations', duration, { userId, limit });

      return recommendations.map(opp => ({
        ...opp,
        isFavorite: opp.favorites.length > 0,
        favorites: undefined,
      }));
    } catch (error) {
      const duration = Date.now() - startTime;
      queryMonitor.logQuery('getPersonalizedRecommendations:ERROR', duration, { error: error.message });
      throw error;
    }
  }

  /**
   * Batch update opportunities quality scores
   */
  static async updateQualityScores() {
    const startTime = Date.now();

    try {
      // Update quality scores based on various factors
      await prisma.$executeRaw`
        UPDATE opportunities 
        SET quality_score = (
          CASE 
            WHEN application_deadline > NOW() + INTERVAL '7 days' THEN 100
            WHEN application_deadline > NOW() + INTERVAL '3 days' THEN 80
            WHEN application_deadline > NOW() + INTERVAL '1 day' THEN 60
            ELSE 40
          END +
          CASE 
            WHEN array_length(required_skills, 1) > 0 THEN 20
            ELSE 0
          END +
          CASE 
            WHEN description IS NOT NULL AND length(description) > 100 THEN 15
            ELSE 0
          END +
          CASE 
            WHEN prizes IS NOT NULL AND array_length(prizes, 1) > 0 THEN 10
            ELSE 0
          END
        )
        WHERE is_active = true
      `;

      const duration = Date.now() - startTime;
      queryMonitor.logQuery('updateQualityScores', duration);

      return { success: true };
    } catch (error) {
      const duration = Date.now() - startTime;
      queryMonitor.logQuery('updateQualityScores:ERROR', duration, { error: error.message });
      throw error;
    }
  }

  /**
   * Get database performance statistics
   */
  static async getPerformanceStats() {
    const startTime = Date.now();

    try {
      const stats = await prisma.$queryRaw`
        SELECT 
          schemaname,
          tablename,
          attname,
          n_distinct,
          correlation
        FROM pg_stats 
        WHERE schemaname = 'public'
        ORDER BY tablename, attname
      `;

      const duration = Date.now() - startTime;
      queryMonitor.logQuery('getPerformanceStats', duration);

      return {
        stats,
        queryMetrics: {
          averageQueryTime: queryMonitor.getAverageQueryTime(),
          slowQueries: queryMonitor.getSlowQueries(500),
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      queryMonitor.logQuery('getPerformanceStats:ERROR', duration, { error: error.message });
      throw error;
    }
  }
}

// Database index recommendations
export const indexRecommendations = {
  /**
   * Create recommended indexes for optimal performance
   */
  async createOptimalIndexes() {
    const indexes = [
      // Opportunities table indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opportunities_active_deadline ON opportunities (is_active, application_deadline) WHERE is_active = true',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opportunities_type_active ON opportunities (type, is_active) WHERE is_active = true',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opportunities_organizer_type ON opportunities (organizer_type, is_active) WHERE is_active = true',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opportunities_mode ON opportunities (mode, is_active) WHERE is_active = true',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opportunities_location ON opportunities USING gin (to_tsvector(\'english\', location)) WHERE is_active = true',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opportunities_skills ON opportunities USING gin (required_skills) WHERE is_active = true',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opportunities_tags ON opportunities USING gin (tags) WHERE is_active = true',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opportunities_quality_score ON opportunities (quality_score DESC, application_deadline ASC) WHERE is_active = true',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_opportunities_full_text ON opportunities USING gin (to_tsvector(\'english\', title || \' \' || COALESCE(description, \'\'))) WHERE is_active = true',
      
      // User searches indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_searches_user_created ON user_searches (user_id, created_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_searches_created ON user_searches (created_at) WHERE created_at > NOW() - INTERVAL \'30 days\'',
      
      // User favorites indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_favorites_user ON user_favorites (user_id, created_at DESC)',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_favorites_opportunity ON user_favorites (opportunity_id)',
      
      // Notifications indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read, created_at DESC) WHERE is_read = false',
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_notifications_cleanup ON notifications (is_read, created_at) WHERE is_read = true',
      
      // Sources indexes
      'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sources_active_scrape ON sources (is_active, last_scraped_at) WHERE is_active = true',
    ];

    const results = [];
    for (const indexQuery of indexes) {
      try {
        await prisma.$executeRawUnsafe(indexQuery);
        results.push({ query: indexQuery, success: true });
      } catch (error) {
        results.push({ query: indexQuery, success: false, error: error.message });
      }
    }

    return results;
  },

  /**
   * Analyze table statistics for query optimization
   */
  async analyzeTableStats() {
    try {
      await prisma.$executeRaw`ANALYZE opportunities`;
      await prisma.$executeRaw`ANALYZE users`;
      await prisma.$executeRaw`ANALYZE user_searches`;
      await prisma.$executeRaw`ANALYZE user_favorites`;
      await prisma.$executeRaw`ANALYZE notifications`;
      await prisma.$executeRaw`ANALYZE sources`;
      
      return { success: true, message: 'Table statistics updated' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};

export { OptimizedQueries };
