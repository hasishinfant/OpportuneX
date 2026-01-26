const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

// Import routes and services
const opportunityRoutes = require('./routes/opportunities');
const OpportunitySync = require('./jobs/syncOpportunities');
const dataService = require('./services/dataService');

const app = express();
const PORT = process.env.PORT || 5002;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/opportunex';

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Database connection with fallback
let useMongoDb = true;

async function connectToDatabase() {
  try {
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // 5 second timeout
      connectTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB successfully');
    
    // Log database info
    const dbName = mongoose.connection.db.databaseName;
    console.log(`📊 Database: ${dbName}`);
    useMongoDb = true;
    
  } catch (error) {
    console.warn('⚠️ MongoDB connection failed, falling back to JSON storage:', error.message);
    useMongoDb = false;
    
    // Initialize JSON storage
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    console.log('📁 Using JSON file storage as fallback');
  }
}

// Routes
app.use('/api/opportunities', opportunityRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check database connection
    const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    const storageType = dataService.useMongoDb ? 'MongoDB' : 'JSON File';
    
    // Get basic stats
    const stats = await dataService.getStats();
    const totalOpportunities = stats?.overview?.total || 0;
    const activeOpportunities = stats?.overview?.active || 0;
    
    res.json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: {
        status: dbStatus,
        storage_type: storageType,
        uri: dataService.useMongoDb ? MONGODB_URI.replace(/\/\/.*@/, '//***:***@') : 'JSON File',
        total_opportunities: totalOpportunities,
        active_opportunities: activeOpportunities
      },
      server: {
        port: PORT,
        node_version: process.version,
        uptime: process.uptime()
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Root endpoint - API documentation
app.get('/', (req, res) => {
  res.json({
    name: 'OpportuneX Backend API',
    version: '2.0.0',
    description: 'Automated backend system for fetching real hackathon opportunities',
    status: 'running',
    database: 'MongoDB',
    features: [
      'Real-time MLH hackathon data fetching',
      'Automated sync every 6 hours',
      'Advanced filtering and search',
      'RESTful API endpoints',
      'MongoDB data persistence'
    ],
    endpoints: {
      health: 'GET /api/health - System health check',
      opportunities: {
        list: 'GET /api/opportunities - Get filtered opportunities with pagination',
        single: 'GET /api/opportunities/:id - Get single opportunity by ID',
        stats: 'GET /api/opportunities/stats/overview - Get statistics',
        sync: 'POST /api/opportunities/sync - Trigger manual sync',
        suggestions: 'GET /api/opportunities/search/suggestions?q=query - Get search suggestions',
        filters: 'GET /api/opportunities/filters/options - Get filter options'
      }
    },
    query_parameters: {
      opportunities: {
        page: 'Page number (default: 1)',
        limit: 'Items per page (default: 20, max: 100)',
        location: 'Filter by city, state, or country',
        category: 'Filter by type (hackathon, internship, workshop)',
        skills: 'Filter by required skills (comma-separated)',
        mode: 'Filter by mode (online, offline, hybrid)',
        search: 'Text search in title, description, organizer',
        upcoming_only: 'Show only upcoming events (default: true)',
        sort_by: 'Sort by: start_date, deadline, title, created'
      }
    },
    automation: {
      sync_schedule: 'Every 6 hours',
      data_sources: ['Major League Hacking (MLH)'],
      last_sync: 'Check /api/opportunities/stats/overview'
    },
    timestamp: new Date().toISOString()
  });
});

// Setup automated sync job
function setupCronJobs() {
  console.log('⏰ Setting up automated sync jobs...');
  
  // Run sync every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('🔄 Running scheduled sync job...');
    try {
      const sync = new OpportunitySync();
      const result = await sync.syncAll();
      
      if (result.success) {
        console.log('✅ Scheduled sync completed successfully');
      } else {
        console.error('❌ Scheduled sync failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Scheduled sync error:', error);
    }
  });

  // Run initial sync after 30 seconds
  setTimeout(async () => {
    console.log('🚀 Running initial sync...');
    try {
      const sync = new OpportunitySync();
      const result = await sync.syncAll();
      
      if (result.success) {
        console.log('✅ Initial sync completed successfully');
      } else {
        console.error('❌ Initial sync failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Initial sync error:', error);
    }
  }, 30000);

  console.log('✅ Cron jobs configured');
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    available_endpoints: [
      'GET /',
      'GET /api/health',
      'GET /api/opportunities',
      'GET /api/opportunities/:id',
      'GET /api/opportunities/stats/overview',
      'POST /api/opportunities/sync',
      'GET /api/opportunities/search/suggestions',
      'GET /api/opportunities/filters/options'
    ]
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start server
async function startServer() {
  try {
    // Try to connect to database
    await connectToDatabase();
    
    // Set data service status
    const useMongoDb = mongoose.connection.readyState === 1;
    dataService.setMongoDbStatus(useMongoDb);
    
    // Start the server
    app.listen(PORT, () => {
      console.log(`🚀 OpportuneX Backend Server running on port ${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
      console.log(`🌐 API docs: http://localhost:${PORT}/`);
      console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
      console.log(`💾 Storage: ${useMongoDb ? 'MongoDB' : 'JSON File'}`);
      
      // Setup automated jobs
      setupCronJobs();
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();