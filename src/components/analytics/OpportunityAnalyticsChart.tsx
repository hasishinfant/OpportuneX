'use client';

import { Card } from '@/components/ui/Card';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface OpportunityAnalyticsChartProps {
  data: {
    totalOpportunities: number;
    totalViews: number;
    totalApplications: number;
    successRate: number;
    viewsByType: Array<{ type: string; count: number }>;
    applicationsByType: Array<{ type: string; count: number }>;
    topOpportunities: Array<{
      id: string;
      title: string;
      views: number;
      favorites: number;
      applicationRate: number;
    }>;
    conversionFunnel: {
      views: number;
      favorites: number;
      applications: number;
    };
  };
  compact?: boolean;
}

export function OpportunityAnalyticsChart({
  data,
  compact = false,
}: OpportunityAnalyticsChartProps) {
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  // Views by type pie chart
  const viewsByTypeData = {
    labels: data.viewsByType.map(
      v => v.type.charAt(0).toUpperCase() + v.type.slice(1)
    ),
    datasets: [
      {
        label: 'Views',
        data: data.viewsByType.map(v => v.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.6)',
          'rgba(16, 185, 129, 0.6)',
          'rgba(245, 158, 11, 0.6)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(16, 185, 129)',
          'rgb(245, 158, 11)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Top opportunities bar chart
  const topOpportunitiesData = {
    labels: data.topOpportunities
      .slice(0, 5)
      .map(o =>
        o.title.length > 30 ? o.title.substring(0, 30) + '...' : o.title
      ),
    datasets: [
      {
        label: 'Views',
        data: data.topOpportunities.slice(0, 5).map(o => o.views),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
      {
        label: 'Favorites',
        data: data.topOpportunities.slice(0, 5).map(o => o.favorites),
        backgroundColor: 'rgba(245, 158, 11, 0.6)',
        borderColor: 'rgb(245, 158, 11)',
        borderWidth: 1,
      },
    ],
  };

  // Conversion funnel data
  const conversionFunnelData = {
    labels: ['Views', 'Favorites', 'Applications'],
    datasets: [
      {
        label: 'Count',
        data: [
          data.conversionFunnel.views,
          data.conversionFunnel.favorites,
          data.conversionFunnel.applications,
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.6)',
          'rgba(245, 158, 11, 0.6)',
          'rgba(16, 185, 129, 0.6)',
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(245, 158, 11)',
          'rgb(16, 185, 129)',
        ],
        borderWidth: 1,
      },
    ],
  };

  if (compact) {
    return (
      <Card className='p-6'>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
          Opportunity Analytics
        </h3>
        <div className='h-64 flex items-center justify-center'>
          <Pie data={viewsByTypeData} />
        </div>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Key Metrics */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <Card className='p-4'>
          <p className='text-sm text-gray-600 dark:text-gray-400'>
            Total Opportunities
          </p>
          <p className='text-2xl font-bold text-gray-900 dark:text-white mt-1'>
            {data.totalOpportunities.toLocaleString()}
          </p>
        </Card>
        <Card className='p-4'>
          <p className='text-sm text-gray-600 dark:text-gray-400'>
            Total Views
          </p>
          <p className='text-2xl font-bold text-gray-900 dark:text-white mt-1'>
            {data.totalViews.toLocaleString()}
          </p>
        </Card>
        <Card className='p-4'>
          <p className='text-sm text-gray-600 dark:text-gray-400'>
            Applications
          </p>
          <p className='text-2xl font-bold text-gray-900 dark:text-white mt-1'>
            {data.totalApplications.toLocaleString()}
          </p>
        </Card>
        <Card className='p-4'>
          <p className='text-sm text-gray-600 dark:text-gray-400'>
            Success Rate
          </p>
          <p className='text-2xl font-bold text-gray-900 dark:text-white mt-1'>
            {data.successRate.toFixed(1)}%
          </p>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Views by Type */}
        <Card className='p-6'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
            Opportunities by Type
          </h3>
          <div className='h-80 flex items-center justify-center'>
            <Pie
              data={viewsByTypeData}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: {
                    position: 'bottom' as const,
                  },
                },
              }}
            />
          </div>
        </Card>

        {/* Conversion Funnel */}
        <Card className='p-6'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
            Conversion Funnel
          </h3>
          <div className='h-80'>
            <Bar
              data={conversionFunnelData}
              options={{
                ...chartOptions,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
              }}
            />
          </div>
          <div className='mt-4 space-y-2'>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-600 dark:text-gray-400'>
                View to Favorite:
              </span>
              <span className='font-semibold text-gray-900 dark:text-white'>
                {(
                  (data.conversionFunnel.favorites /
                    data.conversionFunnel.views) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-600 dark:text-gray-400'>
                Favorite to Application:
              </span>
              <span className='font-semibold text-gray-900 dark:text-white'>
                {(
                  (data.conversionFunnel.applications /
                    data.conversionFunnel.favorites) *
                  100
                ).toFixed(1)}
                %
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Top Opportunities */}
      <Card className='p-6'>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
          Top Performing Opportunities
        </h3>
        <div className='h-80'>
          <Bar
            data={topOpportunitiesData}
            options={{
              ...chartOptions,
              indexAxis: 'y' as const,
            }}
          />
        </div>
      </Card>
    </div>
  );
}
