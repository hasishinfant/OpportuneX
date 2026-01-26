import request from 'supertest';
import type { ApiGatewayConfig } from '../lib/api-gateway';
import { ApiGateway } from '../lib/api-gateway';
import { generateToken } from '../lib/middleware/auth';

describe('API Gateway', () => {
  let apiGateway: ApiGateway;
  let app: any;

  const testConfig: ApiGatewayConfig = {
    port: 0, // Use random port for testing
    corsOrigins: ['http://localhost:3000'],
    rateLimitWindowMs: 60000,
    rateLimitMaxRequests: 100,
    enableLogging: false,
    enableCompression: true,
    apiVersion: 'v1',
  };

  beforeAll(() => {
    // Set required environment variables for testing
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';

    apiGateway = new ApiGateway(testConfig);
    app = apiGateway.getApp();
  });

  describe('Health Endpoints', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/v1/health').expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('healthy');
      expect(response.body.data.version).toBeDefined();
    });

    it('should return detailed health status', async () => {
      const response = await request(app)
        .get('/api/v1/health/detailed')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.services).toBeDefined();
      expect(response.body.data.memory).toBeDefined();
      expect(response.body.data.uptime).toBeDefined();
    });

    it('should return readiness status', async () => {
      const response = await request(app)
        .get('/api/v1/health/ready')
        .expect(200);

      expect(response.body.status).toBe('ready');
    });

    it('should return liveness status', async () => {
      const response = await request(app)
        .get('/api/v1/health/live')
        .expect(200);

      expect(response.body.status).toBe('alive');
    });
  });

  describe('API Documentation', () => {
    it('should return API documentation', async () => {
      const response = await request(app).get('/api/v1/docs').expect(200);

      expect(response.body.name).toBe('OpportuneX API Gateway');
      expect(response.body.version).toBe('v1');
      expect(response.body.endpoints).toBeDefined();
    });

    it('should return API root information', async () => {
      const response = await request(app).get('/api/v1').expect(200);

      expect(response.body.message).toBe('OpportuneX API Gateway');
      expect(response.body.version).toBe('v1');
      expect(response.body.status).toBe('operational');
    });
  });

  describe('Search Endpoints', () => {
    it('should handle search opportunities request', async () => {
      const searchRequest = {
        query: 'AI hackathon',
        filters: {
          type: 'hackathon',
          mode: 'online',
        },
        pagination: {
          page: 1,
          limit: 20,
        },
      };

      const response = await request(app)
        .post('/api/v1/search/opportunities')
        .send(searchRequest)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.opportunities).toBeDefined();
      expect(response.body.data.totalCount).toBeDefined();
      expect(response.body.data.facets).toBeDefined();
    });

    it('should validate search request', async () => {
      const invalidRequest = {
        query: '', // Empty query should fail validation
      };

      const response = await request(app)
        .post('/api/v1/search/opportunities')
        .send(invalidRequest)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return search suggestions', async () => {
      const response = await request(app)
        .get('/api/v1/search/suggestions?q=AI&limit=5')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeLessThanOrEqual(5);
    });

    it('should return popular searches', async () => {
      const response = await request(app)
        .get('/api/v1/search/popular')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Authentication', () => {
    const validToken = generateToken({
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'user',
    });

    it('should reject requests without authentication token', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Authorization header is required');
    });

    it('should accept requests with valid authentication token', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('test-user-id');
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid token');
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting', async () => {
      // Make requests up to the limit
      const promises = Array.from({ length: 105 }, () =>
        request(app).get('/api/v1/health')
      );

      const responses = await Promise.all(promises);

      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(res => res.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    }, 10000); // Increase timeout for this test
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent endpoints', async () => {
      const response = await request(app)
        .get('/api/v1/non-existent-endpoint')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Endpoint not found');
    });

    it('should handle validation errors', async () => {
      const response = await request(app)
        .post('/api/v1/search/opportunities')
        .send({ query: 'a'.repeat(501) }) // Exceeds max length
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.details).toBeDefined();
    });
  });

  describe('CORS', () => {
    it('should include CORS headers', async () => {
      const response = await request(app)
        .get('/api/v1/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200);

      expect(response.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000'
      );
    });

    it('should handle preflight requests', async () => {
      const response = await request(app)
        .options('/api/v1/search/opportunities')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .expect(204);

      expect(response.headers['access-control-allow-methods']).toContain(
        'POST'
      );
    });
  });

  describe('Security Headers', () => {
    it('should include security headers', async () => {
      const response = await request(app).get('/api/v1/health').expect(200);

      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('0');
    });
  });
});
