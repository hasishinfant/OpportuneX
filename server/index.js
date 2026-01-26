const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import routes
const opportunityRoutes = require('./routes/opportunities');
const roadmapRoutes = require('./routes/roadmap');
const resumeRoutes = require('./routes/resume');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Create data directory for JSON database
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Serve static files
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/resume', resumeRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: 'JSON file-based',
    port: PORT
  });
});

// Root endpoint - API information
app.get('/', (req, res) => {
  res.json({
    name: 'OpportuneX Backend API',
    version: '1.0.0',
    description: 'AI-powered opportunity discovery platform backend',
    status: 'running',
    port: PORT,
    endpoints: {
      health: '/api/health',
      opportunities: '/api/opportunities',
      roadmap: '/api/roadmap',
      roadmapPdf: '/api/roadmap/pdf',
      resumeUpload: '/api/resume/upload'
    },
    documentation: {
      opportunities: {
        'GET /api/opportunities': 'Get filtered opportunities with pagination',
        'GET /api/opportunities/:id': 'Get single opportunity by ID',
        'POST /api/opportunities': 'Create new opportunity (for testing)'
      },
      roadmap: {
        'POST /api/roadmap': 'Generate AI roadmap for opportunity',
        'POST /api/roadmap/pdf': 'Download roadmap as PDF'
      },
      resume: {
        'POST /api/resume/upload': 'Upload and analyze resume'
      }
    },
    database: 'JSON file-based',
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});