import type { RedisClientType } from 'redis';
import { createClient } from 'redis';
import { redisConfig } from './env';

// Redis client instance
let redisClient: RedisClientType | null = null;

/**
 * Get or create Redis client instance
 * Implements singleton pattern for connection management
 */
export async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({
      url: redisConfig.url,
      socket: {
        connectTimeout: 10000,
      },
    });

    // Error handling
    redisClient.on('error', err => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('Redis Client Connected');
    });

    redisClient.on('ready', () => {
      console.log('Redis Client Ready');
    });

    redisClient.on('end', () => {
      console.log('Redis Client Connection Ended');
    });

    // Connect to Redis
    try {
      await redisClient.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      redisClient = null;
      throw error;
    }
  }

  return redisClient;
}

/**
 * Close Redis connection
 * Should be called during application shutdown
 */
export async function closeRedisConnection(): Promise<void> {
  if (redisClient) {
    try {
      await redisClient.quit();
      redisClient = null;
      console.log('Redis connection closed');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
}

/**
 * Check Redis connection health
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const client = await getRedisClient();
    const result = await client.ping();
    return result === 'PONG';
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}

/**
 * Redis connection status
 */
export function getRedisConnectionStatus(): string {
  if (!redisClient) {
    return 'disconnected';
  }
  return redisClient.isReady ? 'ready' : 'connecting';
}
