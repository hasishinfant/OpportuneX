import { getRedisClient } from './redis';
import type {
  Opportunity,
  SearchRequest,
  SearchResponse,
  UserProfile,
} from '../types';

// Cache key prefixes for different data types
const CACHE_PREFIXES = {
  SEARCH_RESULTS: 'search:',
  USER_SESSION: 'session:',
  USER_PROFILE: 'profile:',
  OPPORTUNITY: 'opportunity:',
  API_RESPONSE: 'api:',
  SEARCH_SUGGESTIONS: 'suggestions:',
  USER_PREFERENCES: 'preferences:',
  ROADMAP: 'roadmap:',
} as const;

// Default TTL values (in seconds)
const DEFAULT_TTL = {
  SEARCH_RESULTS: 300, // 5 minutes
  USER_SESSION: 86400, // 24 hours
  USER_PROFILE: 3600, // 1 hour
  OPPORTUNITY: 1800, // 30 minutes
  API_RESPONSE: 600, // 10 minutes
  SEARCH_SUGGESTIONS: 3600, // 1 hour
  USER_PREFERENCES: 7200, // 2 hours
  ROADMAP: 1800, // 30 minutes
} as const;

/**
 * Generic cache operations
 */
export class CacheManager {
  /**
   * Set a value in cache with optional TTL
   */
  static async set(key: string, value: any, ttl?: number): Promise<void> {
    try {
      const client = await getRedisClient();
      const serializedValue = JSON.stringify(value);

      if (ttl) {
        await client.setEx(key, ttl, serializedValue);
      } else {
        await client.set(key, serializedValue);
      }
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error);
      // Don't throw error to prevent cache failures from breaking the app
    }
  }

  /**
   * Get a value from cache
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const client = await getRedisClient();
      const value = await client.get(key);

      if (value === null) {
        return null;
      }

      return JSON.parse(value as string) as T;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a value from cache
   */
  static async delete(key: string): Promise<void> {
    try {
      const client = await getRedisClient();
      await client.del(key);
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error);
    }
  }

  /**
   * Check if a key exists in cache
   */
  static async exists(key: string): Promise<boolean> {
    try {
      const client = await getRedisClient();
      const result = await client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set TTL for an existing key
   */
  static async expire(key: string, ttl: number): Promise<void> {
    try {
      const client = await getRedisClient();
      await client.expire(key, ttl);
    } catch (error) {
      console.error(`Cache expire error for key ${key}:`, error);
    }
  }

  /**
   * Get multiple values from cache
   */
  static async mget<T>(keys: string[]): Promise<Array<T | null>> {
    try {
      const client = await getRedisClient();
      const values = await client.mGet(keys);

      return values.map(value => {
        if (value === null) return null;
        try {
          return JSON.parse(value as string) as T;
        } catch {
          return null;
        }
      });
    } catch (error) {
      console.error(`Cache mget error for keys ${keys.join(', ')}:`, error);
      return keys.map(() => null);
    }
  }

  /**
   * Delete multiple keys from cache
   */
  static async deletePattern(pattern: string): Promise<void> {
    try {
      const client = await getRedisClient();
      const keys = await client.keys(pattern);

      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch (error) {
      console.error(
        `Cache delete pattern error for pattern ${pattern}:`,
        error
      );
    }
  }
}

/**
 * Search results caching
 */
export class SearchCache {
  /**
   * Generate cache key for search results
   */
  private static generateSearchKey(request: SearchRequest): string {
    const keyData = {
      query: request.query,
      filters: request.filters,
      pagination: request.pagination,
      userId: request.userId,
    };

    // Create a hash of the search parameters
    const searchHash = Buffer.from(JSON.stringify(keyData)).toString('base64');
    return `${CACHE_PREFIXES.SEARCH_RESULTS}${searchHash}`;
  }

  /**
   * Cache search results
   */
  static async setSearchResults(
    request: SearchRequest,
    response: SearchResponse
  ): Promise<void> {
    const key = this.generateSearchKey(request);
    await CacheManager.set(key, response, DEFAULT_TTL.SEARCH_RESULTS);
  }

  /**
   * Get cached search results
   */
  static async getSearchResults(
    request: SearchRequest
  ): Promise<SearchResponse | null> {
    const key = this.generateSearchKey(request);
    return await CacheManager.get<SearchResponse>(key);
  }

  /**
   * Cache search suggestions
   */
  static async setSearchSuggestions(
    query: string,
    suggestions: string[]
  ): Promise<void> {
    const key = `${CACHE_PREFIXES.SEARCH_SUGGESTIONS}${query.toLowerCase()}`;
    await CacheManager.set(key, suggestions, DEFAULT_TTL.SEARCH_SUGGESTIONS);
  }

  /**
   * Get cached search suggestions
   */
  static async getSearchSuggestions(query: string): Promise<string[] | null> {
    const key = `${CACHE_PREFIXES.SEARCH_SUGGESTIONS}${query.toLowerCase()}`;
    return await CacheManager.get<string[]>(key);
  }

  /**
   * Clear search cache for a user
   */
  static async clearUserSearchCache(userId: string): Promise<void> {
    const pattern = `${CACHE_PREFIXES.SEARCH_RESULTS}*${userId}*`;
    await CacheManager.deletePattern(pattern);
  }
}

/**
 * User session caching
 */
export class SessionCache {
  /**
   * Set user session data
   */
  static async setSession(sessionId: string, sessionData: any): Promise<void> {
    const key = `${CACHE_PREFIXES.USER_SESSION}${sessionId}`;
    await CacheManager.set(key, sessionData, DEFAULT_TTL.USER_SESSION);
  }

  /**
   * Get user session data
   */
  static async getSession(sessionId: string): Promise<any | null> {
    const key = `${CACHE_PREFIXES.USER_SESSION}${sessionId}`;
    return await CacheManager.get(key);
  }

  /**
   * Delete user session
   */
  static async deleteSession(sessionId: string): Promise<void> {
    const key = `${CACHE_PREFIXES.USER_SESSION}${sessionId}`;
    await CacheManager.delete(key);
  }

  /**
   * Extend session TTL
   */
  static async extendSession(sessionId: string): Promise<void> {
    const key = `${CACHE_PREFIXES.USER_SESSION}${sessionId}`;
    await CacheManager.expire(key, DEFAULT_TTL.USER_SESSION);
  }
}

/**
 * User profile caching
 */
export class UserCache {
  /**
   * Cache user profile
   */
  static async setUserProfile(
    userId: string,
    profile: UserProfile
  ): Promise<void> {
    const key = `${CACHE_PREFIXES.USER_PROFILE}${userId}`;
    await CacheManager.set(key, profile, DEFAULT_TTL.USER_PROFILE);
  }

  /**
   * Get cached user profile
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const key = `${CACHE_PREFIXES.USER_PROFILE}${userId}`;
    return await CacheManager.get<UserProfile>(key);
  }

  /**
   * Delete user profile from cache
   */
  static async deleteUserProfile(userId: string): Promise<void> {
    const key = `${CACHE_PREFIXES.USER_PROFILE}${userId}`;
    await CacheManager.delete(key);
  }

  /**
   * Cache user preferences
   */
  static async setUserPreferences(
    userId: string,
    preferences: any
  ): Promise<void> {
    const key = `${CACHE_PREFIXES.USER_PREFERENCES}${userId}`;
    await CacheManager.set(key, preferences, DEFAULT_TTL.USER_PREFERENCES);
  }

  /**
   * Get cached user preferences
   */
  static async getUserPreferences(userId: string): Promise<any | null> {
    const key = `${CACHE_PREFIXES.USER_PREFERENCES}${userId}`;
    return await CacheManager.get(key);
  }
}

/**
 * Opportunity caching
 */
export class OpportunityCache {
  /**
   * Cache single opportunity
   */
  static async setOpportunity(
    opportunityId: string,
    opportunity: Opportunity
  ): Promise<void> {
    const key = `${CACHE_PREFIXES.OPPORTUNITY}${opportunityId}`;
    await CacheManager.set(key, opportunity, DEFAULT_TTL.OPPORTUNITY);
  }

  /**
   * Get cached opportunity
   */
  static async getOpportunity(
    opportunityId: string
  ): Promise<Opportunity | null> {
    const key = `${CACHE_PREFIXES.OPPORTUNITY}${opportunityId}`;
    return await CacheManager.get<Opportunity>(key);
  }

  /**
   * Cache multiple opportunities
   */
  static async setOpportunities(opportunities: Opportunity[]): Promise<void> {
    const promises = opportunities.map(opportunity =>
      this.setOpportunity(opportunity.id, opportunity)
    );
    await Promise.all(promises);
  }

  /**
   * Get multiple cached opportunities
   */
  static async getOpportunities(
    opportunityIds: string[]
  ): Promise<Array<Opportunity | null>> {
    const keys = opportunityIds.map(id => `${CACHE_PREFIXES.OPPORTUNITY}${id}`);
    return await CacheManager.mget<Opportunity>(keys);
  }

  /**
   * Delete opportunity from cache
   */
  static async deleteOpportunity(opportunityId: string): Promise<void> {
    const key = `${CACHE_PREFIXES.OPPORTUNITY}${opportunityId}`;
    await CacheManager.delete(key);
  }
}

/**
 * API response caching
 */
export class APICache {
  /**
   * Cache API response
   */
  static async setAPIResponse(
    endpoint: string,
    params: any,
    response: any,
    ttl?: number
  ): Promise<void> {
    const keyData = { endpoint, params };
    const cacheKey = Buffer.from(JSON.stringify(keyData)).toString('base64');
    const key = `${CACHE_PREFIXES.API_RESPONSE}${cacheKey}`;

    await CacheManager.set(key, response, ttl || DEFAULT_TTL.API_RESPONSE);
  }

  /**
   * Get cached API response
   */
  static async getAPIResponse(
    endpoint: string,
    params: any
  ): Promise<any | null> {
    const keyData = { endpoint, params };
    const cacheKey = Buffer.from(JSON.stringify(keyData)).toString('base64');
    const key = `${CACHE_PREFIXES.API_RESPONSE}${cacheKey}`;

    return await CacheManager.get(key);
  }
}

/**
 * AI Roadmap caching
 */
export class RoadmapCache {
  /**
   * Cache AI-generated roadmap
   */
  static async setRoadmap(
    userId: string,
    opportunityId: string,
    roadmap: any
  ): Promise<void> {
    const key = `${CACHE_PREFIXES.ROADMAP}${userId}:${opportunityId}`;
    await CacheManager.set(key, roadmap, DEFAULT_TTL.ROADMAP);
  }

  /**
   * Get cached roadmap
   */
  static async getRoadmap(
    userId: string,
    opportunityId: string
  ): Promise<any | null> {
    const key = `${CACHE_PREFIXES.ROADMAP}${userId}:${opportunityId}`;
    return await CacheManager.get(key);
  }

  /**
   * Delete roadmap from cache
   */
  static async deleteRoadmap(
    userId: string,
    opportunityId: string
  ): Promise<void> {
    const key = `${CACHE_PREFIXES.ROADMAP}${userId}:${opportunityId}`;
    await CacheManager.delete(key);
  }
}

/**
 * Cache statistics and monitoring
 */
export class CacheStats {
  /**
   * Get cache statistics
   */
  static async getStats(): Promise<any> {
    try {
      const client = await getRedisClient();
      const info = await client.info('memory');
      const keyspace = await client.info('keyspace');

      return {
        memory: info,
        keyspace,
        connected: client.isReady,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return null;
    }
  }

  /**
   * Clear all cache data (use with caution)
   */
  static async clearAll(): Promise<void> {
    try {
      const client = await getRedisClient();
      await client.flushAll();
      console.log('All cache data cleared');
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }
}
