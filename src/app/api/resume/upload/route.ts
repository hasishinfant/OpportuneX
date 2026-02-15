import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const MAIN_SERVER_URL = process.env.MAIN_SERVER_URL || 'http://localhost:5001';

export async function POST(request: NextRequest) {
  try {
    console.log('Resume upload API called');
    console.log('MAIN_SERVER_URL:', MAIN_SERVER_URL);

    const formData = await request.formData();
    console.log('FormData received, forwarding to main server...');

    // Forward the form data to main server (which has resume upload functionality)
    const response = await fetch(`${MAIN_SERVER_URL}/api/resume/upload`, {
      method: 'POST',
      body: formData,
    });

    console.log('Main server response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Main server error:', errorData);
      throw new Error(
        errorData.error || `Server responded with status: ${response.status}`
      );
    }

    const data = await response.json();
    console.log('Resume upload successful:', data.file.originalName);
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error uploading resume:', error);
    return NextResponse.json(
      { error: 'Failed to upload resume' },
      { status: 500 }
    );
  }
}
