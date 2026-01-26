/**
 * Jest setup file for integration tests
 */

import * as dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { getRedisClient, closeRedisConnection } from '../lib/redis';
import { getElasticsearchClient } from '../lib/elasticsearch';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Global test clients
let prisma: PrismaClient;
let redis: any;
let elasticsearch: any;

beforeAll(async () => {
  // Initialize database connection
  prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });

  // Initialize Redis connection
  redis = getRedisClient();

  // Initialize Elasticsearch connection
  elasticsearch = getElasticsearchClient();

  // Wait for connections to be ready
  await prisma.$connect();
  await redis.ping();
  await elasticsearch.ping();

  console.log('✅ Integration test services connected');
});

afterAll(async () => {
  // Clean up connections
  if (prisma) {
    await prisma.$disconnect();
  }

  if (redis) {
    await closeRedisConnection();
  }

  console.log('✅ Integration test services disconnected');
});

beforeEach(async () => {
  // Clean up test data before each test
  if (prisma) {
    // Clean up in reverse order of dependencies
    await prisma.notification.deleteMany();
    await prisma.roadmap.deleteMany();
    await prisma.userSearch.deleteMany();
    await prisma.opportunity.deleteMany();
    await prisma.source.deleteMany();
    await prisma.user.deleteMany();
  }

  if (redis) {
    await redis.flushdb();
  }

  if (elasticsearch) {
    try {
      await elasticsearch.indices.delete({ index: 'opportunities_test' });
    } catch (error) {
      // Index might not exist, ignore error
    }
  }
});

// Export clients for use in tests
export { prisma, redis, elasticsearch };
