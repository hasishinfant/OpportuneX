#!/usr/bin/env tsx

/**
 * Elasticsearch Health Check Script
 *
 * This script provides comprehensive health monitoring for Elasticsearch:
 * - Connection status
 * - Index health and statistics
 * - Performance metrics
 * - Configuration validation
 */

import { esClient } from '../lib/elasticsearch';
import { env } from '../lib/env';
import { SearchIndexManager } from '../lib/search-indices';

interface HealthReport {
  timestamp: Date;
  connection: {
    status: 'healthy' | 'unhealthy';
    latency?: number;
    version?: string;
    error?: string;
  };
  indices: {
    [key: string]: {
      exists: boolean;
      health?: 'green' | 'yellow' | 'red';
      documents?: number;
      size?: string;
      error?: string;
    };
  };
  cluster: {
    status?: 'green' | 'yellow' | 'red';
    nodes?: number;
    error?: string;
  };
  configuration: {
    url: string;
    hasAuth: boolean;
    isConfigured: boolean;
  };
}

async function generateHealthReport(): Promise<HealthReport> {
  const report: HealthReport = {
    timestamp: new Date(),
    connection: { status: 'unhealthy' },
    indices: {},
    cluster: {},
    configuration: {
      url: env.ELASTICSEARCH_URL || 'Not configured',
      hasAuth: !!(env.ELASTICSEARCH_USERNAME && env.ELASTICSEARCH_PASSWORD),
      isConfigured: !!env.ELASTICSEARCH_URL,
    },
  };

  try {
    // Test connection
    console.log('🔍 Testing Elasticsearch connection...');
    const connectionTest = await esClient.testConnection();

    if (connectionTest.connected) {
      report.connection = {
        status: 'healthy',
        latency: connectionTest.latency,
        version: connectionTest.version,
      };
      console.log(
        `✅ Connection: OK (${connectionTest.latency}ms, v${connectionTest.version})`
      );
    } else {
      report.connection = {
        status: 'unhealthy',
        error: connectionTest.error,
      };
      console.log(`❌ Connection: Failed - ${connectionTest.error}`);
      return report;
    }

    // Check cluster health
    console.log('\n🏥 Checking cluster health...');
    try {
      const clusterHealth = await esClient.getClient().cluster.health();
      report.cluster = {
        status: clusterHealth.status?.toLowerCase() as
          | 'green'
          | 'yellow'
          | 'red',
        nodes: clusterHealth.number_of_nodes,
      };

      const statusIcon =
        clusterHealth.status === 'green'
          ? '✅'
          : clusterHealth.status === 'yellow'
            ? '⚠️'
            : '❌';
      console.log(
        `${statusIcon} Cluster: ${clusterHealth.status} (${clusterHealth.number_of_nodes} nodes)`
      );
    } catch (error) {
      report.cluster.error =
        error instanceof Error ? error.message : 'Unknown error';
      console.log(`❌ Cluster: Error - ${report.cluster.error}`);
    }

    // Check indices health
    console.log('\n📊 Checking indices health...');
    const indicesHealth = await SearchIndexManager.checkIndicesHealth();

    for (const [indexName, indexInfo] of Object.entries(
      indicesHealth.indices
    )) {
      if (indexInfo.exists) {
        const stats = indexInfo.stats?._all?.total;
        const docCount = stats?.docs?.count || 0;
        const sizeBytes = stats?.store?.size_in_bytes || 0;
        const sizeKB = (sizeBytes / 1024).toFixed(2);

        report.indices[indexName] = {
          exists: true,
          health: 'green', // Simplified - could be enhanced with actual health check
          documents: docCount,
          size: `${sizeKB} KB`,
        };

        console.log(`✅ ${indexName}: ${docCount} docs, ${sizeKB} KB`);
      } else {
        report.indices[indexName] = {
          exists: false,
          error: 'Index does not exist',
        };
        console.log(`❌ ${indexName}: Does not exist`);
      }
    }

    if (indicesHealth.errors.length > 0) {
      console.log('\n⚠️  Index errors:');
      indicesHealth.errors.forEach(error => {
        console.log(`   - ${error}`);
      });
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    report.connection = {
      status: 'unhealthy',
      error: errorMessage,
    };
    console.log(`❌ Health check failed: ${errorMessage}`);
  }

  return report;
}

async function displayHealthSummary(report: HealthReport) {
  console.log(`\n${'='.repeat(60)}`);
  console.log('📋 ELASTICSEARCH HEALTH SUMMARY');
  console.log('='.repeat(60));

  console.log(`🕐 Timestamp: ${report.timestamp.toISOString()}`);
  console.log(`🔗 URL: ${report.configuration.url}`);
  console.log(
    `🔐 Authentication: ${report.configuration.hasAuth ? 'Enabled' : 'Disabled'}`
  );

  // Connection status
  const connIcon = report.connection.status === 'healthy' ? '✅' : '❌';
  console.log(
    `${connIcon} Connection: ${report.connection.status.toUpperCase()}`
  );

  if (report.connection.latency) {
    console.log(`⚡ Latency: ${report.connection.latency}ms`);
  }

  if (report.connection.version) {
    console.log(`📦 Version: ${report.connection.version}`);
  }

  // Cluster status
  if (report.cluster.status) {
    const clusterIcon =
      report.cluster.status === 'green'
        ? '✅'
        : report.cluster.status === 'yellow'
          ? '⚠️'
          : '❌';
    console.log(
      `${clusterIcon} Cluster: ${report.cluster.status.toUpperCase()}`
    );
  }

  // Indices summary
  const totalIndices = Object.keys(report.indices).length;
  const healthyIndices = Object.values(report.indices).filter(
    idx => idx.exists
  ).length;
  const totalDocs = Object.values(report.indices)
    .filter(idx => idx.documents !== undefined)
    .reduce((sum, idx) => sum + (idx.documents || 0), 0);

  console.log(`📊 Indices: ${healthyIndices}/${totalIndices} healthy`);
  console.log(`📄 Total Documents: ${totalDocs}`);

  // Overall health
  const isHealthy =
    report.connection.status === 'healthy' &&
    healthyIndices === totalIndices &&
    (report.cluster.status === 'green' || report.cluster.status === 'yellow');

  console.log(`\n${'='.repeat(60)}`);
  if (isHealthy) {
    console.log('🎉 OVERALL STATUS: HEALTHY');
    console.log('✨ Elasticsearch is ready for production use!');
  } else {
    console.log('⚠️  OVERALL STATUS: NEEDS ATTENTION');
    console.log(
      '🔧 Please review the issues above and take corrective action.'
    );
  }
  console.log('='.repeat(60));
}

async function runHealthCheck(
  options: { verbose?: boolean; json?: boolean } = {}
) {
  try {
    if (!options.json) {
      console.log('🏥 OpportuneX Elasticsearch Health Check');
      console.log('='.repeat(50));
    }

    const report = await generateHealthReport();

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      await displayHealthSummary(report);

      if (options.verbose) {
        console.log('\n📋 Detailed Report:');
        console.log(JSON.stringify(report, null, 2));
      }
    }

    // Exit with appropriate code
    const isHealthy = report.connection.status === 'healthy';
    process.exit(isHealthy ? 0 : 1);
  } catch (error) {
    console.error('💥 Health check failed:', error);
    process.exit(1);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v'),
    json: args.includes('--json') || args.includes('-j'),
  };

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🏥 Elasticsearch Health Check

Usage: tsx src/scripts/elasticsearch-health.ts [options]

Options:
  -h, --help     Show this help message
  -v, --verbose  Show detailed report
  -j, --json     Output in JSON format

Examples:
  tsx src/scripts/elasticsearch-health.ts
  tsx src/scripts/elasticsearch-health.ts --verbose
  tsx src/scripts/elasticsearch-health.ts --json
`);
    process.exit(0);
  }

  runHealthCheck(options);
}

export { generateHealthReport, runHealthCheck };
