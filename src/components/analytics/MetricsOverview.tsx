'use client';

import { Card } from '@/components/ui/Card';

interface MetricsOverviewProps {
  metrics: {
    userEngagement: any;
    opportunityAnalytics: any;
    platformUsage: any;
  };
}

export function MetricsOverview({ metrics }: MetricsOverviewProps) {
  const cards = [
    {
      title: 'Total Users',
      value: metrics.platformUsage.totalUsers.toLocaleString(),
      change: `+${metrics.platformUsage.newUsersMonth} this month`,
      icon: '👥',
      color: 'blue',
    },
    {
      title: 'Active Users',
      value: metrics.userEngagement.activeUsers.monthly.toLocaleString(),
      change: `${metrics.userEngagement.engagementRate.toFixed(1)}% engagement rate`,
      icon: '📊',
      color: 'green',
    },
    {
      title: 'Total Searches',
      value: metrics.userEngagement.totalSearches.toLocaleString(),
      change: `${metrics.userEngagement.activeUsers.daily} today`,
      icon: '🔍',
      color: 'purple',
    },
    {
      title: 'Opportunities',
      value: metrics.opportunityAnalytics.totalOpportunities.toLocaleString(),
      change: `${metrics.opportunityAnalytics.successRate.toFixed(1)}% success rate`,
      icon: '🎯',
      color: 'orange',
    },
    {
      title: 'Total Views',
      value: metrics.opportunityAnalytics.totalViews.toLocaleString(),
      change: `${metrics.opportunityAnalytics.totalApplications} applications`,
      icon: '👁️',
      color: 'indigo',
    },
    {
      title: 'Favorites',
      value: metrics.userEngagement.totalFavorites.toLocaleString(),
      change: `${metrics.userEngagement.roadmapCompletions} roadmaps completed`,
      icon: '⭐',
      color: 'yellow',
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: { [key: string]: string } = {
      blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400',
      green:
        'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
      purple:
        'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400',
      orange:
        'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400',
      indigo:
        'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400',
      yellow:
        'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400',
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
      {cards.map((card, index) => (
        <Card key={index} className='p-6'>
          <div className='flex items-start justify-between'>
            <div className='flex-1'>
              <p className='text-sm font-medium text-gray-600 dark:text-gray-400'>
                {card.title}
              </p>
              <p className='mt-2 text-3xl font-bold text-gray-900 dark:text-white'>
                {card.value}
              </p>
              <p className='mt-2 text-sm text-gray-500 dark:text-gray-400'>
                {card.change}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${getColorClasses(card.color)}`}>
              <span className='text-2xl'>{card.icon}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
