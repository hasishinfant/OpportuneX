'use client';

import { Card } from '@/components/ui/Card';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useEffect, useState } from 'react';
import { DateRangePicker } from './DateRangePicker';
import { ExportButton } from './ExportButton';
import { InsightsPanel } from './InsightsPanel';
import { MetricsOverview } from './MetricsOverview';
import { OpportunityAnalyticsChart } from './OpportunityAnalyticsChart';
import { PlatformUsageChart } from './PlatformUsageChart';
import { UserEngagementChart } from './UserEngagementChart';

interface DashboardMetrics {
  userEngagement: any;
  opportunityAnalytics: any;
  platformUsage: any;
  insights: any;
}

export function AnalyticsDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(),
  });
  const [activeTab, setActiveTab] = useState<
    'overview' | 'engagement' | 'opportunities' | 'usage'
  >('overview');

  useEffect(() => {
    fetchMetrics();
  }, [dateRange]);

  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        start: dateRange.start.toISOString(),
        end: dateRange.end.toISOString(),
      });

      const response = await fetch(`/api/analytics/dashboard?${params}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch metrics');
      }

      setMetrics(data.data);
    } catch (err) {
      console.error('Fetch metrics error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateRangeChange = (start: Date, end: Date) => {
    setDateRange({ start, end });
  };

  const handleRefresh = () => {
    fetchMetrics();
  };

  if (isLoading) {
    return (
      <div className='flex items-center justify-center py-12'>
        <LoadingSpinner size='lg' />
      </div>
    );
  }

  if (error) {
    return (
      <Card className='p-6'>
        <div className='text-center'>
          <p className='text-red-600 dark:text-red-400 mb-4'>{error}</p>
          <button
            onClick={handleRefresh}
            className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700'
          >
            Retry
          </button>
        </div>
      </Card>
    );
  }

  if (!metrics) {
    return null;
  }

  return (
    <div className='space-y-6'>
      {/* Controls */}
      <div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4'>
        <DateRangePicker
          startDate={dateRange.start}
          endDate={dateRange.end}
          onChange={handleDateRangeChange}
        />

        <div className='flex gap-2'>
          <button
            onClick={handleRefresh}
            className='px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600'
          >
            Refresh
          </button>
          <ExportButton dateRange={dateRange} />
        </div>
      </div>

      {/* Tabs */}
      <div className='border-b border-gray-200 dark:border-gray-700'>
        <nav className='flex space-x-8'>
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'engagement', label: 'User Engagement' },
            { id: 'opportunities', label: 'Opportunities' },
            { id: 'usage', label: 'Platform Usage' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className='space-y-6'>
          <MetricsOverview metrics={metrics} />
          <InsightsPanel insights={metrics.insights} />

          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            <UserEngagementChart data={metrics.userEngagement} compact />
            <OpportunityAnalyticsChart
              data={metrics.opportunityAnalytics}
              compact
            />
          </div>
        </div>
      )}

      {activeTab === 'engagement' && (
        <div className='space-y-6'>
          <UserEngagementChart data={metrics.userEngagement} />
        </div>
      )}

      {activeTab === 'opportunities' && (
        <div className='space-y-6'>
          <OpportunityAnalyticsChart data={metrics.opportunityAnalytics} />
        </div>
      )}

      {activeTab === 'usage' && (
        <div className='space-y-6'>
          <PlatformUsageChart data={metrics.platformUsage} />
        </div>
      )}
    </div>
  );
}
