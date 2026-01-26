import { healthCheckService } from '@/lib/health-checks';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/health
 * Comprehensive health check endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const healthStatus = await healthCheckService.runAllChecks();
    
    // Return appropriate status code based on health
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    return NextResponse.json(healthStatus, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Health check failed',
        timestamp: new Date(),
      },
      { status: 503 }
    );
  }
}