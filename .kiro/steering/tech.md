# Technology Stack & Build System

## Core Technologies

### Frontend
- **Next.js 15** with App Router
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **Progressive Web App** capabilities

### Backend
- **Next.js API Routes** for serverless functions
- **Node.js** runtime
- **Express.js** for API Gateway server

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

## Build System & Scripts

### Development
```bash
npm run dev                 # Start Next.js development server
npm run api-gateway:dev     # Start API Gateway with hot reload
npm run docker:dev          # Start development services with Docker
```

### Database Management
```bash
npm run db:generate         # Generate Prisma client
npm run db:push            # Push schema changes to database
npm run db:migrate         # Run database migrations
npm run db:seed            # Seed database with initial data
npm run db:studio          # Open Prisma Studio
```

### Infrastructure Health Checks
```bash
npm run env:health         # Check all environment variables
npm run redis:health       # Check Redis connection
npm run es:health          # Check Elasticsearch connection
npm run es:init            # Initialize Elasticsearch indices
```

### Code Quality
```bash
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint issues automatically
npm run type-check         # Run TypeScript type checking
npm run format             # Format code with Prettier
npm run code-quality       # Run all quality checks
npm run code-quality:fix   # Fix all quality issues
```

### Testing
```bash
npm run test               # Run unit tests
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
npm run test:integration   # Run integration tests
npm run test:property      # Run property-based tests
npm run test:smoke         # Run smoke tests
```

### Production & Deployment
```bash
npm run build              # Build for production
npm run start              # Start production server
npm run docker:prod        # Build and start production containers
```

## Development Environment

### Required Services
- Node.js 18+
- PostgreSQL 14+
- Redis 6+
- Elasticsearch 8+

### Docker Setup
Use `docker-compose.dev.yml` for development environment with all required services.

## Code Quality Standards

- **TypeScript Strict Mode** enabled
- **ESLint** with Next.js and accessibility rules
- **Prettier** for consistent formatting
- **Husky** pre-commit hooks for quality gates
- **Path aliases** configured for clean imports (`@/components`, `@/lib`, etc.)

## Testing Strategy

- **Unit Tests**: Jest with ts-jest
- **Integration Tests**: API endpoint testing with Supertest
- **Property-Based Tests**: fast-check for comprehensive testing
- **Smoke Tests**: Critical path validation
- Separate Jest configurations for different test types