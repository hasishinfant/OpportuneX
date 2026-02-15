import { healthCheckService } from '@/lib/health-checks';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/health/live
 * Kubernetes liveness probe endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const liveness = await healthCheckService.getLivenessStatus();
    const statusCode = liveness.alive ? 200 : 503;

    return NextResponse.json(liveness, { status: statusCode });
  } catch (error) {
    return NextResponse.json(
      {
        alive: false,
        error: error instanceof Error ? error.message : 'Liveness check failed',
      },
      { status: 503 }
    );
  }
}
