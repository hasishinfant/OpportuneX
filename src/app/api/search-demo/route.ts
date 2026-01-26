import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withCache, CacheConfigs } from '@/lib/cache-middleware';
import { SearchCache } from '@/lib/cache';

/**
 * Demo search API route with Redis caching
 * Simulates search functionality with caching
 */
async function handler(req: NextRequest) {
  const url = new URL(req.url);
  const query = url.searchParams.get('q') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '10');

  // Simulate search operation
  const mockResults = Array.from({ length: limit }, (_, i) => ({
    id: `result-${page}-${i + 1}`,
    title: `Search result for "${query}" - Item ${(page - 1) * limit + i + 1}`,
    description: `This is a mock search result for query: ${query}`,
    type: 'hackathon' as const,
    relevanceScore: Math.random(),
  }));

  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 500));

  const response = {
    query,
    results: mockResults,
    pagination: {
      page,
      limit,
      total: 100, // Mock total
      hasNext: page * limit < 100,
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(response);
}

// Apply search-specific caching
export const GET = withCache(CacheConfigs.searchResults)(handler);
