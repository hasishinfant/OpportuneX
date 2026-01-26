import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  SearchService,
  UserBehaviorTracker,
} from '../../../../lib/search-utils';
import type { SearchRequest, SearchFilters } from '../../../../types';

// Request validation schema
const searchRequestSchema = z.object({
  query: z.string().min(1, 'Query is required').max(500, 'Query too long'),
  filters: z
    .object({
      skills: z.array(z.string()).optional(),
      organizerType: z
        .enum(['corporate', 'startup', 'government', 'academic'])
        .optional(),
      mode: z.enum(['online', 'offline', 'hybrid']).optional(),
      location: z.string().optional(),
      type: z.enum(['hackathon', 'internship', 'workshop']).optional(),
    })
    .optional(),
  pagination: z
    .object({
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(100).default(20),
    })
    .optional(),
  userId: z.string().optional(),
});

// GET /api/search/opportunities
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract query parameters
    const query = searchParams.get('q') || searchParams.get('query') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const userId = searchParams.get('userId') || undefined;

    // Extract filters
    const filters: SearchFilters = {};

    const skills = searchParams.get('skills');
    if (skills) {
      filters.skills = skills
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
    }

    const organizerType = searchParams.get('organizerType');
    if (
      organizerType &&
      ['corporate', 'startup', 'government', 'academic'].includes(organizerType)
    ) {
      filters.organizerType = organizerType as any;
    }

    const mode = searchParams.get('mode');
    if (mode && ['online', 'offline', 'hybrid'].includes(mode)) {
      filters.mode = mode as any;
    }

    const location = searchParams.get('location');
    if (location) {
      filters.location = location;
    }

    const type = searchParams.get('type');
    if (type && ['hackathon', 'internship', 'workshop'].includes(type)) {
      filters.type = type as any;
    }

    // Validate request
    const validatedRequest = searchRequestSchema.parse({
      query,
      filters: Object.keys(filters).length > 0 ? filters : undefined,
      pagination: { page, limit },
      userId,
    });

    // Perform search
    const searchRequest: SearchRequest = {
      query: validatedRequest.query,
      filters: validatedRequest.filters,
      pagination: validatedRequest.pagination,
      userId: validatedRequest.userId,
    };

    const searchResponse =
      await SearchService.searchOpportunities(searchRequest);

    // Track search behavior (fire and forget)
    if (validatedRequest.userId || request.headers.get('x-session-id')) {
      UserBehaviorTracker.trackSearch({
        userId: validatedRequest.userId,
        sessionId: request.headers.get('x-session-id') || `anon_${Date.now()}`,
        query: validatedRequest.query,
        filters: validatedRequest.filters,
        resultCount: searchResponse.totalCount,
      }).catch(error => {
        console.error('Failed to track search behavior:', error);
      });
    }

    return NextResponse.json({
      success: true,
      data: searchResponse,
    });
  } catch (error) {
    console.error('Search API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request parameters',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      error.message === 'Search service unavailable'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Search service is temporarily unavailable',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// POST /api/search/opportunities
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedRequest = searchRequestSchema.parse(body);

    // Perform search
    const searchRequest: SearchRequest = {
      query: validatedRequest.query,
      filters: validatedRequest.filters,
      pagination: validatedRequest.pagination,
      userId: validatedRequest.userId,
    };

    const searchResponse =
      await SearchService.searchOpportunities(searchRequest);

    // Track search behavior (fire and forget)
    if (validatedRequest.userId || request.headers.get('x-session-id')) {
      UserBehaviorTracker.trackSearch({
        userId: validatedRequest.userId,
        sessionId: request.headers.get('x-session-id') || `anon_${Date.now()}`,
        query: validatedRequest.query,
        filters: validatedRequest.filters,
        resultCount: searchResponse.totalCount,
      }).catch(error => {
        console.error('Failed to track search behavior:', error);
      });
    }

    return NextResponse.json({
      success: true,
      data: searchResponse,
    });
  } catch (error) {
    console.error('Search API error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    if (
      error instanceof Error &&
      error.message === 'Search service unavailable'
    ) {
      return NextResponse.json(
        {
          success: false,
          error: 'Search service is temporarily unavailable',
        },
        { status: 503 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
