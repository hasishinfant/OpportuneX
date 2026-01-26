# OpportuneX Backend

Automated backend system for fetching and serving real hackathon opportunities from Major League Hacking (MLH) and other sources.

## Features

- 🔄 **Automated Data Fetching**: Scrapes MLH hackathon data every 6 hours
- 🗄️ **MongoDB Integration**: Persistent storage with Mongoose ODM
- 🔍 **Advanced Search & Filtering**: Location, skills, category, mode filters
- 📊 **Statistics & Analytics**: Comprehensive opportunity statistics
- 🚀 **RESTful API**: Clean, documented API endpoints
- ⚡ **Performance Optimized**: Indexed queries and efficient data structures

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB 4.4+
- npm or yarn

### Installation

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI and other settings
   ```

3. **Start MongoDB** (if running locally):
   ```bash
   # macOS with Homebrew
   brew services start mongodb-community
   
   # Or using Docker
   docker run -d -p 27017:27017 --name mongodb mongo:latest
   ```

4. **Start the server**:
   ```bash
   # Development mode with auto-restart
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Trigger initial sync** (optional):
   ```bash
   npm run sync
   ```

## API Endpoints

### Base URL: `http://localhost:5000`

#### Core Endpoints

- **GET /** - API documentation and status
- **GET /api/health** - System health check
- **GET /api/opportunities** - List opportunities with filters
- **GET /api/opportunities/:id** - Get single opportunity
- **POST /api/opportunities/sync** - Trigger manual sync

#### Search & Filters

- **GET /api/opportunities/search/suggestions** - Search suggestions
- **GET /api/opportunities/filters/options** - Available filter options
- **GET /api/opportunities/stats/overview** - System statistics

### Query Parameters

| Parameter | Description | Example |
|-----------|-------------|---------|
| `page` | Page number (default: 1) | `?page=2` |
| `limit` | Items per page (max: 100) | `?limit=50` |
| `location` | Filter by location | `?location=San Francisco` |
| `category` | Filter by type | `?category=hackathon` |
| `skills` | Filter by skills | `?skills=JavaScript,Python` |
| `mode` | Filter by mode | `?mode=online` |
| `search` | Text search | `?search=AI hackathon` |
| `upcoming_only` | Show only upcoming | `?upcoming_only=true` |
| `sort_by` | Sort order | `?sort_by=start_date` |

### Example Requests

```bash
# Get all upcoming hackathons
curl "http://localhost:5000/api/opportunities?category=hackathon&upcoming_only=true"

# Search for AI-related opportunities in California
curl "http://localhost:5000/api/opportunities?search=AI&location=California"

# Get opportunities requiring JavaScript skills
curl "http://localhost:5000/api/opportunities?skills=JavaScript"

# Trigger manual sync
curl -X POST "http://localhost:5000/api/opportunities/sync"
```

## Data Sources

### Major League Hacking (MLH)
- **URL**: https://mlh.io/seasons/2026/events
- **Sync Frequency**: Every 6 hours
- **Data Points**: Title, dates, location, description, registration info

## Database Schema

### Opportunity Model

```javascript
{
  title: String,                    // Event title
  description: String,              // Event description
  organizer: String,               // Organizing entity
  type: String,                    // hackathon, internship, workshop
  mode: String,                    // online, offline, hybrid
  location: {
    city: String,
    state: String,
    country: String,
    venue: String
  },
  dates: {
    start_date: Date,
    end_date: Date,
    registration_deadline: Date
  },
  skills_required: [String],       // Required technical skills
  external_url: String,            // Link to original posting
  source: {
    platform: String,              // Data source (MLH, etc.)
    source_id: String,             // Unique identifier from source
    last_updated: Date
  },
  tags: [String],                  // Searchable tags
  is_active: Boolean               // Whether event is still relevant
}
```

## Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run sync` - Run manual sync job

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/opportunex` |
| `PORT` | Server port | `5000` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `NODE_ENV` | Environment mode | `development` |

### Sync Configuration

The system automatically syncs data every 6 hours using node-cron. You can:

- Trigger manual sync: `POST /api/opportunities/sync`
- Run sync script: `npm run sync`
- Modify sync interval in `server.js`

## Development

### Project Structure

```
backend/
├── models/           # Mongoose models
├── routes/           # Express routes
├── services/         # Business logic
│   └── fetchers/     # Data fetching services
├── jobs/             # Background jobs
├── server.js         # Main server file
└── package.json      # Dependencies
```

### Adding New Data Sources

1. Create a new fetcher in `services/fetchers/`
2. Implement the fetcher interface
3. Add to sync job in `jobs/syncOpportunities.js`
4. Update API documentation

## Monitoring

### Health Check

```bash
curl http://localhost:5000/api/health
```

Returns system status, database connection, and basic statistics.

### Statistics

```bash
curl http://localhost:5000/api/opportunities/stats/overview
```

Returns comprehensive statistics about opportunities in the database.

## Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Ensure MongoDB is running
   - Check connection string in `.env`
   - Verify network connectivity

2. **Sync Job Failing**
   - Check internet connectivity
   - Verify MLH website accessibility
   - Review logs for specific errors

3. **No Data Returned**
   - Run manual sync: `POST /api/opportunities/sync`
   - Check database for records
   - Verify filters aren't too restrictive

### Logs

The server logs all requests and important operations. In development mode, detailed error messages are returned in API responses.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.