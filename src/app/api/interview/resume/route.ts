import { interviewPrepService } from '@/lib/services/interview-prep.service';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, resumeText } = body;

    if (!userId || !resumeText) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const result = await interviewPrepService.analyzeResume(userId, resumeText);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Analyze resume error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
