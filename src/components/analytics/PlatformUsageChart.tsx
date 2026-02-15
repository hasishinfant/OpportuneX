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
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface PlatformUsageChartProps {
  data: {
    totalUsers: number;
    newUsersToday: number;
    newUsersWeek: number;
    newUsersMonth: number;
    peakUsageTimes: Array<{ hour: number; count: number }>;
    popularSkills: Array<{ skill: string; count: number }>;
    usersByTier: Array<{ tier: number; count: number }>;
    usersByState: Array<{ state: string; count: number }>;
    deviceBreakdown: {
      mobile: number;
      desktop: number;
      tablet: number;
    };
  };
}

export function PlatformUsageChart({ data }: PlatformUsageChartProps) {
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

  // Peak usage times
  const peakUsageData = {
    labels: data.peakUsageTimes.map(p => `${p.hour}:00`),
    datasets: [
      {
        label: 'Activity Count',
        data: data.peakUsageTimes.map(p => p.count),
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  };

  // Popular skills
  const popularSkillsData = {
    labels: data.popularSkills.slice(0, 10).map(s => s.skill),
    datasets: [
      {
        label: 'User Count',
        data: data.popularSkills.slice(0, 10).map(s => s.count),
        backgroundColor: 'rgba(16, 185, 129, 0.6)',
        borderColor: 'rgb(16, 185, 129)',
        borderWidth: 1,
      },
    ],
  };

  // Users by tier
  const usersByTierData = {
    labels: data.usersByTier.map(t => `Tier ${t.tier}`),
    datasets: [
      {
        label: 'Users',
        data: data.usersByTier.map(t => t.count),
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

  // Users by state
  const usersByStateData = {
    labels: data.usersByState.map(s => s.state),
    datasets: [
      {
        label: 'Users',
        data: data.usersByState.map(s => s.count),
        backgroundColor: 'rgba(147, 51, 234, 0.6)',
        borderColor: 'rgb(147, 51, 234)',
        borderWidth: 1,
      },
    ],
  };

  // Device breakdown
  const deviceBreakdownData = {
    labels: ['Mobile', 'Desktop', 'Tablet'],
    datasets: [
      {
        label: 'Users',
        data: [
          data.deviceBreakdown.mobile,
          data.deviceBreakdown.desktop,
          data.deviceBreakdown.tablet,
        ],
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

  return (
    <div className='space-y-6'>
      {/* Key Metrics */}
      <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
        <Card className='p-4'>
          <p className='text-sm text-gray-600 dark:text-gray-400'>
            Total Users
          </p>
          <p className='text-2xl font-bold text-gray-900 dark:text-white mt-1'>
            {data.totalUsers.toLocaleString()}
          </p>
        </Card>
        <Card className='p-4'>
          <p className='text-sm text-gray-600 dark:text-gray-400'>New Today</p>
          <p className='text-2xl font-bold text-gray-900 dark:text-white mt-1'>
            {data.newUsersToday}
          </p>
        </Card>
        <Card className='p-4'>
          <p className='text-sm text-gray-600 dark:text-gray-400'>
            New This Week
          </p>
          <p className='text-2xl font-bold text-gray-900 dark:text-white mt-1'>
            {data.newUsersWeek}
          </p>
        </Card>
        <Card className='p-4'>
          <p className='text-sm text-gray-600 dark:text-gray-400'>
            New This Month
          </p>
          <p className='text-2xl font-bold text-gray-900 dark:text-white mt-1'>
            {data.newUsersMonth}
          </p>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* Peak Usage Times */}
        <Card className='p-6'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
            Peak Usage Times
          </h3>
          <div className='h-80'>
            <Bar data={peakUsageData} options={chartOptions} />
          </div>
        </Card>

        {/* Device Breakdown */}
        <Card className='p-6'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
            Device Breakdown
          </h3>
          <div className='h-80 flex items-center justify-center'>
            <Doughnut
              data={deviceBreakdownData}
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

        {/* Popular Skills */}
        <Card className='p-6'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
            Most Popular Skills
          </h3>
          <div className='h-80'>
            <Bar
              data={popularSkillsData}
              options={{
                ...chartOptions,
                indexAxis: 'y' as const,
              }}
            />
          </div>
        </Card>

        {/* Users by Tier */}
        <Card className='p-6'>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
            Users by City Tier
          </h3>
          <div className='h-80'>
            <Bar data={usersByTierData} options={chartOptions} />
          </div>
        </Card>
      </div>

      {/* Users by State */}
      <Card className='p-6'>
        <h3 className='text-lg font-semibold text-gray-900 dark:text-white mb-4'>
          Top States by User Count
        </h3>
        <div className='h-80'>
          <Bar
            data={usersByStateData}
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
