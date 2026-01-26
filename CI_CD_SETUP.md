# CI/CD Pipeline Setup for OpportuneX

This document describes the comprehensive CI/CD pipeline implemented for the OpportuneX platform using GitHub Actions.

## Overview

The CI/CD pipeline consists of multiple workflows that handle different aspects of the development and deployment process:

1. **Continuous Integration (CI)** - Code quality, testing, and building
2. **Continuous Deployment (CD)** - Automated deployment to staging and production
3. **Security Monitoring** - Dependency updates and security scanning
4. **Property-Based Testing** - Comprehensive correctness validation
5. **Database Migration** - Safe database schema updates

## Workflows

### 1. CI Pipeline (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

**Jobs:**
- **Code Quality**: ESLint, TypeScript type checking, Prettier formatting
- **Security Scan**: npm audit, Snyk vulnerability scanning
- **Tests**: Unit tests, integration tests with PostgreSQL, Redis, and Elasticsearch
- **Build**: Next.js application build with artifact upload
- **Docker Build**: Container image build and Trivy security scanning
- **Performance**: Lighthouse CI performance testing (PR only)
- **Deployment Check**: Readiness verification for production deployment

**Services:**
- PostgreSQL 15
- Redis 7
- Elasticsearch 8.11.0

### 2. Deployment Pipeline (`.github/workflows/deploy.yml`)

**Triggers:**
- Push to `main` branch
- Manual workflow dispatch with environment selection

**Jobs:**
- **Build & Push**: Docker image build and push to GitHub Container Registry
- **Deploy Staging**: Automated staging deployment with smoke tests
- **Deploy Production**: Production deployment with health checks and rollback capability
- **Rollback**: Automatic rollback on deployment failure

**Environments:**
- `staging`: https://staging.opportunex.com
- `production`: https://opportunex.com

### 3. Security Monitoring (`.github/workflows/security-monitoring.yml`)

**Triggers:**
- Daily schedule (2 AM UTC)
- Manual workflow dispatch

**Jobs:**
- **Security Audit**: npm audit with vulnerability reporting
- **Dependency Updates**: Automated dependency updates with PR creation
- **Container Security**: Trivy container vulnerability scanning
- **License Check**: License compliance verification
- **Security Notifications**: Alert system for security issues

### 4. Property-Based Testing (`.github/workflows/property-based-testing.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches
- Nightly schedule for extended testing
- Manual workflow dispatch with configurable iterations

**Jobs:**
- **Property Tests**: Matrix-based testing across different property groups
  - Search and Filtering (Properties 1, 2, 3, 14)
  - User Management (Properties 9, 10)
  - Data Aggregation (Properties 4, 5, 6, 12, 15)
  - AI Instructor (Properties 7, 8)
  - Notifications (Properties 11, 13)
- **Extended Testing**: Nightly runs with 10,000 iterations per property
- **Analysis**: Test result analysis and reporting

### 5. Database Migration (`.github/workflows/database-migration.yml`)

**Triggers:**
- Push to `main` branch with Prisma schema changes
- Manual workflow dispatch with environment and action selection

**Jobs:**
- **Validate Migration**: Test migration on clean database
- **Deploy Staging**: Apply migration to staging with backup
- **Deploy Production**: Production migration with maintenance mode
- **Migration Status**: Check current migration status across environments

## Configuration Files

### Testing Configuration

- `jest.config.js` - Unit test configuration
- `jest.integration.config.js` - Integration test configuration
- `jest.property.config.js` - Property-based test configuration
- `jest.smoke.config.js` - Smoke test configuration
- `.lighthouserc.json` - Lighthouse CI performance testing

### Dependency Management

- `.github/dependabot.yml` - Automated dependency updates
- Weekly updates for npm, GitHub Actions, and Docker
- Automatic PR creation with proper labeling

### Test Setup Files

- `src/test/setup.ts` - Unit test setup with mocks
- `src/test/integration-setup.ts` - Integration test setup with real services
- `src/test/property-setup.ts` - Property-based test setup with fast-check
- `src/test/smoke-setup.ts` - Smoke test setup for different environments
- `src/test/global-setup.ts` - Global test setup and service waiting
- `src/test/global-teardown.ts` - Global test cleanup

## Environment Variables and Secrets

### Required GitHub Secrets

**Production Deployment:**
- `PRODUCTION_DATABASE_URL` - Production PostgreSQL connection string
- `PRODUCTION_REDIS_URL` - Production Redis connection string
- `PRODUCTION_ELASTICSEARCH_URL` - Production Elasticsearch URL

**Staging Deployment:**
- `STAGING_DATABASE_URL` - Staging PostgreSQL connection string
- `STAGING_REDIS_URL` - Staging Redis connection string
- `STAGING_ELASTICSEARCH_URL` - Staging Elasticsearch URL

**External Services:**
- `OPENAI_API_KEY` - OpenAI API key for AI features
- `SENDGRID_API_KEY` - SendGrid API key for email notifications
- `TWILIO_ACCOUNT_SID` - Twilio account SID for SMS
- `TWILIO_AUTH_TOKEN` - Twilio auth token for SMS

**Security and Monitoring:**
- `SNYK_TOKEN` - Snyk security scanning token
- `CODECOV_TOKEN` - Codecov test coverage reporting

### Environment Files

- `.env.test` - Test environment variables
- `.env.development` - Development environment variables
- `.env.production` - Production environment variables (template)

## Testing Strategy

### Unit Tests
- Fast, isolated tests for individual components
- Mocked external dependencies
- High code coverage requirements

### Integration Tests
- End-to-end testing with real database, Redis, and Elasticsearch
- API endpoint testing
- Service integration validation

### Property-Based Tests
- Comprehensive correctness validation using fast-check
- 15 defined properties covering all major system behaviors
- Configurable iteration counts (100 for CI, 10,000 for nightly)
- Automatic counterexample reporting

### Smoke Tests
- Basic functionality verification in deployed environments
- Health check validation
- Critical user journey testing

## Security Features

### Code Security
- ESLint security rules
- npm audit for dependency vulnerabilities
- Snyk security scanning with SARIF reporting
- License compliance checking

### Container Security
- Trivy vulnerability scanning for Docker images
- Multi-architecture builds (amd64, arm64)
- Minimal base images with security updates

### Dependency Management
- Automated dependency updates via Dependabot
- Security-focused update scheduling
- Automated testing of dependency updates

## Deployment Strategy

### Blue-Green Deployment
- Zero-downtime deployments
- Automatic rollback on failure
- Health check validation before traffic switching

### Database Migrations
- Backup creation before migrations
- Maintenance mode during critical migrations
- Rollback capability with backup restoration

### Monitoring and Alerting
- Deployment status tracking
- Health check monitoring
- Automatic notification on failures

## Performance Monitoring

### Lighthouse CI
- Performance, accessibility, and SEO scoring
- Automated performance regression detection
- Mobile and desktop testing

### Load Testing
- Concurrent user simulation
- Performance baseline establishment
- Scalability validation

## Getting Started

### Prerequisites
1. Node.js 18+
2. Docker and Docker Compose
3. PostgreSQL 15+
4. Redis 7+
5. Elasticsearch 8.11.0+

### Local Development
```bash
# Install dependencies
npm ci

# Start services
npm run docker:dev

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### Running Tests
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Property-based tests
npm run test:property

# All tests with coverage
npm run test:coverage
```

### Manual Deployment
```bash
# Build application
npm run build

# Build Docker image
docker build -t opportunex .

# Deploy to staging (requires proper environment setup)
# This would typically be handled by the CI/CD pipeline
```

## Monitoring and Maintenance

### Daily Tasks (Automated)
- Security vulnerability scanning
- Dependency update checking
- Performance monitoring

### Weekly Tasks (Automated)
- Dependency updates via Dependabot
- Extended property-based testing
- License compliance checking

### Manual Tasks
- Review and merge dependency update PRs
- Monitor deployment success/failure notifications
- Review security scan results
- Update environment configurations as needed

## Troubleshooting

### Common Issues

**CI Pipeline Failures:**
1. Check service health (PostgreSQL, Redis, Elasticsearch)
2. Verify environment variables are set correctly
3. Review test logs for specific failures

**Deployment Failures:**
1. Check Docker image build logs
2. Verify secrets are configured in GitHub
3. Review deployment environment health

**Test Failures:**
1. Check if services are running locally
2. Verify test database is clean
3. Review property test counterexamples

### Support
For issues with the CI/CD pipeline, check:
1. GitHub Actions workflow logs
2. Service health check outputs
3. Test result artifacts
4. Security scan reports

## Future Enhancements

### Planned Improvements
1. Advanced monitoring with Prometheus/Grafana
2. Canary deployments for production
3. Automated performance regression testing
4. Enhanced security scanning with additional tools
5. Multi-region deployment support
6. Advanced rollback strategies

### Metrics and KPIs
- Deployment frequency
- Lead time for changes
- Mean time to recovery (MTTR)
- Change failure rate
- Test coverage percentage
- Security vulnerability resolution time