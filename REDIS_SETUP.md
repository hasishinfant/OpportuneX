# Redis Setup for OpportuneX

This document provides comprehensive information about Redis configuration and caching implementation for the OpportuneX platform.

## Overview

Redis is used as the primary caching layer for OpportuneX to improve performance by caching:
- Search results and suggestions
- User sessions and profiles
- API responses from external services
- AI-generated roadmaps
- Frequently accessed opportunities

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Next.js App   │───▶│   Redis Cache   │───▶│   PostgreSQL    │
│                 │    │                 │    │                 │
│ - API Routes    │    │ - Search Cache  │    │ - Persistent    │
│ - Middleware    │    │ - Session Cache │    │   Data Storage  │
│ - Components    │    │ - User Cache    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Configuration

### Environment Variables

Add the following to your `.env` file:

```bash
# Redis Configuration
REDIS_URL="redis://localhost:6379"
```

For production with authentication:
```bash
REDIS_URL="redis://username:password@redis-host:6379"
```

### Docker Setup

Redis is automatically configured in both development and production Docker environments:

**Development** (`docker-compose.dev.yml`):
```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis_dev_data:/data
```

**Production** (`docker-compose.yml`):
```yaml
redis:
  image: redis:7-alpine
  ports:
    - "6379:6379"
  volumes:
    - redis_data:/data
```

## Usage

### Basic Cache Operations

```typescript
import { CacheManager } from '@/lib/cache';

// Set a value with TTL
await CacheManager.set('key', { data: 'value' }, 300); // 5 minutes

// Get a value
const value = await CacheManager.get<MyType>('key');

// Check if key exists
const exists = await CacheManager.exists('key');

// Delete a key
await CacheManager.delete('key');
```

### Search Results Caching

```typescript
import { SearchCache } from '@/lib/cache';

// Cache search results
await SearchCache.setSearchResults(searchRequest, searchResponse);

// Get cached search results
const cachedResults = await SearchCache.getSearchResults(searchRequest);

// Cache search suggestions
await SearchCache.setSearchSuggestions('AI hackathon', ['AI hackathon Mumbai', 'AI hackathon 2024']);
```

### User Session Management

```typescript
import { SessionCache } from '@/lib/cache';

// Set user session
await SessionCache.setSession(sessionId, sessionData);

// Get user session
const session = await SessionCache.getSession(sessionId);

// Extend session TTL
await SessionCache.extendSession(sessionId);
```

### API Route Caching Middleware

```typescript
import { withCache, CacheConfigs } from '@/lib/cache-middleware';

// Apply caching to API route
export const GET = withCache(CacheConfigs.searchResults)(
  async (req: NextRequest) => {
    // Your API logic here
    return NextResponse.json(data);
  }
);
```

## Cache Strategies

### 1. Search Results Cache
- **TTL**: 5 minutes
- **Key Pattern**: `search:{base64(query|filters|page|userId)}`
- **Use Case**: Cache search results to reduce Elasticsearch load

### 2. User Session Cache
- **TTL**: 24 hours
- **Key Pattern**: `session:{sessionId}`
- **Use Case**: Store user authentication and session data

### 3. User Profile Cache
- **TTL**: 1 hour
- **Key Pattern**: `profile:{userId}`
- **Use Case**: Cache user profiles to reduce database queries

### 4. Opportunity Cache
- **TTL**: 30 minutes
- **Key Pattern**: `opportunity:{opportunityId}`
- **Use Case**: Cache individual opportunities for quick access

### 5. API Response Cache
- **TTL**: 10 minutes
- **Key Pattern**: `api:{base64(endpoint|params)}`
- **Use Case**: Cache responses from external APIs

### 6. AI Roadmap Cache
- **TTL**: 30 minutes
- **Key Pattern**: `roadmap:{userId}:{opportunityId}`
- **Use Case**: Cache AI-generated roadmaps to reduce LLM API calls

## Cache Invalidation

### Automatic Invalidation
- User profile updates → Clear user profile cache
- New opportunities → Clear search cache
- User preference changes → Clear personalized caches

### Manual Invalidation
```typescript
import { CacheInvalidation } from '@/lib/cache-middleware';

// Invalidate user-specific cache
await CacheInvalidation.invalidateUserCache(userId);

// Invalidate search cache
await CacheInvalidation.invalidateSearchCache();

// Invalidate opportunity cache
await CacheInvalidation.invalidateOpportunityCache(opportunityId);
```

## Monitoring and Health Checks

### Health Check Script
```bash
# Basic health check
npm run redis:health

# Verbose output
npm run redis:health:verbose

# JSON output for monitoring
npm run redis:health:json
```

### Cache Statistics
```typescript
import { CacheStats } from '@/lib/cache';

const stats = await CacheStats.getStats();
console.log('Memory usage:', stats.memory);
console.log('Key count:', stats.keyspace);
```

## Performance Optimization

### Connection Management
- Single Redis client instance with connection pooling
- Automatic reconnection with exponential backoff
- Lazy connection initialization

### Memory Optimization
- Appropriate TTL values to prevent memory bloat
- Pattern-based cache invalidation
- Compression for large cached objects

### Error Handling
- Graceful degradation when Redis is unavailable
- Non-blocking cache operations
- Fallback to database when cache misses

## Best Practices

### 1. Cache Key Naming
- Use consistent prefixes: `search:`, `user:`, `api:`
- Include version numbers for schema changes
- Use descriptive, hierarchical keys

### 2. TTL Management
- Set appropriate TTL based on data volatility
- Use shorter TTL for frequently changing data
- Implement cache warming for critical data

### 3. Error Handling
- Never let cache failures break the application
- Log cache errors for monitoring
- Implement circuit breakers for cache operations

### 4. Security
- Use Redis AUTH in production
- Encrypt sensitive cached data
- Implement proper access controls

## Troubleshooting

### Common Issues

1. **Connection Refused**
   ```bash
   # Check if Redis is running
   docker ps | grep redis
   
   # Start Redis container
   npm run docker:dev
   ```

2. **Memory Issues**
   ```bash
   # Check Redis memory usage
   npm run redis:health:verbose
   
   # Clear all cache if needed
   redis-cli FLUSHALL
   ```

3. **Performance Issues**
   ```bash
   # Monitor Redis operations
   redis-cli MONITOR
   
   # Check slow queries
   redis-cli SLOWLOG GET 10
   ```

### Debugging

Enable Redis debugging by setting environment variable:
```bash
DEBUG=redis:*
```

View cache operations in development:
```typescript
// Check cache hit/miss in response headers
console.log(response.headers.get('X-Cache')); // HIT or MISS
console.log(response.headers.get('X-Cache-Key')); // Cache key used
```

## Production Considerations

### Scaling
- Use Redis Cluster for horizontal scaling
- Implement read replicas for high-read workloads
- Consider Redis Sentinel for high availability

### Monitoring
- Set up Redis monitoring with tools like RedisInsight
- Monitor memory usage, hit rates, and connection counts
- Set up alerts for cache failures

### Backup and Recovery
- Configure Redis persistence (RDB + AOF)
- Regular backup of Redis data
- Test recovery procedures

### Security
- Enable Redis AUTH
- Use TLS for Redis connections
- Implement network security (VPC, firewalls)
- Regular security updates

## Migration and Deployment

### Development to Production
1. Update Redis URL in production environment
2. Configure Redis persistence settings
3. Set up monitoring and alerting
4. Test cache warming procedures

### Zero-Downtime Deployment
1. Deploy new application version
2. Warm up critical caches
3. Gradually shift traffic
4. Monitor cache performance

## Metrics and KPIs

### Cache Performance Metrics
- Cache hit ratio (target: >80%)
- Average response time improvement
- Memory usage efficiency
- Connection pool utilization

### Business Impact Metrics
- Search response time reduction
- Database load reduction
- User session management efficiency
- API rate limit optimization

## Support and Maintenance

### Regular Tasks
- Monitor cache hit rates
- Clean up expired keys
- Update cache configurations
- Review and optimize TTL values

### Emergency Procedures
- Cache flush procedures
- Fallback to database operations
- Redis restart procedures
- Data recovery from backups

For additional support or questions about Redis configuration, refer to the [Redis documentation](https://redis.io/documentation) or contact the development team.