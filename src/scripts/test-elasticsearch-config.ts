#!/usr/bin/env tsx

/**
 * Test Elasticsearch Configuration
 *
 * This script validates the Elasticsearch configuration and setup
 * without requiring a running Elasticsearch instance.
 */

import { elasticsearchConfig, env } from '../lib/env';
import { INDEX_CONFIGS } from '../lib/search-indices';
import { SearchQueryBuilder } from '../lib/search-utils';

interface ConfigTest {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

function runConfigurationTests(): ConfigTest[] {
  const tests: ConfigTest[] = [];

  // Test 1: Environment variables
  tests.push({
    name: 'Environment Configuration',
    status: env.ELASTICSEARCH_URL ? 'pass' : 'fail',
    message: env.ELASTICSEARCH_URL
      ? `Elasticsearch URL configured: ${env.ELASTICSEARCH_URL}`
      : 'ELASTICSEARCH_URL not configured in environment variables',
    details: {
      url: env.ELASTICSEARCH_URL,
      hasAuth: !!(env.ELASTICSEARCH_USERNAME && env.ELASTICSEARCH_PASSWORD),
      username: env.ELASTICSEARCH_USERNAME ? '***' : undefined,
    },
  });

  // Test 2: Elasticsearch config object
  tests.push({
    name: 'Elasticsearch Config Object',
    status: elasticsearchConfig ? 'pass' : 'fail',
    message: elasticsearchConfig
      ? 'Elasticsearch configuration object created successfully'
      : 'Failed to create Elasticsearch configuration object',
    details: elasticsearchConfig,
  });

  // Test 3: Index configurations
  const indexNames = Object.keys(INDEX_CONFIGS);
  tests.push({
    name: 'Index Configurations',
    status: indexNames.length > 0 ? 'pass' : 'fail',
    message: `${indexNames.length} index configurations defined: ${indexNames.join(', ')}`,
    details: {
      indices: indexNames,
      configs: INDEX_CONFIGS,
    },
  });

  // Test 4: Search query builder
  try {
    const queryBuilder = new SearchQueryBuilder()
      .setQuery('test query')
      .addFilters({ skills: ['javascript'], type: 'hackathon' })
      .setPagination(1, 20)
      .addAggregations();

    const query = queryBuilder.build();

    tests.push({
      name: 'Search Query Builder',
      status: 'pass',
      message: 'Search query builder working correctly',
      details: {
        sampleQuery: query,
        hasQuery: !!query.query,
        hasFilters: query.query?.bool?.filter?.length > 0,
        hasAggregations: !!query.aggs,
        hasPagination:
          typeof query.size === 'number' && typeof query.from === 'number',
      },
    });
  } catch (error) {
    tests.push({
      name: 'Search Query Builder',
      status: 'fail',
      message: `Search query builder failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error },
    });
  }

  // Test 5: Index mappings validation
  let mappingTests = 0;
  let mappingPassed = 0;

  for (const [indexName, config] of Object.entries(INDEX_CONFIGS)) {
    mappingTests++;

    const hasProperties =
      config.mapping?.properties &&
      Object.keys(config.mapping.properties).length > 0;
    const hasSettings =
      config.settings && Object.keys(config.settings).length > 0;

    if (hasProperties && hasSettings) {
      mappingPassed++;
    }
  }

  tests.push({
    name: 'Index Mappings Validation',
    status: mappingPassed === mappingTests ? 'pass' : 'fail',
    message: `${mappingPassed}/${mappingTests} index mappings are valid`,
    details: {
      total: mappingTests,
      passed: mappingPassed,
      indices: Object.keys(INDEX_CONFIGS),
    },
  });

  // Test 6: Required dependencies
  try {
    require('@elastic/elasticsearch');
    tests.push({
      name: 'Elasticsearch Client Dependency',
      status: 'pass',
      message: '@elastic/elasticsearch package is available',
    });
  } catch (error) {
    tests.push({
      name: 'Elasticsearch Client Dependency',
      status: 'fail',
      message: '@elastic/elasticsearch package not found or not installed',
      details: { error },
    });
  }

  return tests;
}

function displayTestResults(tests: ConfigTest[]) {
  console.log('🧪 Elasticsearch Configuration Tests');
  console.log('='.repeat(50));

  let passed = 0;
  let failed = 0;
  let warnings = 0;

  tests.forEach((test, index) => {
    const icon =
      test.status === 'pass' ? '✅' : test.status === 'warning' ? '⚠️' : '❌';

    console.log(`${icon} ${index + 1}. ${test.name}`);
    console.log(`   ${test.message}`);

    if (test.status === 'pass') passed++;
    else if (test.status === 'warning') warnings++;
    else failed++;

    console.log();
  });

  console.log('='.repeat(50));
  console.log(
    `📊 Results: ${passed} passed, ${warnings} warnings, ${failed} failed`
  );

  if (failed === 0) {
    console.log('🎉 All configuration tests passed!');
    console.log('✨ Elasticsearch is properly configured and ready to use.');

    console.log('\n📋 Next steps:');
    console.log('   1. Start Elasticsearch service (Docker or local)');
    console.log('   2. Run: npm run es:init');
    console.log('   3. Run: npm run es:health');
    console.log('   4. Test search functionality');
  } else {
    console.log('⚠️  Some configuration issues need to be resolved.');
    console.log('🔧 Please review the failed tests above.');
  }

  return failed === 0;
}

function generateSampleQueries() {
  console.log('\n🔍 Sample Elasticsearch Queries');
  console.log('='.repeat(40));

  const samples = [
    {
      name: 'Basic Text Search',
      query: new SearchQueryBuilder()
        .setQuery('machine learning hackathon')
        .setPagination(1, 10)
        .build(),
    },
    {
      name: 'Filtered Search',
      query: new SearchQueryBuilder()
        .setQuery('internship')
        .addFilters({
          skills: ['python', 'javascript'],
          organizerType: 'corporate',
          mode: 'online',
        })
        .setPagination(1, 20)
        .build(),
    },
    {
      name: 'Search with Aggregations',
      query: new SearchQueryBuilder()
        .setQuery('workshop')
        .addAggregations()
        .build(),
    },
  ];

  samples.forEach((sample, index) => {
    console.log(`${index + 1}. ${sample.name}:`);
    console.log(JSON.stringify(sample.query, null, 2));
    console.log();
  });
}

async function runTests(
  options: { verbose?: boolean; samples?: boolean } = {}
) {
  try {
    console.log('🔧 OpportuneX Elasticsearch Configuration Test');
    console.log('='.repeat(50));

    const tests = runConfigurationTests();
    const allPassed = displayTestResults(tests);

    if (options.verbose) {
      console.log('\n📋 Detailed Test Results:');
      tests.forEach((test, index) => {
        console.log(`\n${index + 1}. ${test.name}:`);
        console.log(`   Status: ${test.status}`);
        console.log(`   Message: ${test.message}`);
        if (test.details) {
          console.log(`   Details:`, JSON.stringify(test.details, null, 2));
        }
      });
    }

    if (options.samples) {
      generateSampleQueries();
    }

    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    console.error('💥 Configuration test failed:', error);
    process.exit(1);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    samples: args.includes('--samples') || args.includes('-s'),
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔧 Elasticsearch Configuration Test

Usage: tsx src/scripts/test-elasticsearch-config.ts [options]

Options:
  -h, --help     Show this help message
  -v, --verbose  Show detailed test results
  -s, --samples  Show sample Elasticsearch queries

Examples:
  tsx src/scripts/test-elasticsearch-config.ts
  tsx src/scripts/test-elasticsearch-config.ts --verbose
  tsx src/scripts/test-elasticsearch-config.ts --samples
`);
    process.exit(0);
  }

  runTests(options);
}

export { displayTestResults, runConfigurationTests };
