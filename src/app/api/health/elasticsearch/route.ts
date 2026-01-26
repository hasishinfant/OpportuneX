import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { generateHealthReport } from '../../../../scripts/elasticsearch-health';

// GET /api/health/elasticsearch
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    // Generate health report
    const healthReport = await generateHealthReport();

    // Determine overall health status
    const isHealthy =
      healthReport.connection.status === 'healthy' &&
      Object.values(healthReport.indices).every(idx => idx.exists) &&
      (healthReport.cluster.status === 'green' ||
        healthReport.cluster.status === 'yellow');

    const response = {
      success: true,
      healthy: isHealthy,
      timestamp: healthReport.timestamp,
      status: isHealthy ? 'healthy' : 'unhealthy',
      connection: healthReport.connection,
      cluster: healthReport.cluster,
      configuration: healthReport.configuration,
    };

    // Add detailed information if requested
    if (detailed) {
      (response as any).indices = healthReport.indices;
    } else {
      // Provide summary of indices
      const totalIndices = Object.keys(healthReport.indices).length;
      const healthyIndices = Object.values(healthReport.indices).filter(
        idx => idx.exists
      ).length;
      const totalDocs = Object.values(healthReport.indices)
        .filter(idx => idx.documents !== undefined)
        .reduce((sum, idx) => sum + (idx.documents || 0), 0);

      (response as any).indices = {
        total: totalIndices,
        healthy: healthyIndices,
        totalDocuments: totalDocs,
      };
    }

    // Return appropriate HTTP status
    const httpStatus = isHealthy ? 200 : 503;

    return NextResponse.json(response, { status: httpStatus });
  } catch (error) {
    console.error('Elasticsearch health check API error:', error);

    return NextResponse.json(
      {
        success: false,
        healthy: false,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      },
      { status: 503 }
    );
  }
}
