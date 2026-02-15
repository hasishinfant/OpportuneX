import { advancedAnalyticsService } from '@/lib/services/advanced-analytics.service';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { format, dateRange, metrics } = body;

    if (!format || !dateRange) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters',
        },
        { status: 400 }
      );
    }

    const result = await advancedAnalyticsService.exportAnalytics(
      {
        format,
        dateRange: {
          start: new Date(dateRange.start),
          end: new Date(dateRange.end),
        },
        metrics: metrics || [],
      },
      undefined // userId would come from auth
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    // Set appropriate headers based on format
    const headers: Record<string, string> = {};
    const filename = `analytics-${Date.now()}.${format}`;

    if (format === 'csv') {
      headers['Content-Type'] = 'text/csv';
      headers['Content-Disposition'] = `attachment; filename="${filename}"`;
    } else if (format === 'json') {
      headers['Content-Type'] = 'application/json';
      headers['Content-Disposition'] = `attachment; filename="${filename}"`;
    }

    return new NextResponse(result.data, { headers });
  } catch (error) {
    console.error('Export API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to export analytics',
      },
      { status: 500 }
    );
  }
}
