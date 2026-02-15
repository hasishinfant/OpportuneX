import { advancedAnalyticsService } from '@/lib/services/advanced-analytics.service';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // In a real implementation, verify admin authentication here
    // For now, we'll assume the middleware handles it

    const searchParams = request.nextUrl.searchParams;
    const start = searchParams.get('start');
    const end = searchParams.get('end');

    const dateRange =
      start && end
        ? {
            start: new Date(start),
            end: new Date(end),
          }
        : undefined;

    const result = await advancedAnalyticsService.getDashboardMetrics(
      undefined, // userId would come from auth
      dateRange
    );

    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve dashboard metrics',
      },
      { status: 500 }
    );
  }
}
