import { useCallback, useEffect, useState } from 'react';

interface DashboardMetrics {
  userEngagement: any;
  opportunityAnalytics: any;
  platformUsage: any;
  insights: any;
}

interface UseAnalyticsOptions {
  dateRange?: {
    start: Date;
    end: Date;
  };
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
}

export function useAnalytics(options: UseAnalyticsOptions = {}) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (options.dateRange) {
        params.append('start', options.dateRange.start.toISOString());
        params.append('end', options.dateRange.end.toISOString());
      }

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
  }, [options.dateRange]);

  useEffect(() => {
    fetchMetrics();

    // Set up auto-refresh if enabled
    if (options.autoRefresh && options.refreshInterval) {
      const interval = setInterval(fetchMetrics, options.refreshInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [fetchMetrics, options.autoRefresh, options.refreshInterval]);

  const refresh = useCallback(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const exportData = useCallback(
    async (format: 'csv' | 'json') => {
      try {
        const response = await fetch('/api/analytics/export', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            format,
            dateRange: options.dateRange || {
              start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
              end: new Date(),
            },
            metrics: ['all'],
          }),
        });

        if (!response.ok) {
          throw new Error('Export failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        return { success: true };
      } catch (error) {
        console.error('Export error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Export failed',
        };
      }
    },
    [options.dateRange]
  );

  return {
    metrics,
    isLoading,
    error,
    refresh,
    exportData,
  } as const;
}
