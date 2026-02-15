# OpportuneX API - Quick Start Guide

Get started with the OpportuneX API in 5 minutes.

## Step 1: Create an API Key

1. Log in to your OpportuneX account
2. Navigate to [Developer Portal](https://opportunex.com/developer)
3. Click "Create API Key"
4. Enter a name and select scopes:
   - `opportunities:read` - Search and read opportunities
   - `users:read` - Read user profile data
5. Save your API key securely (shown only once!)

## Step 2: Make Your First Request

### Using cURL

```bash
curl https://api.opportunex.com/v1/api/opportunities/search?q=hackathons \
  -H "Authorization: opx_your_api_key"
```

### Using JavaScript

```javascript
const response = await fetch(
  'https://api.opportunex.com/v1/api/opportunities/search?q=hackathons',
  {
    headers: {
      Authorization: 'opx_your_api_key',
    },
  }
);

const data = await response.json();
console.log(data);
```

### Using Python

```python
import requests

response = requests.get(
    'https://api.opportunex.com/v1/api/opportunities/search',
    params={'q': 'hackathons'},
    headers={'Authorization': 'opx_your_api_key'}
)

data = response.json()
print(data)
```

## Step 3: Install SDK (Optional)

### JavaScript/TypeScript

```bash
npm install @opportunex/sdk
```

```typescript
import { OpportuneXClient } from '@opportunex/sdk';

const client = new OpportuneXClient({
  apiKey: 'opx_your_api_key',
});

const opportunities = await client.opportunities.search({
  q: 'machine learning hackathons',
  type: 'hackathon',
});
```

### Python

```bash
pip install opportunex-sdk
```

```python
from opportunex import OpportuneXClient

client = OpportuneXClient(api_key='opx_your_api_key')

opportunities = client.opportunities.search(
    q='machine learning hackathons',
    type='hackathon'
)
```

## Step 4: Set Up Webhooks (Optional)

Receive real-time notifications when opportunities are created or updated.

```bash
curl -X POST https://api.opportunex.com/v1/developer/webhooks \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKeyId": "your-api-key-id",
    "url": "https://your-domain.com/webhooks/opportunex",
    "events": ["opportunity.created", "opportunity.updated"]
  }'
```

### Verify Webhook Signatures

```javascript
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

app.post('/webhooks/opportunex', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);

  if (!verifyWebhook(payload, signature, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  console.log('Event:', req.body.event);
  console.log('Data:', req.body.data);

  res.status(200).send('OK');
});
```

## Common Use Cases

### Search Opportunities

```bash
# Search by query
curl "https://api.opportunex.com/v1/api/opportunities/search?q=AI+hackathons" \
  -H "Authorization: opx_your_api_key"

# Filter by type
curl "https://api.opportunex.com/v1/api/opportunities/search?q=internships&type=internship" \
  -H "Authorization: opx_your_api_key"

# Filter by mode
curl "https://api.opportunex.com/v1/api/opportunities/search?q=workshops&mode=online" \
  -H "Authorization: opx_your_api_key"
```

### Get Opportunity Details

```bash
curl "https://api.opportunex.com/v1/api/opportunities/{opportunity_id}" \
  -H "Authorization: opx_your_api_key"
```

### Pagination

```bash
curl "https://api.opportunex.com/v1/api/opportunities/search?q=hackathons&page=2&limit=20" \
  -H "Authorization: opx_your_api_key"
```

## Rate Limits

Monitor your rate limit usage in response headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 2024-01-15T12:00:00Z
```

Default limits:

- Free: 1,000 requests/hour
- Pro: 10,000 requests/hour
- Enterprise: Custom

## Error Handling

```javascript
try {
  const response = await fetch(url, { headers });

  if (!response.ok) {
    if (response.status === 429) {
      // Rate limit exceeded
      const retryAfter = response.headers.get('X-RateLimit-Reset');
      console.log(`Rate limited. Retry after: ${retryAfter}`);
    } else if (response.status === 401) {
      // Invalid API key
      console.error('Authentication failed');
    } else {
      console.error(`API error: ${response.status}`);
    }
  }

  const data = await response.json();
  return data;
} catch (error) {
  console.error('Request failed:', error);
}
```

## Best Practices

1. **Store API keys securely** - Use environment variables, never commit to git
2. **Implement retry logic** - Use exponential backoff for failed requests
3. **Cache responses** - Reduce API calls for data that doesn't change frequently
4. **Use webhooks** - Instead of polling for updates
5. **Monitor rate limits** - Track usage to avoid hitting limits
6. **Handle errors gracefully** - Implement proper error handling

## Next Steps

- [Full API Documentation](./THIRD_PARTY_API.md)
- [OpenAPI Specification](./api/third-party-api.yaml)
- [Developer Portal](https://opportunex.com/developer)
- [Example Projects](https://github.com/opportunex/examples)
- [API Status](https://status.opportunex.com)

## Support

- Email: api@opportunex.com
- Discord: https://discord.gg/opportunex
- GitHub Issues: https://github.com/opportunex/sdk/issues

## Example Response

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
      "organizerType": "corporate",
      "requiredSkills": ["Python", "TensorFlow", "Machine Learning"],
      "mode": "hybrid",
      "location": "Bangalore, India",
      "prizes": ["₹1,00,000", "₹50,000", "₹25,000"],
      "applicationDeadline": "2024-02-01T23:59:59Z",
      "startDate": "2024-02-15T09:00:00Z",
      "endDate": "2024-02-17T18:00:00Z",
      "externalUrl": "https://techcorp.com/hackathon",
      "tags": ["ai", "machine-learning", "innovation"],
      "createdAt": "2024-01-01T00:00:00Z"
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
