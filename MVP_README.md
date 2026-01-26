# OpportuneX MVP - Setup Guide

This guide will help you set up and run the OpportuneX MVP with a functional backend, real opportunity data, resume upload, and downloadable AI roadmaps.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB 4.4+
- npm or yarn

### 1. Clone and Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### 2. Set up MongoDB

**Option A: Local MongoDB**
```bash
# Install MongoDB locally
# macOS
brew install mongodb-community

# Start MongoDB
brew services start mongodb-community

# Create database
mongosh
use opportunex
```

**Option B: MongoDB Atlas (Cloud)**
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a cluster
3. Get connection string
4. Update `MONGODB_URI` in environment files

### 3. Environment Configuration

**Frontend (.env.local):**
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
MONGODB_URI=mongodb://localhost:27017/opportunex
BACKEND_URL=http://localhost:5000
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Backend (server/.env):**
```bash
cd server
cp .env.example .env
```

Edit `server/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/opportunex
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
```

### 4. Seed Sample Data

```bash
cd server
npm run seed
```

This will create:
- 5 hackathons
- 5 internships  
- 5 workshops
- Across different Indian cities and platforms

### 5. Start the Application

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### 6. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/api/health

## 🎯 Features Implemented

### ✅ Real Opportunity Database
- MongoDB schema with comprehensive opportunity data
- API endpoint: `GET /api/opportunities`
- Supports filtering by:
  - Skills (e.g., `?skill=JavaScript`)
  - Category (e.g., `?category=hackathon`)
  - Location (e.g., `?location=Mumbai`)
  - Mode (e.g., `?mode=online`)
  - Organizer type (e.g., `?organizer_type=company`)

### ✅ Location-Based Search
- Filter opportunities by city/state
- Geolocation support (browser-based)
- Location matching in opportunity cards

### ✅ External Website Redirection
- All opportunity cards link to `official_link`
- Opens in new tab for seamless experience
- Preserves user context

### ✅ AI Roadmap Generation
- **Endpoint**: `POST /api/roadmap`
- **Input**: `{ opportunityId, userSkillLevel }`
- **Output**: Structured roadmap with phases, tasks, timeline
- Skill-level adaptive content (beginner/intermediate/advanced)

### ✅ PDF Roadmap Download
- **Endpoint**: `POST /api/roadmap/pdf`
- Generates formatted PDF with roadmap content
- Downloadable file with proper naming
- Includes tips and phase-wise breakdown

### ✅ Resume Upload & Processing
- **Endpoint**: `POST /api/resume/upload`
- Supports PDF, DOC, DOCX files (max 5MB)
- Automatic text extraction
- Skills detection using keyword matching
- Education information extraction

### ✅ Frontend Integration
- Real-time opportunity fetching
- Dynamic filtering and search
- "Guide Me" button → AI roadmap generation
- "Download PDF" functionality
- Resume upload with drag-and-drop
- Responsive mobile-first design

## 📊 Sample Data

The seed script creates realistic opportunities including:

**Hackathons:**
- Smart India Hackathon 2024 (Government)
- HackIndia Bangalore (Startup)
- CodeFest Mumbai (Company)
- EduHack Chennai (College)

**Internships:**
- Google Software Development Intern
- Flipkart Data Science Intern
- Zomato Frontend Developer Intern
- IIT Delhi AI Research Intern

**Workshops:**
- Full Stack Web Development
- Machine Learning Bootcamp
- Cloud Computing with AWS
- Mobile App Development with Flutter

## 🔧 API Endpoints

### Opportunities
```bash
# Get all opportunities
GET /api/opportunities

# With filters
GET /api/opportunities?category=hackathon&location=Mumbai&skill=React

# Pagination
GET /api/opportunities?page=2&limit=10
```

### Roadmap Generation
```bash
# Generate roadmap
POST /api/roadmap
{
  "opportunityId": "64f8a1b2c3d4e5f6a7b8c9d0",
  "userSkillLevel": "intermediate"
}

# Download PDF
POST /api/roadmap/pdf
{
  "roadmap": { ... },
  "opportunity": { ... }
}
```

### Resume Upload
```bash
# Upload resume
POST /api/resume/upload
Content-Type: multipart/form-data
Body: FormData with 'resume' file

# Response includes extracted skills and education
```

## 🛠️ Development

### Backend Structure
```
server/
├── index.js              # Main server file
├── config/
│   └── database.js       # MongoDB connection
├── models/
│   └── Opportunity.js    # Opportunity schema
├── routes/
│   ├── opportunities.js  # Opportunity CRUD
│   ├── roadmap.js       # AI roadmap generation
│   └── resume.js        # Resume upload/processing
└── scripts/
    └── seed.js          # Sample data seeding
```

### Frontend Integration
```
src/
├── app/
│   ├── api/             # Next.js API routes (proxy to backend)
│   ├── search/          # Search page with real data
│   └── profile/         # Profile with resume upload
└── components/
    └── opportunities/   # Updated opportunity cards
```

## 🔍 Testing the MVP

### 1. Search Functionality
- Visit http://localhost:3000/search
- Try searches like "JavaScript", "Mumbai", "hackathon"
- Apply filters and see real-time results

### 2. AI Roadmap Generation
- Click "Guide Me" on any opportunity card
- See generated roadmap with phases and tasks
- Download PDF version

### 3. Resume Upload
- Go to http://localhost:3000/profile
- Upload a PDF/DOC resume
- See extracted skills automatically added

### 4. External Links
- Click "Apply Now" on opportunity cards
- Verify links open in new tabs

## 🚨 Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
brew services list | grep mongodb

# Start MongoDB if not running
brew services start mongodb-community

# Check connection
mongosh mongodb://localhost:27017/opportunex
```

### Backend Not Starting
```bash
# Check if port 5000 is available
lsof -i :5000

# Kill process if needed
kill -9 <PID>

# Check logs
cd server && npm run dev
```

### Frontend API Errors
- Ensure backend is running on port 5000
- Check `BACKEND_URL` in `.env.local`
- Verify CORS settings in backend

### Resume Upload Issues
- Check file size (max 5MB)
- Ensure file types are PDF/DOC/DOCX
- Verify `uploads/resumes` directory exists

## 📈 Next Steps

This MVP provides a solid foundation. To enhance further:

1. **Real AI Integration**: Replace mock AI with OpenAI API
2. **User Authentication**: Add login/signup functionality
3. **Real Data Sources**: Integrate with actual job portals
4. **Advanced Search**: Add voice search and NLP
5. **Notifications**: Implement email/SMS alerts
6. **Mobile App**: Create React Native version

## 🎉 Success Criteria

✅ **Real Database**: MongoDB with structured opportunity data  
✅ **Working Backend**: Express.js API with all endpoints  
✅ **Frontend Integration**: React components using real data  
✅ **AI Roadmaps**: Generated and downloadable PDFs  
✅ **Resume Upload**: File processing with skill extraction  
✅ **External Links**: Direct redirection to original platforms  
✅ **Responsive Design**: Mobile-first UI/UX  
✅ **Sample Data**: 15+ realistic opportunities seeded  

The OpportuneX MVP is now ready for local development and testing! 🚀