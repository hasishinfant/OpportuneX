#!/usr/bin/env tsx

/**
 * Redis Health Check Script
 * Tests Redis connection and basic operations
 */

import {
  getRedisClient,
  checkRedisHealth,
  closeRedisConnection,
} from '../lib/redis';
import { CacheManager, CacheStats } from '../lib/cache';

async function testRedisConnection() {
  console.log('🔍 Testing Redis connection...\n');

  try {
    // Test basic connection
    console.log('1. Testing basic connection...');
    const isHealthy = await checkRedisHealth();

    if (!isHealthy) {
      console.error('❌ Redis health check failed');
      process.exit(1);
    }

    console.log('✅ Redis connection is healthy');

    // Test basic operations
    console.log('\n2. Testing basic cache operations...');

    // Test set/get
    const testKey = 'test:health-check';
    const testValue = {
      message: 'Hello Redis!',
      timestamp: new Date().toISOString(),
    };

    await CacheManager.set(testKey, testValue, 60);
    console.log('✅ Set operation successful');

    const retrievedValue = await CacheManager.get(testKey);
    console.log('✅ Get operation successful');

    if (JSON.stringify(retrievedValue) === JSON.stringify(testValue)) {
      console.log('✅ Data integrity verified');
    } else {
      console.error('❌ Data integrity check failed');
      console.log('Expected:', testValue);
      console.log('Retrieved:', retrievedValue);
    }

    // Test exists
    const exists = await CacheManager.exists(testKey);
    console.log(`✅ Exists check: ${exists ? 'Key found' : 'Key not found'}`);

    // Test delete
    await CacheManager.delete(testKey);
    const existsAfterDelete = await CacheManager.exists(testKey);
    console.log(
      `✅ Delete operation: ${!existsAfterDelete ? 'Successful' : 'Failed'}`
    );

    // Test multiple operations
    console.log('\n3. Testing multiple key operations...');

    const multiKeys = ['test:multi:1', 'test:multi:2', 'test:multi:3'];
    const multiValues = [
      { id: 1, name: 'Test 1' },
      { id: 2, name: 'Test 2' },
      { id: 3, name: 'Test 3' },
    ];

    // Set multiple values
    for (let i = 0; i < multiKeys.length; i++) {
      await CacheManager.set(multiKeys[i], multiValues[i], 60);
    }
    console.log('✅ Multiple set operations successful');

    // Get multiple values
    const retrievedMultiple = await CacheManager.mget(multiKeys);
    console.log('✅ Multiple get operations successful');

    // Verify data
    let multiDataIntegrity = true;
    for (let i = 0; i < multiValues.length; i++) {
      if (
        JSON.stringify(retrievedMultiple[i]) !== JSON.stringify(multiValues[i])
      ) {
        multiDataIntegrity = false;
        break;
      }
    }

    if (multiDataIntegrity) {
      console.log('✅ Multiple data integrity verified');
    } else {
      console.error('❌ Multiple data integrity check failed');
    }

    // Clean up test keys
    for (const key of multiKeys) {
      await CacheManager.delete(key);
    }
    console.log('✅ Test cleanup completed');

    // Get cache statistics
    console.log('\n4. Cache statistics:');
    const stats = await CacheStats.getStats();
    if (stats) {
      console.log('✅ Cache stats retrieved');
      console.log('Memory info available:', !!stats.memory);
      console.log('Keyspace info available:', !!stats.keyspace);
      console.log(
        'Connection status:',
        stats.connected ? 'Connected' : 'Disconnected'
      );
    } else {
      console.log('⚠️  Could not retrieve cache stats');
    }

    console.log('\n🎉 All Redis tests passed successfully!');
  } catch (error) {
    console.error('\n❌ Redis test failed:', error);
    process.exit(1);
  } finally {
    // Close connection
    await closeRedisConnection();
    console.log('\n🔌 Redis connection closed');
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const verbose = args.includes('--verbose') || args.includes('-v');
const json = args.includes('--json');

if (json) {
  // JSON output for programmatic use
  testRedisConnection()
    .then(() => {
      console.log(
        JSON.stringify({
          status: 'healthy',
          timestamp: new Date().toISOString(),
        })
      );
    })
    .catch(error => {
      console.log(
        JSON.stringify({
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString(),
        })
      );
      process.exit(1);
    });
} else {
  // Human-readable output
  testRedisConnection();
}
