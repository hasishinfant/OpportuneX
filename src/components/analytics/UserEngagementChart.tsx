'use client';

import { Card } from '@/components/ui/Card';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface UserEngagementChartProps {
  data: {
    totalSearches: number;
    totalFavorites: number;
    roadmapCompletions: number;
    activeUsers: {
      daily: number;
      weekly: number;
      monthly: number;
    };
    engagementRate: number;
    retentionRate: number;
    searchTrends: Array<{ date: string; value: number }>;
    topSearchTerms: Array<{ term: string; count: number }>;
  };
  compact?: boolean;
}

export function UserEngagementChart({
  data,
  compact = false,
}: UserEngagementChartProps) {
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

  // Search trends line chart data
  const searchTrendsData = {
    labels: data.searchTrends.map(t =>
      new Date(t.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    ),
    datasets: [
      {
        label: 'Searches',
        data: data.searchTrends.map(t => t.value),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  // Top search terms bar chart data
  const topTermsData = {
    labels: data.topSearchTerms.slice(0, 10).map(t => t.term),
    datasets: [
      {
        label: 'Search Count',
        data: data.topSearchTerms.slice(0, 10).map(t => t.count),
        backgroundColor: 'rgba(147, 51, 234, 0.6)',
        borderColor: 'rgb(147, 51, 234)',
        borderWidth: 1,
      },
    ],
  };

  // Active users doughnut chart data
  const activeUsersData = {
    labels: ['Daily', 'Weekly', 'Monthly'],
    datasets: [
      {
        label: 'Active Users',
        data: [
          data.activeUsers.daily,
          data.activeUsers.weekly,
          data.activeUsers.monthly,
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.6)',
          'rgba(59, 130, 246, 0.6)',
          'rgba(168, 85, 247, 0.6)',
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(59, 130, 246)',
          'rgb(168, 85, 247)',
        ],
        borderWidth: 1,
      },
    ],
  };

  if (compact) {
    return (
      <Card className='p-6'>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
          User Engagement
        </h3>
        <div className='h-64'>
          <Line data={searchTrendsData} options={chartOptions} />
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
            Engagement Rate
          </p>
          <p className='text-2xl font-bold text-gray-900 dark:text-white mt-1'>
            {data.engagementRate.toFixed(1)}%
          </p>
        </Card>
        <Card className='p-4'>
          <p className='text-sm text-gray-600 dark:text-gray-400'>
            Retention Rate
          </p>
          <p className='text-2xl font-bold text-gray-900 dark:text-white mt-1'>
            {data.retentionRate.toFixed(1)}%
          </p>
        </Card>
        <Card className='p-4'>
          <p className='text-sm text-gray-600 dark:text-gray-400'>
            Total Searches
          </p>
          <p className='text-2xl font-bold text-gray-900 dark:text-white mt-1'>
            {data.totalSearches.toLocaleString()}
          </p>
        </Card>
        <Card className='p-4'>
          <p className='text-sm text-gray-600 dark:text-gray-400'>
            Roadmap Completions
          </p>
          <p className='text-2xl font-bold text-gray-900 dark:text-white mt-1'>
            {data.roadmapCompletions}
          </p>
        </Card>
      </div>

      {/* Search Trends */}
      <Card className='p-6'>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
          Search Activity Over Time
        </h3>
        <div className='h-80'>
          <Line data={searchTrendsData} options={chartOptions} />
        </div>
      </Card>

      {/* Charts Grid */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Top Search Terms */}
        <Card className='p-6'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
            Top Search Terms
          </h3>
          <div className='h-80'>
            <Bar
              data={topTermsData}
              options={{
                ...chartOptions,
                indexAxis: 'y' as const,
              }}
            />
          </div>
        </Card>

        {/* Active Users Breakdown */}
        <Card className='p-6'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
            Active Users Breakdown
          </h3>
          <div className='h-80 flex items-center justify-center'>
            <Doughnut
              data={activeUsersData}
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
      </div>
    </div>
  );
}
