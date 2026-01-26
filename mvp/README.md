# OpportuneX MVP

A simple MVP implementation of the OpportuneX platform - an AI-powered opportunity discovery platform for students.

## Features

- **Chat-style Search**: Natural language search for opportunities
- **Smart Filtering**: Filter by skills, mode, location, and type
- **Opportunity Cards**: Clean display with platform tags and external links
- **AI Roadmap Generator**: Mock AI endpoint that generates preparation roadmaps
- **Responsive Design**: Mobile-first design with beautiful gradients
- **Real-time Search**: Search as you type with debouncing

## Tech Stack

- **Frontend**: React 18 with TypeScript
- **Backend**: Node.js + Express
- **Database**: In-memory mock data
- **Styling**: Pure CSS with modern design

## Quick Start

### Prerequisites
- Node.js 16+ installed
- npm or yarn

### Installation

1. **Clone and navigate to the MVP directory**
   ```bash
   cd mvp
   ```

2. **Install backend dependencies**
   ```bash
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd client
   npm install
   cd ..
   ```

4. **Start both servers**
   ```bash
   npm run dev
   ```

   This will start:
   - Backend server on http://localhost:5000
   - Frontend development server on http://localhost:3000

### Alternative: Start servers separately

**Terminal 1 - Backend:**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run client
```

## API Endpoints

### GET /api/opportunities
Search and filter opportunities.

**Query Parameters:**
- `query` - Search term
- `skills` - Comma-separated skills
- `mode` - online, offline, hybrid, any
- `location` - Location filter
- `type` - hackathon, internship, workshop, all

**Example:**
```
GET /api/opportunities?query=AI&skills=Python,Machine Learning&mode=online
```

### POST /api/roadmap
Generate AI roadmap for an opportunity.

**Request Body:**
```json
{
  "opportunityId": "1",
  "userSkills": ["Python", "React"]
}
```

## Sample Data

The MVP includes 5 sample opportunities:
1. **AI/ML Hackathon 2024** - Corporate hackathon with ₹1,00,000 prizes
2. **Frontend Developer Internship** - Remote startup internship
3. **Web Development Workshop** - Free IIT Delhi workshop
4. **Data Science Competition** - Online Kaggle-style competition
5. **Mobile App Development Internship** - Hybrid Bangalore internship

## Features Demonstrated

### 🔍 Smart Search
- Natural language queries like "AI hackathons in Mumbai"
- Real-time search with debouncing
- Search across titles, descriptions, skills, and tags

### 🎯 Advanced Filtering
- Filter by opportunity type (hackathon, internship, workshop)
- Filter by mode (online, offline, hybrid)
- Filter by required skills
- Filter by location
- Popular search tags for quick filtering

### 📋 Opportunity Cards
- Clean, modern card design
- Essential information display (title, organizer, deadline, skills)
- Platform tags showing original source
- Deadline urgency indicators
- Direct links to external platforms

### 🤖 AI Roadmap Generator
- Mock AI endpoint that generates personalized roadmaps
- Different roadmap templates for different opportunity types
- Phase-based preparation plans with tasks
- Personalized tips based on opportunity requirements
- Beautiful modal interface with loading states

### 📱 Responsive Design
- Mobile-first approach
- Beautiful gradient backgrounds
- Glassmorphism design elements
- Smooth animations and transitions
- Touch-friendly interface

## Project Structure

```
mvp/
├── package.json              # Root package.json with scripts
├── server/
│   └── index.js             # Express server with mock data
├── client/
│   ├── package.json         # React app dependencies
│   ├── public/
│   │   └── index.html       # HTML template
│   └── src/
│       ├── App.tsx          # Main app component
│       ├── App.css          # Global styles
│       ├── index.tsx        # React entry point
│       └── components/
│           ├── SearchBar.tsx        # Search input component
│           ├── FilterSidebar.tsx    # Filter controls
│           ├── OpportunityCard.tsx  # Opportunity display
│           └── RoadmapModal.tsx     # AI roadmap modal
└── README.md
```

## Customization

### Adding New Opportunities
Edit `server/index.js` and add new objects to the `mockOpportunities` array.

### Modifying Roadmap Logic
Update the `generateRoadmap` function in `server/index.js` to customize AI roadmap generation.

### Styling Changes
Each component has its own CSS file for easy customization.

## Production Deployment

### Build for Production
```bash
cd client
npm run build
```

### Serve Static Files
Update `server/index.js` to serve the built React app:

```javascript
app.use(express.static(path.join(__dirname, '../client/build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/build', 'index.html'));
});
```

## Next Steps

This MVP demonstrates the core concepts of OpportuneX. To build the full platform:

1. **Database Integration**: Replace mock data with PostgreSQL + Prisma
2. **Real AI Integration**: Connect to OpenAI/Claude APIs for roadmap generation
3. **User Authentication**: Add JWT-based auth system
4. **Voice Search**: Integrate speech-to-text APIs
5. **Data Aggregation**: Build web scraping and API integration services
6. **Advanced Search**: Implement Elasticsearch for better search
7. **Notifications**: Add email/SMS notification system
8. **PWA Features**: Add offline support and push notifications

## License

MIT License - feel free to use this code for learning and development!