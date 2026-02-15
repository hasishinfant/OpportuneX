import { interviewPrepService } from '@/lib/services/interview-prep.service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, type, difficulty, opportunityId, companyName, duration } =
      body;

    if (!userId || !type || !difficulty) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await interviewPrepService.startSession({
      userId,
      type,
      difficulty,
      opportunityId,
      companyName,
      duration,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Start interview error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
