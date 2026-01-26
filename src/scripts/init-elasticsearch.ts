#!/usr/bin/env tsx

/**
 * Initialize Elasticsearch indices for OpportuneX
 *
 * This script sets up the search indices required for the application:
 * - opportunities: For storing and searching opportunity data
 * - user_behavior: For tracking user interactions and analytics
 */

import { esClient } from '../lib/elasticsearch';
import { env } from '../lib/env';
import { SearchIndexManager } from '../lib/search-indices';

async function initializeElasticsearch() {
  console.log('🔍 Initializing Elasticsearch for OpportuneX...');
  console.log(
    `📍 Elasticsearch URL: ${env.ELASTICSEARCH_URL || 'Not configured'}`
  );

  try {
    // Test Elasticsearch connection
    console.log('\n📡 Testing Elasticsearch connection...');
    const connectionTest = await esClient.testConnection();

    if (!connectionTest.connected) {
      console.error(
        '❌ Failed to connect to Elasticsearch:',
        connectionTest.error
      );
      console.log('\n💡 Make sure Elasticsearch is running:');
      console.log('   - For Docker: npm run docker:dev');
      console.log('   - For local: Start Elasticsearch service');
      process.exit(1);
    }

    console.log('✅ Elasticsearch connection successful');
    console.log(`   Version: ${connectionTest.version}`);
    console.log(`   Latency: ${connectionTest.latency}ms`);

    // Check current indices health
    console.log('\n🏥 Checking existing indices...');
    const healthCheck = await SearchIndexManager.checkIndicesHealth();

    if (healthCheck.healthy) {
      console.log('✅ All indices already exist and are healthy');

      // Display index statistics
      for (const [indexName, indexInfo] of Object.entries(
        healthCheck.indices
      )) {
        if (indexInfo.exists && indexInfo.stats) {
          const docCount = indexInfo.stats._all?.total?.docs?.count || 0;
          const storeSize =
            indexInfo.stats._all?.total?.store?.size_in_bytes || 0;
          console.log(
            `   📊 ${indexName}: ${docCount} documents, ${(storeSize / 1024).toFixed(2)} KB`
          );
        }
      }

      console.log('\n🎉 Elasticsearch is ready!');
      return;
    }

    // Initialize missing indices
    console.log('\n🏗️  Creating search indices...');
    const initResult = await SearchIndexManager.initializeIndices();

    if (initResult.success) {
      console.log('✅ All indices created successfully');

      // Display results
      for (const [indexName, success] of Object.entries(initResult.results)) {
        const status = success ? '✅' : '❌';
        console.log(`   ${status} ${indexName}`);
      }
    } else {
      console.error('❌ Failed to create some indices');
      initResult.errors.forEach(error => {
        console.error(`   Error: ${error}`);
      });
      process.exit(1);
    }

    // Final health check
    console.log('\n🏥 Final health check...');
    const finalHealthCheck = await SearchIndexManager.checkIndicesHealth();

    if (finalHealthCheck.healthy) {
      console.log('✅ All indices are healthy and ready');
      console.log('\n🎉 Elasticsearch initialization completed successfully!');

      console.log('\n📋 Next steps:');
      console.log('   1. Start the development server: npm run dev');
      console.log('   2. Seed some test data: npm run db:seed');
      console.log('   3. Test search functionality in the app');
    } else {
      console.error('❌ Some indices are not healthy');
      finalHealthCheck.errors.forEach(error => {
        console.error(`   Error: ${error}`);
      });
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Elasticsearch initialization failed:', error);

    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.log(
          '\n💡 Connection refused. Make sure Elasticsearch is running:'
        );
        console.log('   - For Docker: npm run docker:dev');
        console.log('   - Check if port 9200 is accessible');
      } else if (error.message.includes('configuration is missing')) {
        console.log('\n💡 Elasticsearch configuration missing:');
        console.log('   - Set ELASTICSEARCH_URL in your .env file');
        console.log('   - Example: ELASTICSEARCH_URL=http://localhost:9200');
      }
    }

    process.exit(1);
  }
}

// Handle script execution
if (require.main === module) {
  initializeElasticsearch()
    .then(() => {
      console.log('\n✨ Elasticsearch setup complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Setup failed:', error);
      process.exit(1);
    });
}

export { initializeElasticsearch };
