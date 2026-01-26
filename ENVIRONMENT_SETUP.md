# Environment Variables and Secrets Management

This document provides comprehensive guidance for configuring environment variables and secrets management in the OpportuneX platform.

## Overview

OpportuneX uses a sophisticated environment management system that provides:

- **Environment-specific configurations** for development, production, and test environments
- **Comprehensive secrets management** with encryption and validation
- **Type-safe environment validation** using Zod schemas
- **Health monitoring** and audit capabilities
- **Secure handling** of sensitive information

## Environment Files Structure

```
.env.example          # Template with all available variables
.env.development      # Development-specific configuration
.env.production       # Production-specific configuration  
.env.test            # Test-specific configuration
.env.*.secrets       # Generated secrets (never commit these!)
.env                 # Local overrides (gitignored)
.env.local           # Next.js local overrides (gitignored)
```

## Quick Start

### 1. Copy Environment Template

```bash
# Copy the example file for your environment
cp .env.example .env.development
```

### 2. Generate Secrets

```bash
# Generate secure secrets for development
npm run secrets:generate:dev

# Generate secure secrets for production
npm run secrets:generate:prod
```

### 3. Validate Configuration

```bash
# Validate environment configuration
npm run env:validate

# Run comprehensive health check
npm run env:health
```

## Environment Variables Reference

### Database Configuration

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | ✅ | - |
| `REDIS_URL` | Redis connection string | ✅ | - |
| `DB_POOL_MIN` | Minimum database connections | ❌ | 2 |
| `DB_POOL_MAX` | Maximum database connections | ❌ | 10 |
| `DB_CONNECTION_TIMEOUT` | Connection timeout (ms) | ❌ | 10000 |
| `DB_IDLE_TIMEOUT` | Idle connection timeout (ms) | ❌ | 300000 |

### Elasticsearch Configuration

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `ELASTICSEARCH_URL` | Elasticsearch cluster URL | ❌ | - |
| `ELASTICSEARCH_USERNAME` | Elasticsearch username | ❌ | - |
| `ELASTICSEARCH_PASSWORD` | Elasticsearch password | ❌ | - |
| `ELASTICSEARCH_INDEX_PREFIX` | Index prefix for environments | ❌ | "" |

### Authentication & Security

| Variable | Description | Required | Min Length |
|----------|-------------|----------|------------|
| `JWT_SECRET` | JWT signing secret | ✅ | 32 chars (64 in prod) |
| `REFRESH_TOKEN_SECRET` | Refresh token secret | ✅ | 32 chars (64 in prod) |
| `SECRETS_ENCRYPTION_KEY` | Secret encryption key | ❌ | 32 chars |
| `SECURE_COOKIES` | Enable secure cookies | ❌ | false |
| `HTTPS_ONLY` | Enforce HTTPS | ❌ | false |
| `CORS_ORIGIN` | CORS allowed origin | ❌ | - |

### External APIs

| Variable | Description | Required | Environment |
|----------|-------------|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key | ❌ | Production |
| `GOOGLE_SPEECH_TO_TEXT_API_KEY` | Google Speech API key | ❌ | Production |
| `AZURE_SPEECH_KEY` | Azure Speech API key | ❌ | Production |
| `AZURE_SPEECH_REGION` | Azure Speech region | ❌ | Production |
| `SENDGRID_API_KEY` | SendGrid email API key | ❌ | Production |
| `FROM_EMAIL` | Default sender email | ❌ | Production |
| `TWILIO_ACCOUNT_SID` | Twilio SMS account SID | ❌ | Production |
| `TWILIO_AUTH_TOKEN` | Twilio SMS auth token | ❌ | Production |
| `TWILIO_PHONE_NUMBER` | Twilio phone number | ❌ | Production |

### Application Configuration

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEXT_PUBLIC_APP_URL` | Public application URL | ❌ | http://localhost:3000 |
| `NEXT_PUBLIC_API_URL` | Public API URL | ❌ | http://localhost:3000/api |
| `NODE_ENV` | Environment mode | ❌ | development |
| `DEBUG_MODE` | Enable debug logging | ❌ | false |
| `LOG_LEVEL` | Logging level | ❌ | info |

### Performance & Caching

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `REDIS_MAX_CONNECTIONS` | Max Redis connections | ❌ | 10 |
| `REDIS_CONNECTION_TIMEOUT` | Redis timeout (ms) | ❌ | 5000 |
| `CACHE_TTL_DEFAULT` | Default cache TTL (seconds) | ❌ | 3600 |
| `CACHE_TTL_SEARCH` | Search cache TTL (seconds) | ❌ | 1800 |
| `CACHE_TTL_USER_DATA` | User data cache TTL (seconds) | ❌ | 7200 |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window (ms) | ❌ | 900000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | ❌ | 100 |

### Feature Flags

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `ENABLE_VOICE_SEARCH` | Enable voice search | ❌ | true |
| `ENABLE_AI_INSTRUCTOR` | Enable AI instructor | ❌ | true |
| `ENABLE_NOTIFICATIONS` | Enable notifications | ❌ | true |
| `ENABLE_ANALYTICS` | Enable analytics | ❌ | true |

### Monitoring & Analytics

| Variable | Description | Required | Environment |
|----------|-------------|----------|-------------|
| `SENTRY_DSN` | Sentry error monitoring DSN | ❌ | Production |
| `GOOGLE_ANALYTICS_ID` | Google Analytics ID | ❌ | Production |
| `ENABLE_PERFORMANCE_MONITORING` | Enable performance monitoring | ❌ | false |

## Environment-Specific Configuration

### Development Environment

Development environment focuses on ease of development and debugging:

```bash
# Use development environment file
cp .env.development .env

# Key characteristics:
# - Relaxed security requirements
# - Debug logging enabled
# - Higher rate limits
# - Mock external APIs
# - Local database connections
```

### Production Environment

Production environment emphasizes security and performance:

```bash
# Use production environment file
cp .env.production .env

# Key requirements:
# - Strong secrets (64+ characters)
# - HTTPS enforcement
# - Secure cookies
# - Error monitoring
# - Performance monitoring
# - External service integration
```

### Test Environment

Test environment is optimized for automated testing:

```bash
# Use test environment file
cp .env.test .env

# Key characteristics:
# - Isolated test database
# - Mock external APIs
# - Fast cache expiration
# - Silent logging
# - Deterministic behavior
```

## Secrets Management

### Secret Classification

Secrets are classified by security level:

- **PUBLIC**: Non-sensitive configuration
- **INTERNAL**: Internal configuration, not secret but not public
- **CONFIDENTIAL**: Sensitive data requiring protection
- **RESTRICTED**: Highly sensitive data requiring maximum protection

### Generating Secrets

```bash
# Generate secrets for specific environment
npm run secrets:generate:dev
npm run secrets:generate:prod

# Generate specific secrets
npm run secrets:rotate production JWT_SECRET REFRESH_TOKEN_SECRET

# Validate secrets
npm run secrets:validate
npm run secrets:validate:prod

# Audit secrets
npm run secrets:audit
```

### Secret Rotation

Regular secret rotation is recommended:

```bash
# Rotate all secrets for environment
npm run secrets:rotate production

# Rotate specific secrets
npm run secrets:rotate production JWT_SECRET

# Validate after rotation
npm run secrets:validate:prod
```

## Validation and Health Checks

### Environment Validation

```bash
# Validate environment configuration
npm run env:validate

# Output example:
# ✅ Environment is healthy (development)
# ✅ All required secrets are configured (8/12)
# ✅ Database connection successful
# ✅ Redis connection successful
```

### Health Monitoring

```bash
# Run comprehensive health check
npm run env:health

# JSON output for monitoring systems
npm run env:health:json

# Monitoring-friendly output
npm run env:health:monitoring
```

### Continuous Monitoring

Health checks can be integrated into monitoring systems:

```bash
# Add to cron for regular health checks
*/5 * * * * cd /app && npm run env:health:monitoring >> /var/log/health.log
```

## Security Best Practices

### 1. Secret Management

- **Never commit secrets** to version control
- **Use strong, unique secrets** for each environment
- **Rotate secrets regularly** (quarterly for production)
- **Use environment-specific secrets** (don't reuse across environments)
- **Monitor secret usage** and access patterns

### 2. Environment Separation

- **Isolate environments** completely (separate databases, caches, etc.)
- **Use different domains** for different environments
- **Implement proper access controls** for each environment
- **Monitor cross-environment access** attempts

### 3. Production Security

- **Enable HTTPS enforcement** (`HTTPS_ONLY=true`)
- **Use secure cookies** (`SECURE_COOKIES=true`)
- **Configure proper CORS** origins
- **Enable error monitoring** (Sentry)
- **Use strong database passwords**
- **Implement proper firewall rules**

### 4. Development Security

- **Use development-specific secrets** (never production secrets)
- **Avoid sensitive data** in development databases
- **Use local services** when possible
- **Implement proper .gitignore** rules

## Troubleshooting

### Common Issues

#### 1. Missing Required Secrets

```bash
# Error: Missing required secrets: JWT_SECRET, REFRESH_TOKEN_SECRET
npm run secrets:generate:dev
```

#### 2. Database Connection Failed

```bash
# Check database URL format
npm run env:validate

# Test database connection
npm run db:migrate
```

#### 3. Redis Connection Failed

```bash
# Check Redis URL and service status
npm run redis:health

# Start Redis if needed
docker compose -f docker-compose.dev.yml up redis -d
```

#### 4. Elasticsearch Not Available

```bash
# Check Elasticsearch configuration
npm run es:health

# Start Elasticsearch if needed
docker compose -f docker-compose.dev.yml up elasticsearch -d
```

### Validation Errors

#### Production Validation Failures

```bash
# Error: JWT_SECRET should be at least 64 characters in production
npm run secrets:generate:prod

# Error: HTTPS_ONLY should be enabled in production
# Set HTTPS_ONLY=true in .env.production
```

#### Secret Validation Warnings

```bash
# Warning: JWT_SECRET appears to contain placeholder values
# Replace placeholder values with actual secrets

# Warning: Secret has expired and should be rotated
npm run secrets:rotate production JWT_SECRET
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Environment Validation
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Validate environment
        run: npm run env:validate
        env:
          NODE_ENV: test
          DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
          REDIS_URL: ${{ secrets.TEST_REDIS_URL }}
          JWT_SECRET: ${{ secrets.TEST_JWT_SECRET }}
          REFRESH_TOKEN_SECRET: ${{ secrets.TEST_REFRESH_TOKEN_SECRET }}
```

### Docker Integration

```dockerfile
# Dockerfile
FROM node:18-alpine

# Copy environment configuration
COPY .env.production .env

# Validate environment during build
RUN npm run env:validate

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD npm run env:health:monitoring || exit 1
```

## Monitoring and Alerting

### Health Check Endpoints

The environment health check can be exposed as an API endpoint:

```typescript
// pages/api/health.ts
import { EnvironmentHealthChecker } from '@/scripts/env-health-check'

export default async function handler(req, res) {
  const checker = new EnvironmentHealthChecker()
  await checker.runAllChecks()
  const report = checker.generateMonitoringReport()
  
  res.status(report.status === 'healthy' ? 200 : 503).json(report)
}
```

### Monitoring Integration

```bash
# Prometheus metrics endpoint
curl http://localhost:3000/api/health

# Nagios check
npm run env:health:monitoring && echo "OK" || echo "CRITICAL"

# Custom monitoring script
#!/bin/bash
HEALTH=$(npm run env:health:monitoring)
if [ $? -eq 0 ]; then
  echo "Environment healthy"
else
  echo "Environment unhealthy: $HEALTH"
  # Send alert
fi
```

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**: Run health checks and review warnings
2. **Monthly**: Validate all environment configurations
3. **Quarterly**: Rotate production secrets
4. **Annually**: Review and update security policies

### Getting Help

- Check the validation output for specific error messages
- Run health checks to identify system issues
- Review the secrets audit for security concerns
- Consult the troubleshooting section for common problems

For additional support, refer to the main project documentation or create an issue in the project repository.