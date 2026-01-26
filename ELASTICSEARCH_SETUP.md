# Elasticsearch Configuration for OpportuneX

This document describes the complete Elasticsearch setup for the OpportuneX platform, including search indexing, full-text search capabilities, and user behavior analytics.

## Overview

The Elasticsearch configuration provides:
- **Full-text search** across opportunities with relevance scoring
- **Advanced filtering** by skills, organizer type, mode, location, and type
- **Search suggestions** and autocomplete functionality
- **User behavior tracking** for analytics and recommendations
- **Faceted search** with aggregations for filtering options

## Architecture

### Search Indices

1. **opportunities** - Stores opportunity data for search
   - Full-text search across title, description, organizer, skills
   - Faceted filtering and aggregations
   - Relevance scoring and popularity ranking

2. **user_behavior** - Tracks user interactions
   - Search queries and filters
   - Opportunity views and favorites
   - Click-through analytics

### Key Components

- `src/lib/elasticsearch.ts` - Elasticsearch client and connection management
- `src/lib/search-indices.ts` - Index mappings and management
- `src/lib/search-utils.ts` - Search service and query building
- `src/app/api/search/` - REST API endpoints for search functionality

## Configuration Files

### 1. Elasticsearch Client (`src/lib/elasticsearch.ts`)

```typescript
// Features:
- Connection management with health checks
- Global client instance with development caching
- Utility functions for index operations
- Error handling and retry logic
```

### 2. Search Indices (`src/lib/search-indices.ts`)

```typescript
// Opportunities Index Mapping:
- title: text with completion suggester
- description: full-text searchable
- organizer: nested object with name and type
- requirements.skills: keyword array for exact matching
- timeline.applicationDeadline: date for filtering
- Custom text analyzer with stemming and stop words

// User Behavior Index Mapping:
- userId, sessionId: for user tracking
- action: search, view, favorite, etc.
- searchQuery: analyzed text
- filters: structured filter data
- timestamp: for time-based analytics
```

### 3. Search Service (`src/lib/search-utils.ts`)

```typescript
// SearchQueryBuilder:
- Multi-match queries across multiple fields
- Boolean filters for exact matching
- Aggregations for faceted search
- Pagination and sorting options

// SearchService:
- searchOpportunities(): Main search functionality
- getSuggestions(): Autocomplete suggestions
- indexOpportunity(): Add/update opportunities
- bulkIndexOpportunities(): Batch operations

// UserBehaviorTracker:
- trackSearch(): Log search queries
- trackOpportunityView(): Log opportunity clicks
- trackOpportunityFavorite(): Log user favorites
```

## API Endpoints

### Search Opportunities
```
GET /api/search/opportunities?q=machine learning&skills=python,javascript&type=hackathon
POST /api/search/opportunities
```

### Search Suggestions
```
GET /api/search/suggestions?q=machine
POST /api/search/suggestions
```

### Health Check
```
GET /api/health/elasticsearch
```

## Setup Instructions

### 1. Environment Variables

Add to your `.env` file:
```bash
# Elasticsearch Configuration
ELASTICSEARCH_URL="http://localhost:9200"
ELASTICSEARCH_USERNAME=""  # Optional
ELASTICSEARCH_PASSWORD=""  # Optional
```

### 2. Docker Setup

Start Elasticsearch with Docker:
```bash
# Development environment
npm run docker:dev

# This starts:
# - PostgreSQL on port 5432
# - Redis on port 6379
# - Elasticsearch on port 9200
# - Kibana on port 5601 (optional UI)
```

### 3. Initialize Indices

```bash
# Initialize Elasticsearch indices
npm run es:init

# Check Elasticsearch health
npm run es:health

# Verbose health check
npm run es:health:verbose
```

### 4. Available Scripts

```bash
# Elasticsearch management
npm run es:init           # Initialize indices
npm run es:health         # Health check
npm run es:health:verbose # Detailed health check
npm run es:health:json    # JSON output

# Docker management
npm run docker:dev        # Start development services
npm run docker:stop       # Stop all services
npm run docker:clean      # Stop and remove volumes
```

## Index Mappings

### Opportunities Index

```json
{
  "mappings": {
    "properties": {
      "title": {
        "type": "text",
        "analyzer": "custom_text_analyzer",
        "fields": {
          "keyword": { "type": "keyword" },
          "suggest": { "type": "completion" }
        }
      },
      "description": {
        "type": "text",
        "analyzer": "custom_text_analyzer"
      },
      "type": { "type": "keyword" },
      "organizer": {
        "properties": {
          "name": {
            "type": "text",
            "fields": { "keyword": { "type": "keyword" } }
          },
          "type": { "type": "keyword" }
        }
      },
      "requirements": {
        "properties": {
          "skills": { "type": "keyword" },
          "experience": { "type": "text" }
        }
      },
      "details": {
        "properties": {
          "mode": { "type": "keyword" },
          "location": {
            "type": "text",
            "fields": { "keyword": { "type": "keyword" } }
          }
        }
      },
      "timeline": {
        "properties": {
          "applicationDeadline": { "type": "date" }
        }
      },
      "isActive": { "type": "boolean" },
      "searchText": { "type": "text" },
      "popularity": { "type": "float" },
      "relevanceScore": { "type": "float" }
    }
  }
}
```

## Search Features

### 1. Full-Text Search

```typescript
// Multi-field search with boosting
const query = {
  multi_match: {
    query: "machine learning hackathon",
    fields: [
      "title^3",           // Highest boost
      "description^2",     // Medium boost
      "organizer.name^2",
      "requirements.skills^1.5",
      "tags^1.5",
      "searchText"         // Combined text
    ],
    type: "best_fields",
    fuzziness: "AUTO"
  }
}
```

### 2. Advanced Filtering

```typescript
// Boolean filters for exact matching
const filters = [
  { terms: { "requirements.skills": ["python", "javascript"] } },
  { term: { "organizer.type": "corporate" } },
  { term: { "details.mode": "online" } },
  { term: { "isActive": true } },
  { range: { "timeline.applicationDeadline": { gte: "now" } } }
]
```

### 3. Faceted Search

```typescript
// Aggregations for filter options
const aggregations = {
  skills: { terms: { field: "requirements.skills", size: 20 } },
  organizer_types: { terms: { field: "organizer.type", size: 10 } },
  modes: { terms: { field: "details.mode", size: 5 } },
  locations: { terms: { field: "details.location.keyword", size: 20 } }
}
```

### 4. Search Suggestions

```typescript
// Completion suggester for autocomplete
const suggest = {
  title_suggest: {
    prefix: "machine",
    completion: {
      field: "title.suggest",
      size: 5
    }
  }
}
```

## Performance Optimization

### 1. Index Settings

```json
{
  "settings": {
    "number_of_shards": 1,
    "number_of_replicas": 0,
    "analysis": {
      "analyzer": {
        "custom_text_analyzer": {
          "type": "custom",
          "tokenizer": "standard",
          "filter": ["lowercase", "stop", "snowball"]
        }
      }
    }
  }
}
```

### 2. Query Optimization

- **Field boosting** for relevance tuning
- **Fuzziness** for typo tolerance
- **Pagination** with size limits
- **Filter context** for exact matches
- **Query context** for scoring

### 3. Relevance Scoring

```typescript
// Custom relevance calculation
function calculateRelevanceScore(opportunity) {
  let score = 1.0
  
  // Recent opportunities get higher scores
  const daysSinceCreated = getDaysSince(opportunity.createdAt)
  if (daysSinceCreated < 7) score += 0.5
  
  // Longer application windows
  const daysUntilDeadline = getDaysUntil(opportunity.applicationDeadline)
  if (daysUntilDeadline > 30) score += 0.3
  
  // Detailed descriptions
  if (opportunity.description.length > 500) score += 0.2
  
  return Math.min(score, 3.0)
}
```

## Monitoring and Analytics

### 1. Health Monitoring

```bash
# Check cluster health
curl http://localhost:9200/_cluster/health

# Check index statistics
curl http://localhost:9200/opportunities/_stats

# API health check
curl http://localhost:3000/api/health/elasticsearch
```

### 2. User Behavior Analytics

```typescript
// Track search behavior
await UserBehaviorTracker.trackSearch({
  userId: "user123",
  sessionId: "session456",
  query: "machine learning",
  filters: { skills: ["python"] },
  resultCount: 25
})

// Track opportunity interactions
await UserBehaviorTracker.trackOpportunityView({
  userId: "user123",
  opportunityId: "opp789",
  clickPosition: 3
})
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   ```bash
   # Check if Elasticsearch is running
   curl http://localhost:9200
   
   # Start with Docker
   npm run docker:dev
   ```

2. **Index Not Found**
   ```bash
   # Initialize indices
   npm run es:init
   ```

3. **Memory Issues**
   ```bash
   # Increase Docker memory limit
   # Or reduce ES_JAVA_OPTS in docker-compose.yml
   ```

4. **Search Not Working**
   ```bash
   # Check index health
   npm run es:health:verbose
   
   # Verify data is indexed
   curl http://localhost:9200/opportunities/_count
   ```

### Debug Commands

```bash
# List all indices
curl http://localhost:9200/_cat/indices?v

# Check mapping
curl http://localhost:9200/opportunities/_mapping

# Sample search
curl -X POST http://localhost:9200/opportunities/_search \
  -H "Content-Type: application/json" \
  -d '{"query": {"match_all": {}}}'
```

## Integration with Database

The Elasticsearch setup integrates with the PostgreSQL database:

1. **Data Flow**: PostgreSQL → Elasticsearch indexing → Search API
2. **Sync Strategy**: Real-time indexing on create/update operations
3. **Consistency**: Elasticsearch as search layer, PostgreSQL as source of truth

## Security Considerations

1. **Network Security**: Elasticsearch runs on internal Docker network
2. **Authentication**: Optional username/password configuration
3. **Data Privacy**: User behavior data anonymization
4. **Rate Limiting**: API endpoints have rate limiting protection

## Future Enhancements

1. **Machine Learning**: Implement learning-to-rank for personalized results
2. **Real-time Updates**: WebSocket integration for live search results
3. **Advanced Analytics**: User journey tracking and conversion metrics
4. **Multi-language**: Support for Hindi language analysis
5. **Geo-search**: Location-based opportunity discovery

This Elasticsearch configuration provides a robust foundation for the OpportuneX search functionality, supporting both current requirements and future scalability needs.