# Environment Variables Documentation

Complete guide to configuring OpportuneX environment variables.

## Required Variables

### Application

```bash
NODE_ENV=development|production|test
PORT=3000                    # Next.js application port
API_GATEWAY_PORT=3001        # API Gateway port
```

### Database

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/opportunex
```

**Format**: `postgresql://[user]:[password]@[host]:[port]/[database]`

### JWT Authentication

```bash
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h           # Access token expiration
JWT_REFRESH_EXPIRES_IN=30d   # Refresh token expiration
```

**Security**: Use a strong, random secret (minimum 32 characters). Generate with:

```bash
openssl rand -base64 32
```

## Optional Variables

### Redis (Caching & Sessions)

```bash
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=              # Leave empty if no password
```

### Elasticsearch (Search)

```bash
ELASTICSEARCH_NODE=http://localhost:9200
ELASTICSEARCH_USERNAME=      # Optional
ELASTICSEARCH_PASSWORD=      # Optional
```

### API Configuration

```bash
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes in milliseconds
RATE_LIMIT_MAX_REQUESTS=100  # Max requests per window
```

### OpenAI (AI Features)

```bash
OPENAI_API_KEY=sk-...
```

Get your API key from: https://platform.openai.com/api-keys

### Email (SendGrid)

```bash
SENDGRID_API_KEY=SG...
SENDGRID_FROM_EMAIL=noreply@opportunex.com
SENDGRID_FROM_NAME=OpportuneX
```

Get your API key from: https://app.sendgrid.com/settings/api_keys

### SMS (Twilio)

```bash
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+1234567890
```

Get credentials from: https://console.twilio.com/

### Speech-to-Text

**Google Cloud:**

```bash
GOOGLE_CLOUD_PROJECT_ID=your-project-id
GOOGLE_CLOUD_CREDENTIALS=/path/to/credentials.json
```

**Azure:**

```bash
AZURE_SPEECH_KEY=your-key
AZURE_SPEECH_REGION=eastus
```

### External APIs

```bash
MLH_API_KEY=your-mlh-api-key
DEVFOLIO_API_KEY=your-devfolio-api-key
INTERNSHALA_API_KEY=your-internshala-api-key
```

### Monitoring & Logging

```bash
SENTRY_DSN=https://...@sentry.io/...
LOG_LEVEL=debug|info|warn|error
```

## Third-Party API Configuration

### API Key Security

```bash
API_KEY_SALT=your-random-salt-for-api-key-hashing
WEBHOOK_SECRET_SALT=your-random-salt-for-webhook-secrets
OAUTH_CLIENT_SECRET_SALT=your-random-salt-for-oauth-secrets
```

**Generate salts:**

```bash
openssl rand -hex 32
```

### Rate Limiting

```bash
DEFAULT_API_RATE_LIMIT=1000          # Requests per window
DEFAULT_API_RATE_LIMIT_WINDOW=3600   # Window in seconds (1 hour)
```

### OAuth Configuration

```bash
OAUTH_AUTHORIZATION_CODE_EXPIRES_IN=600    # 10 minutes
OAUTH_ACCESS_TOKEN_EXPIRES_IN=3600         # 1 hour
OAUTH_REFRESH_TOKEN_EXPIRES_IN=2592000     # 30 days
```

### Webhook Configuration

```bash
WEBHOOK_DEFAULT_TIMEOUT_MS=5000      # Request timeout
WEBHOOK_DEFAULT_RETRY_COUNT=3        # Number of retries
WEBHOOK_MAX_RETRY_COUNT=10           # Maximum allowed retries
```

## Feature Flags

Enable or disable features:

```bash
ENABLE_VOICE_SEARCH=true
ENABLE_AI_INSTRUCTOR=true
ENABLE_SOCIAL_FEATURES=true
ENABLE_ANALYTICS=true
ENABLE_WEBHOOKS=true
```

## CDN & Storage

```bash
CDN_URL=https://cdn.opportunex.com
STORAGE_BUCKET=opportunex-storage
```

## Analytics

```bash
ANALYTICS_RETENTION_DAYS=90          # How long to keep analytics data
ANALYTICS_EXPORT_MAX_ROWS=100000     # Max rows in export
```

## Environment-Specific Configurations

### Development

```bash
NODE_ENV=development
PORT=3000
API_GATEWAY_PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opportunex_dev
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_NODE=http://localhost:9200
LOG_LEVEL=debug
```

### Production

```bash
NODE_ENV=production
PORT=3000
API_GATEWAY_PORT=3001
DATABASE_URL=postgresql://user:password@prod-db.example.com:5432/opportunex
REDIS_URL=redis://prod-redis.example.com:6379
REDIS_PASSWORD=strong-redis-password
ELASTICSEARCH_NODE=https://prod-es.example.com:9200
ELASTICSEARCH_USERNAME=elastic
ELASTICSEARCH_PASSWORD=strong-es-password
LOG_LEVEL=info
SENTRY_DSN=https://...@sentry.io/...
```

### Testing

```bash
NODE_ENV=test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/opportunex_test
REDIS_URL=redis://localhost:6379
LOG_LEVEL=error
```

## Security Best Practices

1. **Never commit `.env` files to version control**
   - Add `.env*` to `.gitignore`
   - Use `.env.example` as a template

2. **Use strong, random secrets**

   ```bash
   # Generate secure random strings
   openssl rand -base64 32
   openssl rand -hex 32
   ```

3. **Rotate secrets regularly**
   - JWT secrets every 90 days
   - API keys every 6 months
   - Database passwords annually

4. **Use different secrets per environment**
   - Development, staging, and production should have unique secrets

5. **Restrict access to production secrets**
   - Use secret management tools (AWS Secrets Manager, HashiCorp Vault)
   - Limit who can view production environment variables

6. **Validate environment variables on startup**

   ```typescript
   const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'REDIS_URL'];

   requiredEnvVars.forEach(varName => {
     if (!process.env[varName]) {
       throw new Error(`Missing required environment variable: ${varName}`);
     }
   });
   ```

## Loading Environment Variables

### Local Development

1. Copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Update values in `.env` with your local configuration

3. Start the application:
   ```bash
   npm run dev
   ```

### Docker

Use `.env` file with Docker Compose:

```yaml
# docker-compose.yml
services:
  app:
    env_file:
      - .env
```

Or pass variables directly:

```yaml
services:
  app:
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
```

### Kubernetes

Use ConfigMaps and Secrets:

```yaml
# configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: opportunex-config
data:
  NODE_ENV: production
  PORT: '3000'
```

```yaml
# secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: opportunex-secrets
type: Opaque
stringData:
  DATABASE_URL: postgresql://...
  JWT_SECRET: ...
```

### Cloud Platforms

**Vercel:**

```bash
vercel env add DATABASE_URL production
```

**Heroku:**

```bash
heroku config:set DATABASE_URL=postgresql://...
```

**AWS:**
Use AWS Systems Manager Parameter Store or Secrets Manager

**Google Cloud:**
Use Secret Manager

## Troubleshooting

### Variable Not Loading

1. Check file name is exactly `.env`
2. Ensure no spaces around `=`
3. Restart the application after changes
4. Check for syntax errors in `.env` file

### Database Connection Issues

```bash
# Test connection
psql $DATABASE_URL

# Check format
DATABASE_URL=postgresql://user:password@host:port/database
```

### Redis Connection Issues

```bash
# Test connection
redis-cli -u $REDIS_URL ping

# Should return: PONG
```

### JWT Issues

- Ensure `JWT_SECRET` is at least 32 characters
- Check expiration format: `1h`, `24h`, `7d`, `30d`
- Verify secret matches across all instances

## Health Check Script

Create a script to validate environment variables:

```bash
#!/bin/bash
# scripts/check-env.sh

echo "Checking environment variables..."

# Required variables
REQUIRED_VARS=(
  "DATABASE_URL"
  "JWT_SECRET"
  "REDIS_URL"
)

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    MISSING_VARS+=("$var")
  fi
done

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
  echo "✅ All required environment variables are set"
  exit 0
else
  echo "❌ Missing required environment variables:"
  printf '  - %s\n' "${MISSING_VARS[@]}"
  exit 1
fi
```

Run before deployment:

```bash
chmod +x scripts/check-env.sh
./scripts/check-env.sh
```

## References

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [Node.js dotenv](https://github.com/motdotla/dotenv)
- [12-Factor App Config](https://12factor.net/config)
