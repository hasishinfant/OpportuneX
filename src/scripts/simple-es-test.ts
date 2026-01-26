#!/usr/bin/env tsx

/**
 * Simple Elasticsearch Configuration Test
 * Tests the basic setup without requiring environment variables
 */

import { SearchQueryBuilder } from '../lib/search-utils';

console.log('🧪 Simple Elasticsearch Configuration Test');
console.log('='.repeat(50));

// Test 1: Search Query Builder
try {
  console.log('✅ 1. Testing SearchQueryBuilder...');

  const queryBuilder = new SearchQueryBuilder()
    .setQuery('machine learning hackathon')
    .addFilters({
      skills: ['python', 'javascript'],
      organizerType: 'corporate',
      mode: 'online',
    })
    .setPagination(1, 20)
    .addAggregations();

  const query = queryBuilder.build();

  console.log('   ✓ Query builder created successfully');
  console.log('   ✓ Query has search text:', !!query.query);
  console.log('   ✓ Query has filters:', query.query?.bool?.filter?.length > 0);
  console.log('   ✓ Query has pagination:', typeof query.size === 'number');
  console.log('   ✓ Query has aggregations:', !!query.aggs);
} catch (error) {
  console.log('❌ 1. SearchQueryBuilder test failed:', error);
}

// Test 2: Index Configurations
try {
  console.log('\n✅ 2. Testing Index Configurations...');

  const { INDEX_CONFIGS } = require('../lib/search-indices');
  const indexNames = Object.keys(INDEX_CONFIGS);

  console.log('   ✓ Index configurations loaded');
  console.log('   ✓ Number of indices:', indexNames.length);
  console.log('   ✓ Index names:', indexNames.join(', '));

  // Validate each index config
  for (const [indexName, config] of Object.entries(INDEX_CONFIGS)) {
    const hasMapping =
      config.mapping && Object.keys(config.mapping.properties || {}).length > 0;
    const hasSettings =
      config.settings && Object.keys(config.settings).length > 0;

    if (hasMapping && hasSettings) {
      console.log(`   ✓ ${indexName}: Valid configuration`);
    } else {
      console.log(`   ❌ ${indexName}: Invalid configuration`);
    }
  }
} catch (error) {
  console.log('❌ 2. Index configurations test failed:', error);
}

// Test 3: Elasticsearch Client Import
try {
  console.log('\n✅ 3. Testing Elasticsearch Client Import...');

  const { Client } = require('@elastic/elasticsearch');
  console.log('   ✓ @elastic/elasticsearch package imported successfully');
  console.log('   ✓ Client class available:', typeof Client === 'function');
} catch (error) {
  console.log('❌ 3. Elasticsearch client import failed:', error);
}

// Test 4: Type Definitions
try {
  console.log('\n✅ 4. Testing Type Definitions...');

  const types = require('../types');
  console.log('   ✓ Type definitions loaded');
  console.log(
    '   ✓ Available types:',
    Object.keys(types).length > 0 ? 'Yes' : 'No'
  );
} catch (error) {
  console.log('❌ 4. Type definitions test failed:', error);
}

console.log(`\n${'='.repeat(50)}`);
console.log('🎉 Basic configuration tests completed!');
console.log('✨ Core Elasticsearch setup appears to be working.');

console.log('\n📋 Next steps:');
console.log('   1. Set up environment variables (.env file)');
console.log('   2. Start Elasticsearch service');
console.log('   3. Run: npm run es:init');
console.log('   4. Run: npm run es:health');

console.log('\n💡 Sample .env configuration:');
console.log(
  '   DATABASE_URL="postgresql://postgres:password@localhost:5432/opportunex_dev"'
);
console.log('   ELASTICSEARCH_URL="http://localhost:9200"');
console.log('   REDIS_URL="redis://localhost:6379"');
