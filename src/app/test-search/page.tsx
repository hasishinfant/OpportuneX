'use client';

import { useEffect, useState } from 'react';

interface BackendOpportunity {
  _id: string;
  title: string;
  description: string;
  type: string;
  external_url: string;
  location: {
    city: string;
    state: string;
    country: string;
  };
  dates: {
    start_date: string;
    registration_deadline: string;
  };
  skills_required: string[];
  source: {
    platform: string;
  };
}

export default function TestSearchPage() {
  const [opportunities, setOpportunities] = useState<BackendOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('🔍 Starting fetch...');
        setLoading(true);

        const backendUrl =
          process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';
        const url = `${backendUrl}/api/opportunities?limit=12`;

        console.log('📡 Fetching from:', url);

        const response = await fetch(url, {
          cache: 'no-store',
          headers: { 'Cache-Control': 'no-cache' },
        });

        console.log('📊 Response status:', response.status);
        console.log('📊 Response ok:', response.ok);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 Raw data:', data);

        setDebugInfo({
          success: data.success,
          dataCount: data.data ? data.data.length : 0,
          hasData: !!data.data,
          backendUrl,
          url,
        });

        if (data.success && data.data) {
          console.log('✅ Setting opportunities:', data.data.length);
          setOpportunities(data.data);
        } else {
          console.log('❌ No data in response');
          setError('No data received from backend');
        }
      } catch (err) {
        console.error('❌ Fetch error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className='p-8'>
        <h1 className='text-2xl font-bold mb-4'>Test Search Page</h1>
        <div className='flex items-center gap-2'>
          <div className='animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600'></div>
          <span>Loading opportunities...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='p-8'>
        <h1 className='text-2xl font-bold mb-4'>Test Search Page</h1>
        <div className='bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4'>
          <strong>Error:</strong> {error}
        </div>
        {debugInfo && (
          <div className='bg-gray-100 p-4 rounded'>
            <h3 className='font-bold mb-2'>Debug Info:</h3>
            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className='p-8'>
      <h1 className='text-2xl font-bold mb-4'>Test Search Page</h1>

      {debugInfo && (
        <div className='bg-green-100 p-4 rounded mb-4'>
          <h3 className='font-bold mb-2'>Debug Info:</h3>
          <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
        </div>
      )}

      <div className='mb-4'>
        <p className='text-gray-600'>
          Found {opportunities.length} opportunities
        </p>
      </div>

      {opportunities.length === 0 ? (
        <div className='text-center py-8'>
          <p className='text-gray-500'>No opportunities found.</p>
        </div>
      ) : (
        <div className='space-y-4'>
          {opportunities.map(opportunity => (
            <div
              key={opportunity._id}
              className='bg-white border border-gray-200 p-4 rounded-lg shadow-sm'
            >
              <h3 className='text-lg font-semibold mb-2'>
                {opportunity.title}
              </h3>
              <p className='text-gray-600 mb-2'>{opportunity.description}</p>
              <div className='text-sm text-gray-500'>
                <p>Type: {opportunity.type}</p>
                <p>
                  Location: {opportunity.location?.city},{' '}
                  {opportunity.location?.country}
                </p>
                <p>Platform: {opportunity.source?.platform}</p>
              </div>
              <a
                href={opportunity.external_url}
                target='_blank'
                rel='noopener noreferrer'
                className='inline-block mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700'
              >
                Apply Now
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
