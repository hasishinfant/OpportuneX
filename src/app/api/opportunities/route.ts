import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Forward all query parameters to backend
    const queryString = searchParams.toString();
    const backendUrl = `${BACKEND_URL}/api/opportunities${queryString ? `?${queryString}` : ''}`;
    
    const response = await fetch(backendUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Backend responded with status: ${response.status}`);
    }

    const backendData = await response.json();
    
    // Transform backend data to match frontend expectations
    if (backendData.success && backendData.data) {
      const transformedData = backendData.data.map((opportunity: any) => ({
        ...opportunity,
        category: opportunity.type, // Map type to category
        official_link: opportunity.external_url, // Map external_url to official_link
        start_date: opportunity.dates?.start_date || opportunity.start_date,
        deadline: opportunity.dates?.registration_deadline || opportunity.deadline,
        // Ensure location has the expected structure
        location: {
          city: opportunity.location?.city || 'Various',
          state: opportunity.location?.state || '',
          country: opportunity.location?.country || 'Global',
        },
        // Map organizer_type if needed
        organizer_type: opportunity.organizer_type || 'company',
        // Ensure platform field exists
        platform: opportunity.source?.platform || 'MLH',
      }));

      return NextResponse.json({
        ...backendData,
        data: transformedData,
      });
    }

    return NextResponse.json(backendData);
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch opportunities' },
      { status: 500 }
    );
  }
}