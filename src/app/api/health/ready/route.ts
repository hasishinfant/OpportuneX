import { healthCheckService } from '@/lib/health-checks';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/health/ready
 * Kubernetes readiness probe endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const readiness = await healthCheckService.getReadinessStatus();
    const statusCode = readiness.ready ? 200 : 503;
    
    return NextResponse.json(readiness, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        ready: false,
        error: error instanceof Error ? error.message : 'Readiness check failed',
      },
      { status: 503 }
    );
  }
}