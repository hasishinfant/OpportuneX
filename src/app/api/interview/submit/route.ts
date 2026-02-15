import { interviewPrepService } from '@/lib/services/interview-prep.service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, questionId, answer, responseTime } = body;

    if (!sessionId || !questionId || !answer) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await interviewPrepService.submitAnswer({
      sessionId,
      questionId,
      answer,
      responseTime,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Submit answer error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
