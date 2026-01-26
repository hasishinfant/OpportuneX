'use client';

import { Layout } from '@/components/layout/Layout';
import { Clock, MapPin } from 'lucide-react';
import { useEffect, useState } from 'react';

interface BackendOpportunity {
  _id: string;
  title: string;
  description: string;
  category: 'hackathon' | 'internship' | 'workshop' | 'quiz';
  platform: string;
  skills_required: string[];
  organizer_type: 'company' | 'startup' | 'college';
  mode: 'online' | 'offline' | 'hybrid';
  location: {
    city: string;
    state: string;
    country: string;
  };
  start_date: string;
  deadline: string;
  official_link: string;
  tags: string[];
}

async function fetchOpportunities(): Promise<BackendOpportunity[]> {
  try {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5002';

    const response = await fetch(
      `${backendUrl}/api/opportunities?limit=12`,
      {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.data) {
      return data.data.map((opportunity: any) => ({
        ...opportunity,
        category: opportunity.type,
        official_link: opportunity.external_url,
        start_date: opportunity.dates?.start_date || opportunity.start_date,
        deadline:
          opportunity.dates?.registration_deadline || opportunity.deadline,
        location: {
          city: opportunity.location?.city || 'Various',
          state: opportunity.location?.state || '',
          country: opportunity.location?.country || 'Global',
        },
        organizer_type: opportunity.organizer_type || 'company',
        platform: opportunity.source?.platform || 'MLH',
      }));
    }

    return [];
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    return [];
  }
}

// ✅ Hydration-safe date formatting
function formatDate(dateString: string): string {
  if (!dateString) return 'TBA';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return 'TBA';
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
}

export default function SearchPage() {
  const [opportunities, setOpportunities] = useState<BackendOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const loadOpportunities = async () => {
      try {
        setLoading(true);
        const data = await fetchOpportunities();
        setOpportunities(data);
      } catch (err) {
        setError('Failed to load opportunities');
        console.error('Error loading opportunities:', err);
      } finally {
        setLoading(false);
      }
    };

    loadOpportunities();
  }, []);

  // ✅ Prevent hydration mismatch
  if (!mounted) return null;

  if (loading) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">
              Loading opportunities...
            </span>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="text-center py-12">
            <p className="text-red-500 text-lg">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          Discover Opportunities
        </h1>

        <div className="mb-6">
          <p className="text-gray-600 dark:text-gray-400">
            Found {opportunities.length} opportunities
          </p>
        </div>

        {opportunities.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400 text-lg">
              No opportunities found.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {opportunities.map((opportunity) => (
              <div
                key={opportunity._id}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {opportunity.title}
                  </h3>
                  <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm font-medium rounded-full">
                    {opportunity.category}
                  </span>
                </div>

                <p className="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">
                  {opportunity.description}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {opportunity.mode} • {opportunity.location.city},{' '}
                      {opportunity.location.country}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="h-4 w-4" />
                    <span>Deadline: {formatDate(opportunity.deadline)}</span>
                  </div>
                </div>

                {opportunity.skills_required?.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Skills Required:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {opportunity.skills_required.slice(0, 6).map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded"
                        >
                          {skill}
                        </span>
                      ))}
                      {opportunity.skills_required.length > 6 && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs rounded">
                          +{opportunity.skills_required.length - 6} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <span>Platform: {opportunity.platform}</span>
                  </div>
                  <a
                    href={opportunity.official_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                  >
                    Apply Now
                    <svg
                      className="ml-2 h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
