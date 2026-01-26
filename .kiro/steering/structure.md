# Project Structure & Organization

## Root Directory Structure

```
├── .kiro/                  # Kiro configuration and specs
├── src/                    # Source code
├── prisma/                 # Database schema and migrations
├── public/                 # Static assets and PWA files
├── scripts/                # Database initialization scripts
└── docker-compose*.yml     # Container orchestration
```

## Source Code Organization (`src/`)

### Application Layer (`src/app/`)
Next.js App Router structure:
- `layout.tsx` - Root layout with global providers
- `page.tsx` - Home page component
- `globals.css` - Global styles and Tailwind imports
- `api/` - API route handlers organized by feature
- Feature-based page directories (`search/`, `profile/`, `roadmap/`)

### Component Layer (`src/components/`)
Organized by feature and reusability:
- `ui/` - Base reusable UI components (Button, Card, Input, etc.)
- `layout/` - Layout-specific components (Header, Footer, Navigation)
- Feature-specific directories (`search/`, `opportunities/`, `profile/`, etc.)
- `pwa/` - Progressive Web App components
- `onboarding/` - User onboarding flow components

### Business Logic (`src/lib/`)
Core application logic and utilities:
- `services/` - Business logic services (auth, search, notifications, etc.)
- `middleware/` - Express middleware (auth, validation, error handling)
- `routes/` - API Gateway route definitions
- Database and external service configurations
- Utility functions and constants

### Custom Hooks (`src/hooks/`)
Reusable React hooks for:
- Accessibility features
- PWA functionality
- Search and infinite scroll
- Keyboard navigation
- Onboarding state management

### Type Definitions (`src/types/`)
- `index.ts` - Core TypeScript type definitions
- Shared interfaces and types across the application

### Testing (`src/test/`)
Comprehensive testing structure:
- `property/` - Property-based tests using fast-check
- `integration/` - API integration tests
- Unit test files co-located with source files (`.test.ts` suffix)
- Test setup and configuration files

### Scripts (`src/scripts/`)
Utility and maintenance scripts:
- Database seeding and testing
- Health checks for external services
- Environment validation
- Development and debugging tools

## Naming Conventions

### Files & Directories
- **kebab-case** for directories (`user-profile/`, `search-filters/`)
- **PascalCase** for React components (`UserProfile.tsx`, `SearchBar.tsx`)
- **camelCase** for utilities and services (`auth.service.ts`, `searchUtils.ts`)
- **lowercase** for configuration files (`package.json`, `tsconfig.json`)

### Code Conventions
- **PascalCase** for React components and TypeScript interfaces
- **camelCase** for functions, variables, and object properties
- **SCREAMING_SNAKE_CASE** for constants and environment variables
- **kebab-case** for CSS classes and HTML attributes

## Import Organization

### Path Aliases
- `@/components/*` - Component imports
- `@/lib/*` - Library and utility imports
- `@/types/*` - Type definition imports
- `@/hooks/*` - Custom hook imports

### Import Order
1. External libraries (React, Next.js, etc.)
2. Internal path alias imports (`@/`)
3. Relative imports (`./`, `../`)
4. Type-only imports (using `import type`)

## Database Schema (`prisma/`)
- Single `schema.prisma` file with all models
- Enum definitions for type safety
- Comprehensive relationships and constraints
- UUID primary keys for all entities

## Configuration Files
- Environment-specific configs (`.env.*`)
- TypeScript strict configuration
- ESLint and Prettier for code quality
- Jest configurations for different test types
- Docker configurations for development and production

## Feature Organization Pattern

Each major feature follows this structure:
```
src/
├── app/feature/           # Next.js pages
├── components/feature/    # Feature-specific components
├── lib/services/         # Business logic services
├── hooks/                # Feature-specific hooks
└── test/                 # Feature tests
```

This organization promotes:
- Clear separation of concerns
- Easy feature discovery and maintenance
- Consistent patterns across the codebase
- Scalable architecture for team development