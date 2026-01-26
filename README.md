# OpportuneX

OpportuneX is an AI-powered platform designed to help students, particularly from Tier 2 and Tier 3 cities in India, discover and access hackathons, internships, and workshops through natural language interactions.

## Features

- 🔍 **Smart Search**: Natural language search for opportunities
- 🎤 **Voice Search**: Search using voice commands in English and Hindi
- 🤖 **AI Instructor**: Personalized preparation roadmaps
- 📱 **Mobile-First**: Responsive design optimized for mobile devices
- 🔔 **Smart Notifications**: Personalized opportunity alerts
- 🎯 **Advanced Filtering**: Filter by skills, location, mode, and more

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL, Redis (caching)
- **Search**: Elasticsearch
- **AI/ML**: OpenAI API, Speech-to-Text APIs
- **Authentication**: JWT
- **Deployment**: Docker, Kubernetes

## Getting Started

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- Redis 6+
- Elasticsearch 8+

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-org/opportunex.git
   cd opportunex
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. Set up the database:
   ```bash
   # Start PostgreSQL and create database
   createdb opportunex_dev
   
   # Run migrations (when available)
   npm run db:migrate
   ```

5. Start development services:
   ```bash
   # Start Redis
   redis-server
   
   # Start Elasticsearch
   # Follow Elasticsearch installation guide for your OS
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── search/            # Search pages
├── components/            # Reusable UI components
│   └── ui/               # Base UI components
├── lib/                  # Utility functions and configurations
│   ├── constants.ts      # Application constants
│   └── utils.ts          # Utility functions
└── types/                # TypeScript type definitions
    └── index.ts          # Core type definitions
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript type checking

### Code Style

This project uses:
- ESLint for code linting
- Prettier for code formatting
- TypeScript strict mode
- Tailwind CSS for styling

### Testing

Testing will be implemented in subsequent phases:
- Unit tests with Jest and React Testing Library
- Property-based tests with fast-check
- Integration tests for API endpoints
- End-to-end tests with Playwright

## Architecture

The application follows a microservices architecture with the following key components:

- **API Gateway**: Request routing and authentication
- **Search Service**: Natural language and voice search
- **AI Instructor Service**: Personalized roadmap generation
- **Data Aggregation Service**: Opportunity data collection
- **User Management Service**: User profiles and preferences
- **Notification Service**: Email, SMS, and in-app notifications

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, email support@opportunex.com or join our community Discord server.

## Roadmap

- [ ] Phase 1: Foundation and Core Infrastructure ✅
- [ ] Phase 2: Backend Services Implementation
- [ ] Phase 3: Data Aggregation System
- [ ] Phase 4: AI and Machine Learning Features
- [ ] Phase 5: Frontend Implementation
- [ ] Phase 6: Notification and Communication
- [ ] Phase 7: Testing and Quality Assurance
- [ ] Phase 8: Performance and Optimization
- [ ] Phase 9: Security and Compliance
- [ ] Phase 10: Deployment and Production