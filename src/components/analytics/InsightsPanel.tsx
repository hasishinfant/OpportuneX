'use client';

import { Card } from '@/components/ui/Card';

interface InsightsPanelProps {
  insights: {
    recommendations: string[];
    trends: string[];
    alerts: string[];
    predictions: {
      nextWeekUsers: number;
      nextWeekSearches: number;
      growthRate: number;
    };
  };
}

export function InsightsPanel({ insights }: InsightsPanelProps) {
  return (
    <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
      {/* Recommendations */}
      <Card className='p-6'>
        <div className='flex items-center gap-2 mb-4'>
          <span className='text-2xl'>💡</span>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
            Recommendations
          </h3>
        </div>
        {insights.recommendations.length > 0 ? (
          <ul className='space-y-3'>
            {insights.recommendations.map((rec, index) => (
              <li key={index} className='flex items-start gap-2'>
                <span className='text-blue-500 mt-1'>•</span>
                <span className='text-sm text-gray-700 dark:text-gray-300'>
                  {rec}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            No recommendations at this time
          </p>
        )}
      </Card>

      {/* Trends */}
      <Card className='p-6'>
        <div className='flex items-center gap-2 mb-4'>
          <span className='text-2xl'>📈</span>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
            Trends
          </h3>
        </div>
        {insights.trends.length > 0 ? (
          <ul className='space-y-3'>
            {insights.trends.map((trend, index) => (
              <li key={index} className='flex items-start gap-2'>
                <span className='text-green-500 mt-1'>•</span>
                <span className='text-sm text-gray-700 dark:text-gray-300'>
                  {trend}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className='text-sm text-gray-500 dark:text-gray-400'>
            No trends identified
          </p>
        )}

        {/* Predictions */}
        <div className='mt-6 pt-6 border-t border-gray-200 dark:border-gray-700'>
          <h4 className='text-sm font-semibold text-gray-900 dark:text-white mb-3'>
            Next Week Predictions
          </h4>
          <div className='space-y-2'>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-600 dark:text-gray-400'>Users:</span>
              <span className='font-semibold text-gray-900 dark:text-white'>
                {insights.predictions.nextWeekUsers.toLocaleString()}
              </span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-600 dark:text-gray-400'>
                Searches:
              </span>
              <span className='font-semibold text-gray-900 dark:text-white'>
                {insights.predictions.nextWeekSearches.toLocaleString()}
              </span>
            </div>
            <div className='flex justify-between text-sm'>
              <span className='text-gray-600 dark:text-gray-400'>
                Growth Rate:
              </span>
              <span
                className={`font-semibold ${
                  insights.predictions.growthRate >= 0
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {insights.predictions.growthRate >= 0 ? '+' : ''}
                {insights.predictions.growthRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Alerts */}
      <Card className='p-6'>
        <div className='flex items-center gap-2 mb-4'>
          <span className='text-2xl'>⚠️</span>
          <h3 className='text-lg font-semibold text-gray-900 dark:text-white'>
            Alerts
          </h3>
        </div>
        {insights.alerts.length > 0 ? (
          <ul className='space-y-3'>
            {insights.alerts.map((alert, index) => (
              <li key={index} className='flex items-start gap-2'>
                <span className='text-red-500 mt-1'>•</span>
                <span className='text-sm text-gray-700 dark:text-gray-300'>
                  {alert}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <div className='flex items-center gap-2 text-green-600 dark:text-green-400'>
            <span className='text-xl'>✓</span>
            <p className='text-sm'>All systems operating normally</p>
          </div>
        )}
      </Card>
    </div>
  );
}
