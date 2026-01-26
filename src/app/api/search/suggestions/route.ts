import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SearchService } from '../../../../lib/search-utils';

// Request validation schema
const suggestionsRequestSchema = z.object({
  query: z.string().min(1, 'Query is required').max(100, 'Query too long'),
  limit: z.number().min(1).max(20).default(5),
});

// GET /api/search/suggestions
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const query = searchParams.get('q') || searchParams.get('query') || '';
    const limit = parseInt(searchParams.get('limit') || '5');

    // Validate request
    const validatedRequest = suggestionsRequestSchema.parse({
      query,
      limit,
    });

    // Get suggestions
    const suggestions = await SearchService.getSuggestions(
      validatedRequest.query,
      validatedRequest.limit
    );

    return NextResponse.json({
      success: true,
      data: {
        query: validatedRequest.query,
        suggestions,
      },
    });
  } catch (error) {
    console.error('Suggestions API error:', error);

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

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}

// POST /api/search/suggestions
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const validatedRequest = suggestionsRequestSchema.parse(body);

    // Get suggestions
    const suggestions = await SearchService.getSuggestions(
      validatedRequest.query,
      validatedRequest.limit
    );

    return NextResponse.json({
      success: true,
      data: {
        query: validatedRequest.query,
        suggestions,
      },
    });
  } catch (error) {
    console.error('Suggestions API error:', error);

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

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
