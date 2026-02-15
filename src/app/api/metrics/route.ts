import { metricsCollector } from '@/lib/metrics-collector';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * GET /api/metrics
 * Prometheus-compatible metrics endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get('format') || 'prometheus';

    if (format === 'prometheus') {
      const prometheusMetrics = metricsCollector.exportPrometheusMetrics();

      return new NextResponse(prometheusMetrics, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; version=0.0.4; charset=utf-8',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    } else if (format === 'json') {
      const allMetrics = metricsCollector.getRegistry().getAllMetrics();
      const summary = metricsCollector.getMetricsSummary();

      return NextResponse.json({
        summary,
        metrics: allMetrics,
        timestamp: new Date().toISOString(),
      });
    } else {
      return NextResponse.json(
        { error: 'Unsupported format. Use "prometheus" or "json"' },
        { status: 400 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to export metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
