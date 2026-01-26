import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { APICache, CacheManager } from './cache';

/**
 * Cache middleware for API routes
 * Provides automatic caching for GET requests with configurable TTL
 */

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyGenerator?: (req: NextRequest) => string; // Custom cache key generator
  skipCache?: (req: NextRequest) => boolean; // Function to determine if caching should be skipped
  varyBy?: string[]; // Headers to vary cache by (e.g., ['user-id', 'accept-language'])
}

/**
 * Default cache key generator
 * Creates a cache key based on URL and query parameters
 */
function defaultKeyGenerator(req: NextRequest): string {
  const url = new URL(req.url);
  const path = url.pathname;
  const searchParams = url.searchParams.toString();
  return `${path}${searchParams ? `?${searchParams}` : ''}`;
}

/**
 * Generate cache key with vary headers
 */
function generateCacheKey(req: NextRequest, options: CacheOptions): string {
  const baseKey = options.keyGenerator
    ? options.keyGenerator(req)
    : defaultKeyGenerator(req);

  if (options.varyBy && options.varyBy.length > 0) {
    const varyValues = options.varyBy
      .map(header => `${header}:${req.headers.get(header) || ''}`)
      .join('|');
    return `${baseKey}|${varyValues}`;
  }

  return baseKey;
}

/**
 * Cache middleware factory
 * Returns a middleware function that handles caching for API routes
 */
export function withCache(options: CacheOptions = {}) {
  return function cacheMiddleware(
    handler: (req: NextRequest) => Promise<NextResponse>
  ) {
    return async function cachedHandler(
      req: NextRequest
    ): Promise<NextResponse> {
      // Only cache GET requests by default
      if (req.method !== 'GET') {
        return handler(req);
      }

      // Check if caching should be skipped
      if (options.skipCache && options.skipCache(req)) {
        return handler(req);
      }

      const cacheKey = generateCacheKey(req, options);
      const ttl = options.ttl || 300; // Default 5 minutes

      try {
        // Try to get cached response
        const cachedResponse = await CacheManager.get<{
          status: number;
          headers: Record<string, string>;
          body: any;
        }>(cacheKey);

        if (cachedResponse) {
          // Return cached response
          const response = NextResponse.json(cachedResponse.body, {
            status: cachedResponse.status,
          });

          // Set cached headers
          Object.entries(cachedResponse.headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });

          // Add cache hit header
          response.headers.set('X-Cache', 'HIT');
          response.headers.set('X-Cache-Key', cacheKey);

          return response;
        }

        // Cache miss - execute handler
        const response = await handler(req);

        // Only cache successful responses
        if (response.status >= 200 && response.status < 300) {
          try {
            // Clone response to read body
            const responseClone = response.clone();
            const body = await responseClone.json();

            // Prepare cache data
            const cacheData = {
              status: response.status,
              headers: Object.fromEntries(
                Array.from(response.headers.entries())
              ),
              body,
            };

            // Cache the response
            await CacheManager.set(cacheKey, cacheData, ttl);

            // Add cache miss header to original response
            response.headers.set('X-Cache', 'MISS');
            response.headers.set('X-Cache-Key', cacheKey);
          } catch (error) {
            // If we can't parse JSON, don't cache
            console.warn('Could not cache non-JSON response:', error);
          }
        }

        return response;
      } catch (error) {
        console.error('Cache middleware error:', error);
        // If caching fails, continue without caching
        return handler(req);
      }
    };
  };
}

/**
 * Cache invalidation utilities
 */
export class CacheInvalidation {
  /**
   * Invalidate cache by pattern
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    await CacheManager.deletePattern(pattern);
  }

  /**
   * Invalidate cache for specific endpoint
   */
  static async invalidateEndpoint(endpoint: string): Promise<void> {
    const pattern = `*${endpoint}*`;
    await this.invalidatePattern(pattern);
  }

  /**
   * Invalidate user-specific cache
   */
  static async invalidateUserCache(userId: string): Promise<void> {
    const patterns = [
      `*user-id:${userId}*`,
      `*userId=${userId}*`,
      `*user=${userId}*`,
    ];

    for (const pattern of patterns) {
      await this.invalidatePattern(pattern);
    }
  }

  /**
   * Invalidate search-related cache
   */
  static async invalidateSearchCache(): Promise<void> {
    const patterns = ['search:*', '*search*', 'suggestions:*'];

    for (const pattern of patterns) {
      await this.invalidatePattern(pattern);
    }
  }

  /**
   * Invalidate opportunity-related cache
   */
  static async invalidateOpportunityCache(
    opportunityId?: string
  ): Promise<void> {
    if (opportunityId) {
      const patterns = [
        `opportunity:${opportunityId}`,
        `*opportunityId=${opportunityId}*`,
        `*opportunity=${opportunityId}*`,
      ];

      for (const pattern of patterns) {
        await this.invalidatePattern(pattern);
      }
    } else {
      // Invalidate all opportunity cache
      await this.invalidatePattern('opportunity:*');
    }

    // Also invalidate search cache as it might contain this opportunity
    await this.invalidateSearchCache();
  }
}

/**
 * Predefined cache configurations for common use cases
 */
export const CacheConfigs = {
  /**
   * Short-term cache for frequently changing data
   */
  shortTerm: {
    ttl: 60, // 1 minute
  },

  /**
   * Medium-term cache for moderately changing data
   */
  mediumTerm: {
    ttl: 300, // 5 minutes
  },

  /**
   * Long-term cache for rarely changing data
   */
  longTerm: {
    ttl: 3600, // 1 hour
  },

  /**
   * User-specific cache configuration
   */
  userSpecific: {
    ttl: 300, // 5 minutes
    varyBy: ['user-id', 'authorization'],
    skipCache: (req: NextRequest) => {
      // Skip cache if no user authentication
      return !req.headers.get('authorization') && !req.headers.get('user-id');
    },
  },

  /**
   * Search results cache configuration
   */
  searchResults: {
    ttl: 300, // 5 minutes
    keyGenerator: (req: NextRequest) => {
      const url = new URL(req.url);
      const query = url.searchParams.get('q') || '';
      const filters = url.searchParams.get('filters') || '';
      const page = url.searchParams.get('page') || '1';
      const userId = req.headers.get('user-id') || 'anonymous';

      return `search:${Buffer.from(`${query}|${filters}|${page}|${userId}`).toString('base64')}`;
    },
  },

  /**
   * API response cache for external services
   */
  externalAPI: {
    ttl: 600, // 10 minutes
    skipCache: (req: NextRequest) => {
      // Skip cache for POST, PUT, DELETE requests
      return !['GET', 'HEAD'].includes(req.method);
    },
  },

  /**
   * Static data cache configuration
   */
  staticData: {
    ttl: 86400, // 24 hours
  },
};

/**
 * Cache warming utilities
 */
export class CacheWarming {
  /**
   * Warm up cache for popular search queries
   */
  static async warmSearchCache(popularQueries: string[]): Promise<void> {
    console.log('Warming up search cache...');

    for (const query of popularQueries) {
      try {
        // This would typically make a request to your search endpoint
        // to populate the cache with popular search results
        console.log(`Warming cache for query: ${query}`);
        // Implementation would depend on your search API structure
      } catch (error) {
        console.error(`Failed to warm cache for query ${query}:`, error);
      }
    }
  }

  /**
   * Warm up cache for popular opportunities
   */
  static async warmOpportunityCache(opportunityIds: string[]): Promise<void> {
    console.log('Warming up opportunity cache...');

    for (const id of opportunityIds) {
      try {
        // This would typically make a request to your opportunity endpoint
        console.log(`Warming cache for opportunity: ${id}`);
        // Implementation would depend on your opportunity API structure
      } catch (error) {
        console.error(`Failed to warm cache for opportunity ${id}:`, error);
      }
    }
  }
}
