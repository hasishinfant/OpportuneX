import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withCache, CacheConfigs } from '@/lib/cache-middleware';

/**
 * Demo API route showing Redis caching in action
 * This endpoint simulates a slow operation and demonstrates caching benefits
 */
async function handler(req: NextRequest) {
  const url = new URL(req.url);
  const delay = parseInt(url.searchParams.get('delay') || '1000');
  const data = url.searchParams.get('data') || 'default';

  // Simulate slow operation (e.g., database query, external API call)
  await new Promise(resolve => setTimeout(resolve, delay));

  const response = {
    message: 'This response was generated after a delay',
    data,
    timestamp: new Date().toISOString(),
    delay,
    cached: false, // This will be overridden by cache headers
  };

  return NextResponse.json(response);
}

// Apply caching middleware with 30-second TTL
export const GET = withCache({
  ttl: 30, // Cache for 30 seconds
  keyGenerator: (req: NextRequest) => {
    const url = new URL(req.url);
    const data = url.searchParams.get('data') || 'default';
    return `cache-demo:${data}`;
  },
})(handler);
