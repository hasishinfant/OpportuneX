# OpportuneX Third-Party API Documentation

Complete guide for integrating with the OpportuneX platform using our REST API.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [Rate Limiting](#rate-limiting)
4. [Webhooks](#webhooks)
5. [SDKs](#sdks)
6. [API Reference](#api-reference)
7. [Best Practices](#best-practices)

## Getting Started

### Prerequisites

- OpportuneX account
- Developer access enabled
- Basic understanding of REST APIs

### Quick Start

1. **Create an API Key**

   ```bash
   curl -X POST https://api.opportunex.com/v1/developer/api-keys \
     -H "Authorization: Bearer YOUR_USER_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "My First API Key",
       "scopes": ["opportunities:read", "users:read"]
     }'
   ```

2. **Make Your First Request**
   ```bash
   curl https://api.opportunex.com/v1/api/opportunities/search?q=hackathons \
     -H "Authorization: opx_your_api_key"
   ```

## Authentication

OpportuneX API supports two authentication methods:

### 1. API Keys (Recommended for Server-to-Server)

API keys are simple and secure for backend integrations.

**Creating an API Key:**

- Log in to your OpportuneX account
- Navigate to Developer Settings
- Click "Create API Key"
- Select appropriate scopes
- Save the key securely (shown only once)

**Using API Keys:**

```bash
# Direct API key
curl -H "Authorization: opx_your_api_key" https://api.opportunex.com/v1/api/opportunities/search?q=ml

# With Bearer prefix
curl -H "Authorization: Bearer opx_your_api_key" https://api.opportunex.com/v1/api/opportunities/search?q=ml
```

**Available Scopes:**

- `opportunities:read` - Read opportunity data
- `opportunities:write` - Create and update opportunities
- `users:read` - Read user profile data
- `users:write` - Update user profile
- `developer:read` - Read API keys and webhooks
- `developer:write` - Manage API keys and webhooks

### 2. OAuth 2.0 (For User-Facing Applications)

OAuth 2.0 allows your application to act on behalf of users.

**Authorization Code Flow:**

1. **Redirect user to authorization URL:**

   ```
   https://api.opportunex.com/oauth/authorize?
     response_type=code&
     client_id=YOUR_CLIENT_ID&
     redirect_uri=YOUR_REDIRECT_URI&
     scope=opportunities:read users:read&
     state=random_state_string
   ```

2. **Exchange authorization code for tokens:**

   ```bash
   curl -X POST https://api.opportunex.com/oauth/token \
     -H "Content-Type: application/json" \
     -d '{
       "grant_type": "authorization_code",
       "code": "AUTHORIZATION_CODE",
       "client_id": "YOUR_CLIENT_ID",
       "client_secret": "YOUR_CLIENT_SECRET",
       "redirect_uri": "YOUR_REDIRECT_URI"
     }'
   ```

3. **Use access token:**

   ```bash
   curl -H "Authorization: Bearer ACCESS_TOKEN" \
     https://api.opportunex.com/v1/api/opportunities/search?q=internships
   ```

4. **Refresh token when expired:**
   ```bash
   curl -X POST https://api.opportunex.com/oauth/token \
     -H "Content-Type: application/json" \
     -d '{
       "grant_type": "refresh_token",
       "refresh_token": "REFRESH_TOKEN",
       "client_id": "YOUR_CLIENT_ID",
       "client_secret": "YOUR_CLIENT_SECRET"
     }'
   ```

## Rate Limiting

All API requests are rate limited to ensure fair usage and platform stability.

### Rate Limit Headers

Every API response includes rate limit information:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 2024-01-15T12:00:00Z
```

### Default Limits

- **Free Tier**: 1,000 requests per hour
- **Pro Tier**: 10,000 requests per hour
- **Enterprise**: Custom limits

### Handling Rate Limits

When you exceed the rate limit, you'll receive a `429 Too Many Requests` response:

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": "2024-01-15T12:00:00Z"
}
```

**Best Practices:**

- Monitor rate limit headers
- Implement exponential backoff
- Cache responses when possible
- Use webhooks instead of polling

## Webhooks

Webhooks allow you to receive real-time notifications about events in the OpportuneX platform.

### Creating a Webhook

```bash
curl -X POST https://api.opportunex.com/v1/developer/webhooks \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKeyId": "your-api-key-id",
    "url": "https://your-domain.com/webhooks/opportunex",
    "events": ["opportunity.created", "opportunity.updated"],
    "retryCount": 3,
    "timeoutMs": 5000
  }'
```

### Available Events

- `opportunity.created` - New opportunity added
- `opportunity.updated` - Opportunity details changed
- `opportunity.deadline_approaching` - Deadline within 24 hours
- `user.profile_updated` - User profile changed
- `roadmap.completed` - User completed a roadmap

### Webhook Payload

```json
{
  "event": "opportunity.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "AI Hackathon 2024",
    "type": "hackathon",
    "organizerName": "TechCorp",
    "applicationDeadline": "2024-02-01T23:59:59Z"
  }
}
```

### Verifying Webhook Signatures

All webhook deliveries include an HMAC-SHA256 signature in the `X-Webhook-Signature` header.

**Node.js Example:**

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Express middleware
app.post('/webhooks/opportunex', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);

  if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook
  console.log('Event:', req.body.event);
  res.status(200).send('OK');
});
```

**Python Example:**

```python
import hmac
import hashlib

def verify_webhook_signature(payload: str, signature: str, secret: str) -> bool:
    expected_signature = hmac.new(
        secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected_signature)

# Flask example
@app.route('/webhooks/opportunex', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.get_data(as_text=True)

    if not verify_webhook_signature(payload, signature, WEBHOOK_SECRET):
        return 'Invalid signature', 401

    # Process webhook
    data = request.json
    print(f"Event: {data['event']}")
    return 'OK', 200
```

### Testing Webhooks

Test your webhook endpoint:

```bash
curl -X POST https://api.opportunex.com/v1/developer/webhooks/{webhook_id}/test \
  -H "Authorization: Bearer YOUR_USER_TOKEN"
```

## SDKs

Official SDKs are available for popular programming languages.

### JavaScript/TypeScript

```bash
npm install @opportunex/sdk
```

```typescript
import { OpportuneXClient } from '@opportunex/sdk';

const client = new OpportuneXClient({
  apiKey: 'opx_your_api_key',
});

// Search opportunities
const opportunities = await client.opportunities.search({
  q: 'machine learning hackathons',
  type: 'hackathon',
  page: 1,
  limit: 20,
});

console.log(opportunities.data);
```

### Python

```bash
pip install opportunex-sdk
```

```python
from opportunex import OpportuneXClient

client = OpportuneXClient(api_key='opx_your_api_key')

# Search opportunities
opportunities = client.opportunities.search(
    q='machine learning hackathons',
    type='hackathon',
    page=1,
    limit=20
)

print(opportunities.data)
```

### Go

```bash
go get github.com/opportunex/sdk-go
```

```go
package main

import (
    "fmt"
    "github.com/opportunex/sdk-go"
)

func main() {
    client := opportunex.NewClient("opx_your_api_key")

    opportunities, err := client.Opportunities.Search(&opportunex.SearchParams{
        Query: "machine learning hackathons",
        Type:  "hackathon",
        Page:  1,
        Limit: 20,
    })

    if err != nil {
        panic(err)
    }

    fmt.Println(opportunities.Data)
}
```

## API Reference

### Search Opportunities

```
GET /api/opportunities/search
```

**Parameters:**

- `q` (required) - Search query
- `type` (optional) - Filter by type: `hackathon`, `internship`, `workshop`
- `mode` (optional) - Filter by mode: `online`, `offline`, `hybrid`
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Results per page (default: 20, max: 100)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "title": "AI Hackathon 2024",
      "description": "Build innovative AI solutions",
      "type": "hackathon",
      "organizerName": "TechCorp",
      "mode": "hybrid",
      "location": "Bangalore, India",
      "applicationDeadline": "2024-02-01T23:59:59Z",
      "startDate": "2024-02-15T09:00:00Z",
      "tags": ["ai", "machine-learning", "innovation"]
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### Get Opportunity Details

```
GET /api/opportunities/{opportunityId}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "123e4567-e89b-12d3-a456-426614174000",
    "title": "AI Hackathon 2024",
    "description": "Build innovative AI solutions...",
    "type": "hackathon",
    "organizerName": "TechCorp",
    "organizerType": "corporate",
    "requiredSkills": ["Python", "TensorFlow", "Machine Learning"],
    "mode": "hybrid",
    "location": "Bangalore, India",
    "prizes": ["₹1,00,000", "₹50,000", "₹25,000"],
    "applicationDeadline": "2024-02-01T23:59:59Z",
    "startDate": "2024-02-15T09:00:00Z",
    "endDate": "2024-02-17T18:00:00Z",
    "externalUrl": "https://techcorp.com/hackathon",
    "tags": ["ai", "machine-learning", "innovation"]
  }
}
```

## Best Practices

### 1. Security

- **Never expose API keys in client-side code**
- Store API keys in environment variables
- Rotate API keys regularly
- Use OAuth 2.0 for user-facing applications
- Verify webhook signatures

### 2. Performance

- **Cache responses** when data doesn't change frequently
- **Use pagination** for large result sets
- **Implement retry logic** with exponential backoff
- **Use webhooks** instead of polling for real-time updates

### 3. Error Handling

```javascript
try {
  const opportunities = await client.opportunities.search({ q: 'hackathons' });
} catch (error) {
  if (error.status === 429) {
    // Rate limit exceeded - wait and retry
    const retryAfter = error.headers['x-ratelimit-reset'];
    console.log(`Rate limited. Retry after: ${retryAfter}`);
  } else if (error.status === 401) {
    // Authentication failed - check API key
    console.error('Invalid API key');
  } else {
    // Other errors
    console.error('API error:', error.message);
  }
}
```

### 4. Monitoring

- Monitor rate limit headers
- Track API response times
- Set up alerts for webhook delivery failures
- Log all API interactions for debugging

## Support

- **Documentation**: https://docs.opportunex.com
- **API Status**: https://status.opportunex.com
- **Email**: api@opportunex.com
- **Discord**: https://discord.gg/opportunex

## Changelog

### v1.0.0 (2024-01-15)

- Initial release
- API key authentication
- OAuth 2.0 support
- Webhook system
- Rate limiting
- SDKs for JavaScript, Python, Go, Ruby, Java, PHP
