import type { RedisClientType } from 'redis';
import { getRedisClient } from './redis';

/**
 * Comprehensive Redis Caching Service for OpportuneX
 * Provides high-performance caching for frequently accessed data
 */

interface CacheOptions {
  ttl?: number; // Time to live in seconds
  prefix?: string;
  compress?: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
}

class CacheService {
  private client: RedisClientType | null = null;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
  };

  private readonly defaultTTL = 3600; // 1 hour
  private readonly keyPrefix = 'opportunex:';

  /**
   * Initialize Redis client
   */
  private async getClient(): Promise<RedisClientType> {
    if (!this.client) {
      this.client = await getRedisClient();
    }
    return this.client;
  }

  /**
   * Generate cache key with prefix
   */
  private generateKey(key: string, prefix?: string): string {
    const keyPrefix = prefix || this.keyPrefix;
    return `${keyPrefix}${key}`;
  }

  /**
   * Serialize data for storage
   */
  private serialize(data: any): string {
    return JSON.stringify(data);
  }

  /**
   * Deserialize data from storage
   */
  private deserialize<T>(data: string): T {
    return JSON.parse(data);
  }

  /**
   * Set cache value
   */
  async set(
    key: string,
    value: any,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      const client = await this.getClient();
      const cacheKey = this.generateKey(key, options.prefix);
      const serializedValue = this.serialize(value);
      const ttl = options.ttl || this.defaultTTL;

      await client.setEx(cacheKey, ttl, serializedValue);
      this.stats.sets++;
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Get cache value
   */
  async get<T>(key: string, options: CacheOptions = {}): Promise<T | null> {
    try {
      const client = await this.getClient();
      const cacheKey = this.generateKey(key, options.prefix);
      const value = await client.get(cacheKey);

      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      return this.deserialize<T>(value);
    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.errors++;
      return null;
    }
  }

  /**
   * Delete cache value
   */
  async delete(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const client = await this.getClient();
      const cacheKey = this.generateKey(key, options.prefix);
      const result = await client.del(cacheKey);
      this.stats.deletes++;
      return result > 0;
    } catch (error) {
      console.error('Cache delete error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Check if key exists
   */
  async exists(key: string, options: CacheOptions = {}): Promise<boolean> {
    try {
      const client = await this.getClient();
      const cacheKey = this.generateKey(key, options.prefix);
      const result = await client.exists(cacheKey);
      return result > 0;
    } catch (error) {
      console.error('Cache exists error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Set multiple values at once
   */
  async mset(
    keyValuePairs: Array<{ key: string; value: any; ttl?: number }>,
    options: CacheOptions = {}
  ): Promise<boolean> {
    try {
      const client = await this.getClient();
      const pipeline = client.multi();

      for (const { key, value, ttl } of keyValuePairs) {
        const cacheKey = this.generateKey(key, options.prefix);
        const serializedValue = this.serialize(value);
        const expiry = ttl || options.ttl || this.defaultTTL;

        pipeline.setEx(cacheKey, expiry, serializedValue);
      }

      await pipeline.exec();
      this.stats.sets += keyValuePairs.length;
      return true;
    } catch (error) {
      console.error('Cache mset error:', error);
      this.stats.errors++;
      return false;
    }
  }

  /**
   * Get multiple values at once
   */
  async mget<T>(
    keys: string[],
    options: CacheOptions = {}
  ): Promise<Array<T | null>> {
    try {
      const client = await this.getClient();
      const cacheKeys = keys.map(key => this.generateKey(key, options.prefix));
      const values = await client.mGet(cacheKeys);

      const results = values.map(value => {
        if (value === null) {
          this.stats.misses++;
          return null;
        }
        this.stats.hits++;
        return this.deserialize<T>(value);
      });

      return results;
    } catch (error) {
      console.error('Cache mget error:', error);
      this.stats.errors++;
      return keys.map(() => null);
    }
  }

  /**
   * Increment a numeric value
   */
  async increment(
    key: string,
    amount = 1,
    options: CacheOptions = {}
  ): Promise<number> {
    try {
      const client = await this.getClient();
      const cacheKey = this.generateKey(key, options.prefix);
      const result = await client.incrBy(cacheKey, amount);

      // Set TTL if it's a new key
      const ttl = options.ttl || this.defaultTTL;
      await client.expire(cacheKey, ttl);

      return result;
    } catch (error) {
      console.error('Cache increment error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Add item to a set
   */
  async sadd(
    key: string,
    members: string[],
    options: CacheOptions = {}
  ): Promise<number> {
    try {
      const client = await this.getClient();
      const cacheKey = this.generateKey(key, options.prefix);
      const result = await client.sAdd(cacheKey, members);

      const ttl = options.ttl || this.defaultTTL;
      await client.expire(cacheKey, ttl);

      return result;
    } catch (error) {
      console.error('Cache sadd error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Get all members of a set
   */
  async smembers(key: string, options: CacheOptions = {}): Promise<string[]> {
    try {
      const client = await this.getClient();
      const cacheKey = this.generateKey(key, options.prefix);
      return await client.sMembers(cacheKey);
    } catch (error) {
      console.error('Cache smembers error:', error);
      this.stats.errors++;
      return [];
    }
  }

  /**
   * Clear all cache with pattern
   */
  async clearPattern(pattern: string): Promise<number> {
    try {
      const client = await this.getClient();
      const keys = await client.keys(`${this.keyPrefix}${pattern}`);

      if (keys.length === 0) {
        return 0;
      }

      const result = await client.del(keys);
      this.stats.deletes += result;
      return result;
    } catch (error) {
      console.error('Cache clear pattern error:', error);
      this.stats.errors++;
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    healthy: boolean;
    latency?: number;
    error?: string;
  }> {
    try {
      const start = Date.now();
      const client = await this.getClient();
      await client.ping();
      const latency = Date.now() - start;

      return { healthy: true, latency };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Singleton instance
export const cacheService = new CacheService();

/**
 * Specialized caching utilities for OpportuneX data
 */
export class OpportuneXCache {
  private static readonly TTL = {
    OPPORTUNITIES: 1800, // 30 minutes
    USER_PROFILE: 3600, // 1 hour
    SEARCH_RESULTS: 900, // 15 minutes
    RECOMMENDATIONS: 1800, // 30 minutes
    NOTIFICATIONS: 300, // 5 minutes
    SOURCES: 7200, // 2 hours
    ANALYTICS: 600, // 10 minutes
  };

  /**
   * Cache opportunities list
   */
  static async cacheOpportunities(
    key: string,
    opportunities: any[],
    ttl: number = OpportuneXCache.TTL.OPPORTUNITIES
  ): Promise<boolean> {
    return cacheService.set(`opportunities:${key}`, opportunities, { ttl });
  }

  /**
   * Get cached opportunities
   */
  static async getCachedOpportunities(key: string): Promise<any[] | null> {
    return cacheService.get<any[]>(`opportunities:${key}`);
  }

  /**
   * Cache user profile
   */
  static async cacheUserProfile(
    userId: string,
    profile: any,
    ttl: number = OpportuneXCache.TTL.USER_PROFILE
  ): Promise<boolean> {
    return cacheService.set(`user:${userId}`, profile, { ttl });
  }

  /**
   * Get cached user profile
   */
  static async getCachedUserProfile(userId: string): Promise<any | null> {
    return cacheService.get(`user:${userId}`);
  }

  /**
   * Cache search results
   */
  static async cacheSearchResults(
    query: string,
    filters: any,
    results: any,
    ttl: number = OpportuneXCache.TTL.SEARCH_RESULTS
  ): Promise<boolean> {
    const key = `search:${Buffer.from(JSON.stringify({ query, filters })).toString('base64')}`;
    return cacheService.set(key, results, { ttl });
  }

  /**
   * Get cached search results
   */
  static async getCachedSearchResults(
    query: string,
    filters: any
  ): Promise<any | null> {
    const key = `search:${Buffer.from(JSON.stringify({ query, filters })).toString('base64')}`;
    return cacheService.get(key);
  }

  /**
   * Cache personalized recommendations
   */
  static async cacheRecommendations(
    userId: string,
    recommendations: any[],
    ttl: number = OpportuneXCache.TTL.RECOMMENDATIONS
  ): Promise<boolean> {
    return cacheService.set(`recommendations:${userId}`, recommendations, {
      ttl,
    });
  }

  /**
   * Get cached recommendations
   */
  static async getCachedRecommendations(userId: string): Promise<any[] | null> {
    return cacheService.get<any[]>(`recommendations:${userId}`);
  }

  /**
   * Cache user notifications
   */
  static async cacheNotifications(
    userId: string,
    notifications: any[],
    ttl: number = OpportuneXCache.TTL.NOTIFICATIONS
  ): Promise<boolean> {
    return cacheService.set(`notifications:${userId}`, notifications, { ttl });
  }

  /**
   * Get cached notifications
   */
  static async getCachedNotifications(userId: string): Promise<any[] | null> {
    return cacheService.get<any[]>(`notifications:${userId}`);
  }

  /**
   * Cache data sources
   */
  static async cacheSources(
    sources: any[],
    ttl: number = OpportuneXCache.TTL.SOURCES
  ): Promise<boolean> {
    return cacheService.set('sources:all', sources, { ttl });
  }

  /**
   * Get cached sources
   */
  static async getCachedSources(): Promise<any[] | null> {
    return cacheService.get<any[]>('sources:all');
  }

  /**
   * Cache analytics data
   */
  static async cacheAnalytics(
    key: string,
    data: any,
    ttl: number = OpportuneXCache.TTL.ANALYTICS
  ): Promise<boolean> {
    return cacheService.set(`analytics:${key}`, data, { ttl });
  }

  /**
   * Get cached analytics
   */
  static async getCachedAnalytics(key: string): Promise<any | null> {
    return cacheService.get(`analytics:${key}`);
  }

  /**
   * Invalidate user-related cache
   */
  static async invalidateUserCache(userId: string): Promise<void> {
    await Promise.all([
      cacheService.delete(`user:${userId}`),
      cacheService.delete(`recommendations:${userId}`),
      cacheService.delete(`notifications:${userId}`),
      cacheService.clearPattern(`search:*${userId}*`),
    ]);
  }

  /**
   * Invalidate opportunities cache
   */
  static async invalidateOpportunitiesCache(): Promise<void> {
    await cacheService.clearPattern('opportunities:*');
  }

  /**
   * Warm up cache with frequently accessed data
   */
  static async warmUpCache(): Promise<void> {
    console.log('🔥 Warming up cache...');

    try {
      // This would typically be called during application startup
      // to pre-populate cache with frequently accessed data

      // Example: Cache active opportunities
      // const activeOpportunities = await getActiveOpportunities();
      // await OpportuneXCache.cacheOpportunities('active', activeOpportunities);

      console.log('✅ Cache warm-up completed');
    } catch (error) {
      console.error('❌ Cache warm-up failed:', error);
    }
  }
}

export default cacheService;
