# Advanced Analytics Dashboard

## Overview

The Advanced Analytics Dashboard provides comprehensive insights into OpportuneX platform performance, user engagement, and opportunity analytics. This admin-only feature enables data-driven decision making through interactive visualizations and exportable reports.

## Features

### 1. User Engagement Metrics

- **Total Searches**: Track search activity across the platform
- **Total Favorites**: Monitor opportunity bookmarking behavior
- **Roadmap Completions**: Measure user success in completing preparation roadmaps
- **Active Users**: Daily, weekly, and monthly active user counts
- **Engagement Rate**: Percentage of users actively using the platform
- **Retention Rate**: Users returning after initial visit
- **Search Trends**: Time-series visualization of search activity
- **Top Search Terms**: Most popular search queries

### 2. Opportunity Analytics

- **Total Opportunities**: Count of available opportunities
- **Total Views**: Aggregate opportunity views
- **Total Applications**: Estimated application count
- **Success Rate**: Conversion from views to favorites
- **Views by Type**: Distribution across hackathons, internships, workshops
- **Applications by Type**: Application breakdown by opportunity type
- **Top Opportunities**: Best performing opportunities by engagement
- **Conversion Funnel**: Views → Favorites → Applications pipeline

### 3. Platform Usage Statistics

- **Total Users**: Overall user count
- **New Users**: Daily, weekly, and monthly new registrations
- **Peak Usage Times**: Hourly activity distribution
- **Popular Skills**: Most common technical skills among users
- **Users by Tier**: Distribution across Tier 2 and Tier 3 cities
- **Users by State**: Geographic distribution of users
- **Device Breakdown**: Mobile, desktop, and tablet usage

### 4. Personalized Insights

- **Recommendations**: AI-generated suggestions for platform improvement
- **Trends**: Identified patterns in user behavior
- **Alerts**: Important notifications about platform health
- **Predictions**: Forecasts for next week's metrics
- **Growth Rate**: Platform growth trajectory

## Architecture

### Backend Services

#### AdvancedAnalyticsService

Location: `src/lib/services/advanced-analytics.service.ts`

Key methods:

- `getDashboardMetrics()`: Retrieve comprehensive dashboard data
- `getUserEngagementMetrics()`: Calculate user engagement statistics
- `getOpportunityAnalytics()`: Analyze opportunity performance
- `getPlatformUsageStats()`: Gather platform usage data
- `getPersonalizedInsights()`: Generate AI-powered insights
- `exportAnalytics()`: Export data in CSV or JSON format

### API Routes

#### Dashboard Endpoint

```
GET /api/v1/analytics/dashboard?start=2024-01-01&end=2024-01-31
```

Response:

```json
{
  "success": true,
  "data": {
    "userEngagement": { ... },
    "opportunityAnalytics": { ... },
    "platformUsage": { ... },
    "insights": { ... }
  }
}
```

#### Export Endpoint

```
POST /api/v1/analytics/export
Content-Type: application/json

{
  "format": "csv",
  "dateRange": {
    "start": "2024-01-01T00:00:00Z",
    "end": "2024-01-31T23:59:59Z"
  },
  "metrics": ["all"]
}
```

### Frontend Components

#### Main Components

- **AnalyticsDashboard**: Main dashboard container with tabs
- **MetricsOverview**: High-level metrics cards
- **UserEngagementChart**: User engagement visualizations
- **OpportunityAnalyticsChart**: Opportunity performance charts
- **PlatformUsageChart**: Platform usage statistics
- **InsightsPanel**: AI-generated insights and predictions
- **DateRangePicker**: Date range selection control
- **ExportButton**: Data export functionality

#### Custom Hook

```typescript
import { useAnalytics } from '@/hooks/useAnalytics';

const { metrics, isLoading, error, refresh, exportData } = useAnalytics({
  dateRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-31'),
  },
  autoRefresh: true,
  refreshInterval: 300000, // 5 minutes
});
```

## Visualizations

### Chart.js Integration

The dashboard uses Chart.js and react-chartjs-2 for data visualization:

- **Line Charts**: Search trends over time
- **Bar Charts**: Top search terms, popular skills, state distribution
- **Doughnut Charts**: Active users breakdown, device distribution
- **Pie Charts**: Opportunity types, views by type

### Chart Types Used

1. **Time Series**: Search activity trends
2. **Horizontal Bar**: Top search terms, popular skills
3. **Vertical Bar**: Peak usage times, conversion funnel
4. **Doughnut**: Active users, device breakdown
5. **Pie**: Opportunity type distribution

## Access Control

### Admin-Only Access

The analytics dashboard is restricted to admin users only:

```typescript
// Page-level check
useEffect(() => {
  const checkAdminAccess = async () => {
    const response = await fetch('/api/auth/me');
    const data = await response.json();

    if (!data.success || !data.data?.isAdmin) {
      router.push('/');
      return;
    }

    setIsAdmin(true);
  };

  checkAdminAccess();
}, [router]);
```

```typescript
// API-level check
if (!req.user?.isAdmin) {
  return res.status(403).json({
    success: false,
    error: 'Admin access required',
  });
}
```

## Data Export

### Supported Formats

#### CSV Export

Structured CSV with sections for:

- User Engagement Metrics
- Opportunity Analytics
- Platform Usage Statistics

#### JSON Export

Complete JSON dump of all dashboard metrics for programmatic access.

### Export Usage

```typescript
// Using the hook
const { exportData } = useAnalytics();

// Export as CSV
await exportData('csv');

// Export as JSON
await exportData('json');
```

## Performance Considerations

### Database Optimization

- Indexed queries on `createdAt` fields
- Aggregation using Prisma's `groupBy` and `count`
- Date range filtering to limit data volume
- Parallel query execution with `Promise.all`

### Caching Strategy

Consider implementing Redis caching for:

- Dashboard metrics (5-minute TTL)
- Top search terms (15-minute TTL)
- Platform statistics (1-hour TTL)

### Query Optimization

```typescript
// Efficient date range queries
where: {
  createdAt: {
    gte: startDate,
    lte: endDate
  }
}

// Parallel data fetching
const [metric1, metric2, metric3] = await Promise.all([
  fetchMetric1(),
  fetchMetric2(),
  fetchMetric3()
]);
```

## Testing

### Unit Tests

Location: `src/test/advanced-analytics.service.test.ts`

Test coverage includes:

- Dashboard metrics retrieval
- Date range filtering
- Export functionality (CSV, JSON)
- Engagement rate calculations
- Search trend tracking
- Success rate calculations
- User tier distribution
- Growth predictions

### Running Tests

```bash
npm run test -- advanced-analytics.service.test.ts
```

## Usage Example

### Accessing the Dashboard

1. Navigate to `/analytics` (admin only)
2. Select date range (Last 7/30/90 days or custom)
3. View metrics across different tabs:
   - Overview: High-level summary
   - User Engagement: Detailed engagement metrics
   - Opportunities: Opportunity performance
   - Platform Usage: Usage statistics
4. Export data as needed

### Date Range Selection

```typescript
<DateRangePicker
  startDate={dateRange.start}
  endDate={dateRange.end}
  onChange={(start, end) => setDateRange({ start, end })}
/>
```

### Refreshing Data

```typescript
<button onClick={handleRefresh}>
  Refresh
</button>
```

## Future Enhancements

### Planned Features

1. **Real-time Updates**: WebSocket integration for live metrics
2. **Custom Dashboards**: User-configurable dashboard layouts
3. **Advanced Filtering**: Filter by user segments, opportunity types
4. **Comparative Analysis**: Compare metrics across time periods
5. **PDF Export**: Generate PDF reports with charts
6. **Email Reports**: Scheduled email delivery of analytics
7. **Predictive Analytics**: ML-based forecasting
8. **Cohort Analysis**: User cohort tracking and analysis
9. **A/B Testing Results**: Integration with experimentation platform
10. **Custom Metrics**: User-defined KPIs and metrics

### Performance Improvements

1. Implement Redis caching layer
2. Add database read replicas for analytics queries
3. Implement data aggregation tables for faster queries
4. Add query result pagination for large datasets
5. Implement incremental data loading

## Dependencies

### Required Packages

```json
{
  "chart.js": "^4.4.0",
  "react-chartjs-2": "^5.2.0",
  "@prisma/client": "^7.3.0"
}
```

### Installation

```bash
npm install chart.js react-chartjs-2
```

## Troubleshooting

### Common Issues

#### Charts Not Rendering

- Ensure Chart.js is properly registered
- Check that data format matches chart type requirements
- Verify component is client-side rendered (`'use client'`)

#### Slow Query Performance

- Add database indexes on frequently queried fields
- Implement caching for expensive queries
- Use date range limits to reduce data volume

#### Export Failures

- Check file size limits
- Verify proper MIME types are set
- Ensure browser allows downloads

## Security Considerations

1. **Admin-Only Access**: Strict authentication and authorization checks
2. **Rate Limiting**: Prevent abuse of analytics endpoints
3. **Data Sanitization**: Clean user input in date ranges
4. **SQL Injection Prevention**: Use Prisma's parameterized queries
5. **CORS Configuration**: Restrict API access to authorized origins

## Monitoring

### Key Metrics to Monitor

- Dashboard load time
- Query execution time
- Export success rate
- Error rate
- API response time

### Logging

All analytics operations are logged for audit purposes:

```typescript
console.log('Dashboard metrics retrieved', {
  userId,
  dateRange,
  timestamp: new Date(),
});
```

## Support

For issues or questions about the analytics dashboard:

1. Check this documentation
2. Review test files for usage examples
3. Contact the development team
4. Submit issues via the project repository
