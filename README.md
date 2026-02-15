# OpportuneX - AI-Powered Opportunity Discovery Platform

[![Built with Kiro](https://img.shields.io/badge/Built%20with-Kiro-blue)](https://kiro.ai)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3-38B2AC)](https://tailwindcss.com/)

OpportuneX is an AI-powered platform designed to help students, particularly from Tier 2 and Tier 3 cities in India, discover and access hackathons, internships, and workshops through natural language interactions.

## 📚 Documentation

- **[REQUIREMENTS.md](REQUIREMENTS.md)** - Complete requirements specification with user stories and acceptance criteria
- **[DESIGN.md](DESIGN.md)** - System architecture, data models, and technical design
- **[NEXT_STEPS_GUIDE.md](NEXT_STEPS_GUIDE.md)** - Deployment and setup guide
- **[docs/](docs/)** - Feature-specific documentation and guides

## 🚀 Features

- **Smart Search**: Natural language search for opportunities with advanced filtering
- **Voice Search**: Multi-language voice commands (English and Hindi)
- **AI Instructor**: Personalized preparation roadmaps and guidance
- **Real-time Data**: Automated fetching from MLH and other platforms
- **Mobile-First Design**: Responsive interface optimized for mobile devices
- **Smart Notifications**: Personalized opportunity alerts via email, SMS, and in-app
- **Progressive Web App**: Offline capabilities and installable experience
- **Resume Parsing**: Upload resume and auto-populate profile details
- **Theme Support**: Light, dark, and system theme modes

## 🛠️ Tech Stack

### Frontend

- **Next.js 15** with App Router
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **Progressive Web App** capabilities

### Backend

- **Next.js API Routes** for serverless functions
- **Node.js** runtime with Express.js
- **Real-time data fetching** from MLH and other sources

### Database & Storage

- **PostgreSQL 15+** as primary database
- **Prisma** as ORM with strict type safety
- **Redis 6+** for caching and session storage
- **Elasticsearch 8+** for search functionality

### External Services

- **OpenAI API** for AI features
- **Speech-to-Text APIs** (Google, Azure)
- **SendGrid** for email notifications
- **Twilio** for SMS notifications

## 🏗️ Built with Kiro

This project was built using **Kiro AI assistant** with a spec-driven development methodology. The `.kiro` directory contains:

- **Specifications**: Complete requirements, design, and task breakdown
- **Steering Rules**: Project structure, technology stack, and product guidelines
- **Property-Based Tests**: Comprehensive testing with formal correctness properties

### Spec-Driven Development

The project follows a systematic approach:

1. **Requirements Analysis** → Clear user stories and acceptance criteria ([REQUIREMENTS.md](REQUIREMENTS.md))
2. **Design Documentation** → Comprehensive system architecture and API design ([DESIGN.md](DESIGN.md))
3. **Task Breakdown** → 156 detailed implementation tasks
4. **Property-Based Testing** → 15 formal correctness properties and automated testing
5. **Design Documentation** → Comprehensive system architecture and API design
6. **Task Breakdown** → 156 detailed implementation tasks
7. **Property-Based Testing** → Formal correctness properties and automated testing

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Elasticsearch 8+ (optional)

### Installation

1. **Clone the repository**

   ```bash
   git clone <your-repo-url>
   cd opportunex
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Start the development servers**

   ```bash
   # Start frontend (Next.js)
   npm run dev

   # Start backend server (in another terminal)
   cd server && npm start

   # Start automated backend (in another terminal)
   cd backend && npm start
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Main Server: http://localhost:5001
   - Backend API: http://localhost:5002

## 📁 Project Structure

```
├── .kiro/                  # Kiro configuration and specs
│   ├── specs/             # Feature specifications
│   └── steering/          # Project guidelines
├── src/                   # Source code
│   ├── app/              # Next.js App Router
│   ├── components/       # React components
│   ├── lib/              # Business logic and utilities
│   ├── hooks/            # Custom React hooks
│   └── test/             # Test suites
├── backend/              # Automated data fetching backend
├── server/               # Main application server
├── prisma/               # Database schema
└── public/               # Static assets
```

## 🧪 Testing

The project includes comprehensive testing:

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Property-based tests
npm run test:property

# Smoke tests
npm run test:smoke

# All tests with coverage
npm run test:coverage
```

## 🚀 Deployment

### Development

```bash
npm run docker:dev
```

### Production

```bash
npm run build
npm run docker:prod
```

### Kubernetes

```bash
npm run deploy:k8s
```

## 📊 Key Metrics

- **156 Implementation Tasks** completed
- **8 Property-Based Tests** for correctness validation
- **Mobile-First Design** with PWA capabilities
- **Real-time Data** from 6+ MLH hackathons
- **Multi-language Support** (English/Hindi voice search)

## 🤝 Contributing

This project was built using Kiro's spec-driven development methodology. To contribute:

1. Review the specifications in `.kiro/specs/`
2. Follow the project structure guidelines in `.kiro/steering/`
3. Ensure all property-based tests pass
4. Add new features following the established patterns

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Kiro AI Assistant](https://kiro.ai) using spec-driven development
- MLH (Major League Hacking) for hackathon data
- Open source community for the amazing tools and libraries

---

**Built with ❤️ using Kiro AI Assistant and spec-driven development methodology**
