import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { CacheStats, CacheManager } from '@/lib/cache';
import { checkRedisHealth, getRedisConnectionStatus } from '@/lib/redis';

/**
 * Cache statistics and health API endpoint
 * Provides information about Redis cache status and performance
 */
export async function GET(req: NextRequest) {
  try {
    // Check Redis health
    const isHealthy = await checkRedisHealth();
    const connectionStatus = getRedisConnectionStatus();

    // Get cache statistics
    const stats = await CacheStats.getStats();

    // Test basic cache operations
    const testKey = 'health-check-test';
    const testValue = { timestamp: new Date().toISOString() };

    const operationsTest = {
      set: false,
      get: false,
      delete: false,
    };

    try {
      await CacheManager.set(testKey, testValue, 10);
      operationsTest.set = true;

      const retrieved = await CacheManager.get(testKey);
      operationsTest.get = retrieved !== null;

      await CacheManager.delete(testKey);
      operationsTest.delete = true;
    } catch (error) {
      console.error('Cache operations test failed:', error);
    }

    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      connection: connectionStatus,
      operations: operationsTest,
      stats: stats || null,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      status: isHealthy ? 200 : 503,
    });
  } catch (error) {
    console.error('Cache stats error:', error);

    return NextResponse.json(
      {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      {
        status: 500,
      }
    );
  }
}
