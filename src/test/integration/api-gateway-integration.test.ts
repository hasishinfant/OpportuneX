import request from 'supertest';
import type { ApiGatewayConfig } from '../../lib/api-gateway';
import { ApiGateway } from '../../lib/api-gateway';
import { generateToken } from '../../lib/middleware/auth';

describe('API Gateway Integration Tests', () => {
  let apiGateway: ApiGateway;
  let app: any;
  let authToken: string;

  const testConfig: ApiGatewayConfig = {
    port: 0,
    corsOrigins: ['http://localhost:3000'],
    rateLimitWindowMs: 60000,
    rateLimitMaxRequests: 1000, // Higher limit for integration tests
    enableLogging: false,
    enableCompression: true,
    apiVersion: 'v1',
  };

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-integration-testing';

    apiGateway = new ApiGateway(testConfig);
    app = apiGateway.getApp();

    authToken = generateToken({
      id: 'integration-test-user',
      email: 'integration@test.com',
      role: 'user',
    });
  });

  describe('Complete User Workflow', () => {
    it('should handle complete search workflow', async () => {
      // 1. Search for opportunities
      const searchResponse = await request(app)
        .post('/api/v1/search/opportunities')
        .send({
          query: 'machine learning hackathon',
          filters: {
            type: 'hackathon',
            mode: 'online',
          },
          pagination: { page: 1, limit: 10 },
        })
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data.opportunities).toBeDefined();

      // 2. Get search suggestions
      const suggestionsResponse = await request(app)
        .get('/api/v1/search/suggestions?q=machine&limit=5')
        .expect(200);

      expect(suggestionsResponse.body.success).toBe(true);
      expect(suggestionsResponse.body.data).toBeInstanceOf(Array);

      // 3. Get popular searches
      const popularResponse = await request(app)
        .get('/api/v1/search/popular')
        .expect(200);

      expect(popularResponse.body.success).toBe(true);
      expect(popularResponse.body.data).toBeInstanceOf(Array);
    });

    it('should handle authenticated user workflow', async () => {
      // 1. Get user profile
      const profileResponse = await request(app)
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(profileResponse.body.success).toBe(true);
      expect(profileResponse.body.data.id).toBe('integration-test-user');

      // 2. Update user profile
      const updateResponse = await request(app)
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Test User',
          location: {
            city: 'Bangalore',
            state: 'Karnataka',
            tier: 2,
          },
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);

      // 3. Get search history
      const historyResponse = await request(app)
        .get('/api/v1/users/search-history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(historyResponse.body.success).toBe(true);
      expect(historyResponse.body.data).toBeInstanceOf(Array);

      // 4. Get favorites
      const favoritesResponse = await request(app)
        .get('/api/v1/users/favorites')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(favoritesResponse.body.success).toBe(true);
      expect(favoritesResponse.body.data).toBeInstanceOf(Array);
    });

    it('should handle AI instructor workflow', async () => {
      // 1. Generate roadmap
      const roadmapResponse = await request(app)
        .post('/api/v1/ai/roadmap')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          opportunityId: '123e4567-e89b-12d3-a456-426614174000',
          targetDate: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        })
        .expect(200);

      expect(roadmapResponse.body.success).toBe(true);
      expect(roadmapResponse.body.data.roadmap).toBeDefined();
      expect(roadmapResponse.body.data.roadmap.phases).toBeInstanceOf(Array);

      // 2. Get AI recommendations
      const recommendationsResponse = await request(app)
        .get('/api/v1/ai/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(recommendationsResponse.body.success).toBe(true);
      expect(recommendationsResponse.body.data).toBeInstanceOf(Array);

      // 3. Chat with AI
      const chatResponse = await request(app)
        .post('/api/v1/ai/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          message: 'How can I prepare for a machine learning hackathon?',
        })
        .expect(200);

      expect(chatResponse.body.success).toBe(true);
      expect(chatResponse.body.data.response).toBeDefined();
    });

    it('should handle voice processing workflow', async () => {
      // 1. Get voice configuration
      const configResponse = await request(app)
        .get('/api/v1/voice/config')
        .expect(200);

      expect(configResponse.body.success).toBe(true);
      expect(configResponse.body.data.maxAudioDuration).toBeDefined();

      // 2. Get supported languages
      const languagesResponse = await request(app)
        .get('/api/v1/voice/languages')
        .expect(200);

      expect(languagesResponse.body.success).toBe(true);
      expect(languagesResponse.body.data).toBeInstanceOf(Array);

      // 3. Test voice processing
      const voiceTestResponse = await request(app)
        .post('/api/v1/voice/test')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          text: 'Find AI hackathons in Mumbai',
          language: 'en',
        })
        .expect(200);

      expect(voiceTestResponse.body.success).toBe(true);
      expect(voiceTestResponse.body.data.transcription).toBe(
        'Find AI hackathons in Mumbai'
      );
    });

    it('should handle notification workflow', async () => {
      // 1. Get notifications
      const notificationsResponse = await request(app)
        .get('/api/v1/notifications?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(notificationsResponse.body.success).toBe(true);
      expect(notificationsResponse.body.data.data).toBeInstanceOf(Array);
      expect(notificationsResponse.body.data.pagination).toBeDefined();

      // 2. Get notification preferences
      const preferencesResponse = await request(app)
        .get('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(preferencesResponse.body.success).toBe(true);
      expect(preferencesResponse.body.data.email).toBeDefined();

      // 3. Update notification preferences
      const updatePreferencesResponse = await request(app)
        .put('/api/v1/notifications/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          email: true,
          sms: false,
          frequency: 'daily',
        })
        .expect(200);

      expect(updatePreferencesResponse.body.success).toBe(true);

      // 4. Get notification statistics
      const statsResponse = await request(app)
        .get('/api/v1/notifications/stats')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data.total).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle cascading validation errors', async () => {
      const response = await request(app)
        .post('/api/v1/search/opportunities')
        .send({
          query: '', // Invalid
          filters: {
            type: 'invalid-type', // Invalid
            mode: 'invalid-mode', // Invalid
          },
          pagination: {
            page: 0, // Invalid
            limit: 101, // Invalid
          },
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.details).toBeInstanceOf(Array);
      expect(response.body.details.length).toBeGreaterThan(1);
    });

    it('should handle authentication errors across different endpoints', async () => {
      const endpoints = [
        '/api/v1/users/profile',
        '/api/v1/ai/roadmap',
        '/api/v1/voice/search',
        '/api/v1/notifications',
      ];

      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint).expect(401);

        expect(response.body.success).toBe(false);
        expect(response.body.error).toContain(
          'Authorization header is required'
        );
      }
    });
  });

  describe('Performance Integration', () => {
    it('should handle concurrent requests efficiently', async () => {
      const startTime = Date.now();

      const promises = Array.from({ length: 50 }, () =>
        request(app).get('/api/v1/health')
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should complete within reasonable time (adjust based on your requirements)
      expect(totalTime).toBeLessThan(5000); // 5 seconds
    }, 10000);

    it('should maintain response time under load', async () => {
      const responseTimes: number[] = [];

      for (let i = 0; i < 20; i++) {
        const startTime = Date.now();

        await request(app)
          .post('/api/v1/search/opportunities')
          .send({
            query: `test query ${i}`,
            pagination: { page: 1, limit: 10 },
          })
          .expect(200);

        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);
      }

      const averageResponseTime =
        responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      // Response times should be reasonable
      expect(averageResponseTime).toBeLessThan(100); // 100ms average
      expect(maxResponseTime).toBeLessThan(500); // 500ms max
    });
  });
});
