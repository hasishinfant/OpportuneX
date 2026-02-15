/**
 * Performance Metrics Collection Service for OpportuneX
 * Collects, aggregates, and exports performance metrics
 */

import { EventEmitter } from 'events';
import { performance, PerformanceObserver } from 'perf_hooks';

// Metric types
export interface Metric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  labels?: Record<string, string>;
  type: 'counter' | 'gauge' | 'histogram' | 'summary';
}

export interface HistogramBucket {
  le: number; // Less than or equal to
  count: number;
}

export interface HistogramMetric extends Metric {
  type: 'histogram';
  buckets: HistogramBucket[];
  sum: number;
  count: number;
}

export interface SummaryMetric extends Metric {
  type: 'summary';
  quantiles: Record<string, number>; // e.g., { "0.5": 100, "0.9": 200, "0.99": 500 }
  sum: number;
  count: number;
}

// Metrics registry
class MetricsRegistry extends EventEmitter {
  private metrics: Map<string, Metric> = new Map();
  private histograms: Map<string, HistogramMetric> = new Map();
  private summaries: Map<string, SummaryMetric> = new Map();
  private counters: Map<string, number> = new Map();
  private gauges: Map<string, number> = new Map();

  // Default histogram buckets (in milliseconds for response times)
  private defaultBuckets = [
    1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000,
  ];

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, value = 1, labels?: Record<string, string>) {
    const key = this.getMetricKey(name, labels);
    const currentValue = this.counters.get(key) || 0;
    const newValue = currentValue + value;

    this.counters.set(key, newValue);

    const metric: Metric = {
      name,
      value: newValue,
      unit: 'count',
      timestamp: new Date(),
      labels,
      type: 'counter',
    };

    this.metrics.set(key, metric);
    this.emit('metric', metric);
  }

  /**
   * Set a gauge metric
   */
  setGauge(name: string, value: number, labels?: Record<string, string>) {
    const key = this.getMetricKey(name, labels);
    this.gauges.set(key, value);

    const metric: Metric = {
      name,
      value,
      unit: 'gauge',
      timestamp: new Date(),
      labels,
      type: 'gauge',
    };

    this.metrics.set(key, metric);
    this.emit('metric', metric);
  }

  /**
   * Observe a value for histogram metric
   */
  observeHistogram(
    name: string,
    value: number,
    labels?: Record<string, string>,
    buckets?: number[]
  ) {
    const key = this.getMetricKey(name, labels);
    const useBuckets = buckets || this.defaultBuckets;

    let histogram = this.histograms.get(key);
    if (!histogram) {
      histogram = {
        name,
        value: 0,
        unit: 'histogram',
        timestamp: new Date(),
        labels,
        type: 'histogram',
        buckets: useBuckets.map(le => ({ le, count: 0 })),
        sum: 0,
        count: 0,
      };
      this.histograms.set(key, histogram);
    }

    // Update histogram
    histogram.sum += value;
    histogram.count += 1;
    histogram.timestamp = new Date();

    // Update buckets
    for (const bucket of histogram.buckets) {
      if (value <= bucket.le) {
        bucket.count += 1;
      }
    }

    this.emit('metric', histogram);
  }

  /**
   * Observe a value for summary metric
   */
  observeSummary(name: string, value: number, labels?: Record<string, string>) {
    const key = this.getMetricKey(name, labels);

    let summary = this.summaries.get(key);
    if (!summary) {
      summary = {
        name,
        value: 0,
        unit: 'summary',
        timestamp: new Date(),
        labels,
        type: 'summary',
        quantiles: {},
        sum: 0,
        count: 0,
      };
      this.summaries.set(key, summary);
    }

    // For simplicity, we'll store recent values and calculate quantiles
    // In production, you'd use a more efficient quantile estimation algorithm
    const recentValues = (summary as any).recentValues || [];
    recentValues.push(value);

    // Keep only recent 1000 values
    if (recentValues.length > 1000) {
      recentValues.shift();
    }

    (summary as any).recentValues = recentValues;

    // Update summary
    summary.sum += value;
    summary.count += 1;
    summary.timestamp = new Date();

    // Calculate quantiles
    const sorted = [...recentValues].sort((a, b) => a - b);
    summary.quantiles = {
      '0.5': this.calculateQuantile(sorted, 0.5),
      '0.9': this.calculateQuantile(sorted, 0.9),
      '0.95': this.calculateQuantile(sorted, 0.95),
      '0.99': this.calculateQuantile(sorted, 0.99),
    };

    this.emit('metric', summary);
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): Metric[] {
    return [
      ...Array.from(this.metrics.values()),
      ...Array.from(this.histograms.values()),
      ...Array.from(this.summaries.values()),
    ];
  }

  /**
   * Get metrics by name
   */
  getMetricsByName(name: string): Metric[] {
    return this.getAllMetrics().filter(metric => metric.name === name);
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.metrics.clear();
    this.histograms.clear();
    this.summaries.clear();
    this.counters.clear();
    this.gauges.clear();
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusFormat(): string {
    const lines: string[] = [];
    const processedMetrics = new Set<string>();

    for (const metric of this.getAllMetrics()) {
      if (processedMetrics.has(metric.name)) continue;
      processedMetrics.add(metric.name);

      // Add help and type comments
      lines.push(`# HELP ${metric.name} ${this.getMetricHelp(metric.name)}`);
      lines.push(`# TYPE ${metric.name} ${metric.type}`);

      // Get all metrics with this name
      const metricsWithName = this.getMetricsByName(metric.name);

      for (const m of metricsWithName) {
        const labelsStr = this.formatPrometheusLabels(m.labels);

        if (m.type === 'histogram') {
          const hist = m as HistogramMetric;

          // Export buckets
          for (const bucket of hist.buckets) {
            lines.push(
              `${m.name}_bucket{le="${bucket.le}"${labelsStr ? `,${labelsStr}` : ''}} ${bucket.count}`
            );
          }

          // Export sum and count
          lines.push(
            `${m.name}_sum${labelsStr ? `{${labelsStr}}` : ''} ${hist.sum}`
          );
          lines.push(
            `${m.name}_count${labelsStr ? `{${labelsStr}}` : ''} ${hist.count}`
          );
        } else if (m.type === 'summary') {
          const summ = m as SummaryMetric;

          // Export quantiles
          for (const [quantile, value] of Object.entries(summ.quantiles)) {
            lines.push(
              `${m.name}{quantile="${quantile}"${labelsStr ? `,${labelsStr}` : ''}} ${value}`
            );
          }

          // Export sum and count
          lines.push(
            `${m.name}_sum${labelsStr ? `{${labelsStr}}` : ''} ${summ.sum}`
          );
          lines.push(
            `${m.name}_count${labelsStr ? `{${labelsStr}}` : ''} ${summ.count}`
          );
        } else {
          // Counter or gauge
          lines.push(
            `${m.name}${labelsStr ? `{${labelsStr}}` : ''} ${m.value}`
          );
        }
      }

      lines.push(''); // Empty line between metrics
    }

    return lines.join('\n');
  }

  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }

    const sortedLabels = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');

    return `${name}{${sortedLabels}}`;
  }

  private formatPrometheusLabels(labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return '';
    }

    return Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}="${value}"`)
      .join(',');
  }

  private calculateQuantile(sortedValues: number[], quantile: number): number {
    if (sortedValues.length === 0) return 0;

    const index = quantile * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sortedValues[lower];
    }

    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  private getMetricHelp(name: string): string {
    const helpTexts: Record<string, string> = {
      http_requests_total: 'Total number of HTTP requests',
      http_request_duration_seconds: 'HTTP request duration in seconds',
      database_queries_total: 'Total number of database queries',
      database_query_duration_seconds: 'Database query duration in seconds',
      cache_operations_total: 'Total number of cache operations',
      search_queries_total: 'Total number of search queries',
      search_query_duration_seconds: 'Search query duration in seconds',
      active_users: 'Number of currently active users',
      memory_usage_bytes: 'Memory usage in bytes',
      cpu_usage_percent: 'CPU usage percentage',
    };

    return helpTexts[name] || `Metric: ${name}`;
  }
}

// Application-specific metrics collector
class OpportuneXMetricsCollector {
  private registry: MetricsRegistry;
  private performanceObserver: PerformanceObserver | null = null;

  constructor() {
    this.registry = new MetricsRegistry();
    this.setupPerformanceObserver();
    this.setupSystemMetrics();
  }

  /**
   * Setup Node.js Performance Observer
   */
  private setupPerformanceObserver() {
    if (typeof PerformanceObserver === 'undefined') return;

    this.performanceObserver = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure') {
          this.registry.observeHistogram(
            'performance_measure_duration_ms',
            entry.duration,
            { name: entry.name }
          );
        }
      }
    });

    this.performanceObserver.observe({ entryTypes: ['measure'] });
  }

  /**
   * Setup system metrics collection
   */
  private setupSystemMetrics() {
    // Collect system metrics every 30 seconds
    setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Initial collection
    this.collectSystemMetrics();
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics() {
    try {
      // Memory usage
      const memUsage = process.memoryUsage();
      this.registry.setGauge('memory_usage_bytes', memUsage.rss, {
        type: 'rss',
      });
      this.registry.setGauge('memory_usage_bytes', memUsage.heapTotal, {
        type: 'heap_total',
      });
      this.registry.setGauge('memory_usage_bytes', memUsage.heapUsed, {
        type: 'heap_used',
      });
      this.registry.setGauge('memory_usage_bytes', memUsage.external, {
        type: 'external',
      });

      // CPU usage
      const cpuUsage = process.cpuUsage();
      this.registry.setGauge('cpu_usage_microseconds', cpuUsage.user, {
        type: 'user',
      });
      this.registry.setGauge('cpu_usage_microseconds', cpuUsage.system, {
        type: 'system',
      });

      // Process uptime
      this.registry.setGauge('process_uptime_seconds', process.uptime());

      // Event loop lag (approximate)
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1000000; // Convert to milliseconds
        this.registry.setGauge('event_loop_lag_ms', lag);
      });
    } catch (error) {
      console.error('Failed to collect system metrics:', error);
    }
  }

  /**
   * Record HTTP request metrics
   */
  recordHttpRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number
  ) {
    const labels = { method, route, status: statusCode.toString() };

    this.registry.incrementCounter('http_requests_total', 1, labels);
    this.registry.observeHistogram(
      'http_request_duration_ms',
      duration,
      labels
    );

    // Record success/error rates
    if (statusCode >= 200 && statusCode < 400) {
      this.registry.incrementCounter(
        'http_requests_successful_total',
        1,
        labels
      );
    } else {
      this.registry.incrementCounter('http_requests_failed_total', 1, labels);
    }
  }

  /**
   * Record database query metrics
   */
  recordDatabaseQuery(
    operation: string,
    table: string,
    duration: number,
    success: boolean
  ) {
    const labels = { operation, table, success: success.toString() };

    this.registry.incrementCounter('database_queries_total', 1, labels);
    this.registry.observeHistogram(
      'database_query_duration_ms',
      duration,
      labels
    );

    if (duration > 1000) {
      // Slow query threshold
      this.registry.incrementCounter('database_slow_queries_total', 1, labels);
    }
  }

  /**
   * Record cache operation metrics
   */
  recordCacheOperation(operation: string, hit: boolean, duration?: number) {
    const labels = { operation, result: hit ? 'hit' : 'miss' };

    this.registry.incrementCounter('cache_operations_total', 1, labels);

    if (duration !== undefined) {
      this.registry.observeHistogram(
        'cache_operation_duration_ms',
        duration,
        labels
      );
    }
  }

  /**
   * Record search query metrics
   */
  recordSearchQuery(
    query: string,
    resultCount: number,
    duration: number,
    userId?: string
  ) {
    const labels = {
      query_type: query ? 'text' : 'filter_only',
      has_results: resultCount > 0 ? 'true' : 'false',
    };

    this.registry.incrementCounter('search_queries_total', 1, labels);
    this.registry.observeHistogram(
      'search_query_duration_ms',
      duration,
      labels
    );
    this.registry.observeSummary('search_result_count', resultCount, labels);
  }

  /**
   * Record user activity metrics
   */
  recordUserActivity(action: string, userId: string) {
    const labels = { action };

    this.registry.incrementCounter('user_actions_total', 1, labels);
  }

  /**
   * Update active user count
   */
  updateActiveUsers(count: number) {
    this.registry.setGauge('active_users', count);
  }

  /**
   * Record error metrics
   */
  recordError(errorType: string, component: string) {
    const labels = { type: errorType, component };

    this.registry.incrementCounter('errors_total', 1, labels);
  }

  /**
   * Get metrics registry
   */
  getRegistry(): MetricsRegistry {
    return this.registry;
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    return this.registry.exportPrometheusFormat();
  }

  /**
   * Get metrics summary
   */
  getMetricsSummary(): {
    totalMetrics: number;
    counters: number;
    gauges: number;
    histograms: number;
    summaries: number;
  } {
    const allMetrics = this.registry.getAllMetrics();

    return {
      totalMetrics: allMetrics.length,
      counters: allMetrics.filter(m => m.type === 'counter').length,
      gauges: allMetrics.filter(m => m.type === 'gauge').length,
      histograms: allMetrics.filter(m => m.type === 'histogram').length,
      summaries: allMetrics.filter(m => m.type === 'summary').length,
    };
  }

  /**
   * Start performance measurement
   */
  startMeasurement(name: string): string {
    const measurementId = `${name}_${Date.now()}_${Math.random()}`;
    performance.mark(`${measurementId}_start`);
    return measurementId;
  }

  /**
   * End performance measurement
   */
  endMeasurement(measurementId: string): number {
    const startMark = `${measurementId}_start`;
    const endMark = `${measurementId}_end`;

    performance.mark(endMark);
    performance.measure(measurementId, startMark, endMark);

    const measure = performance.getEntriesByName(measurementId)[0];

    // Clean up marks and measures
    performance.clearMarks(startMark);
    performance.clearMarks(endMark);
    performance.clearMeasures(measurementId);

    return measure ? measure.duration : 0;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

// Singleton instance
export const metricsCollector = new OpportuneXMetricsCollector();

// Cleanup on process exit
process.on('exit', () => {
  metricsCollector.cleanup();
});

process.on('SIGINT', () => {
  metricsCollector.cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  metricsCollector.cleanup();
  process.exit(0);
});

export { MetricsRegistry, OpportuneXMetricsCollector };
export default metricsCollector;
