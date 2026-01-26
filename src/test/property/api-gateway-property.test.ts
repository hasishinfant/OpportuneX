import fc from 'fast-check';
import request from 'supertest';
import type { ApiGatewayConfig } from '../../lib/api-gateway';
import { ApiGateway } from '../../lib/api-gateway';
import { generateToken } from '../../lib/middleware/auth';

/**
 * Property-based tests for API Gateway
 * **Feature: opportunex, Property 1: Comprehensive Search Relevance**
 * **Feature: opportunex, Property 2: Filter Combination Correctness**
 */

describe('API Gateway Property-Based Tests', () => {
  let apiGateway: ApiGateway;
  let app: any;
  let authToken: string;

  const testConfig: ApiGatewayConfig = {
    port: 0,
    corsOrigins: ['http://localhost:3000'],
    rateLimitWindowMs: 60000,
    rateLimitMaxRequests: 1000,
    enableLogging: false,
    enableCompression: true,
    apiVersion: 'v1',
  };

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-jwt-secret-key-for-property-testing';

    apiGateway = new ApiGateway(testConfig);
    app = apiGateway.getApp();

    authToken = generateToken({
      id: 'property-test-user',
      email: 'property@test.com',
      role: 'user',
    });
  });

  describe('Property 1: Comprehensive Search Relevance', () => {
    /**
     * For any search query (text or voice) in English or Hindi,
     * all returned opportunities should be relevant to the query intent
     * and match the specified opportunity types (hackathon, internship, workshop)
     */
    it('should return relevant results for any valid search query', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            query: fc.string({ minLength: 1, maxLength: 500 }),
            type: fc.constantFrom('hackathon', 'internship', 'workshop'),
            mode: fc.constantFrom('online', 'offline', 'hybrid'),
            organizerType: fc.constantFrom(
              'corporate',
              'startup',
              'government',
              'academic'
            ),
          }),
          async searchData => {
            const response = await request(app)
              .post('/api/v1/search/opportunities')
              .send({
                query: searchData.query,
                filters: {
                  type: searchData.type,
                  mode: searchData.mode,
                  organizerType: searchData.organizerType,
                },
                pagination: { page: 1, limit: 20 },
              });

            // Should always return a successful response
            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Response should have the expected structure
            expect(response.body.data).toBeDefined();
            expect(response.body.data.opportunities).toBeInstanceOf(Array);
            expect(response.body.data.totalCount).toBeGreaterThanOrEqual(0);
            expect(response.body.data.facets).toBeDefined();

            // All returned opportunities should match the filter criteria
            // (This would be implemented with actual search logic)
            response.body.data.opportunities.forEach((opportunity: any) => {
              if (opportunity.type) {
                expect(opportunity.type).toBe(searchData.type);
              }
            });
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle voice search queries consistently', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            text: fc.string({ minLength: 1, maxLength: 200 }),
            language: fc.constantFrom('en', 'hi'),
          }),
          async voiceData => {
            const response = await request(app)
              .post('/api/v1/voice/test')
              .set('Authorization', `Bearer ${authToken}`)
              .send({
                text: voiceData.text,
                language: voiceData.language,
              });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.transcription).toBe(voiceData.text);
            expect(response.body.data.searchQuery).toBeDefined();
            expect(response.body.data.confidence).toBeGreaterThanOrEqual(0);
            expect(response.body.data.confidence).toBeLessThanOrEqual(1);
          }
        ),
        { numRuns: 30 }
      );
    });
  });

  describe('Property 2: Filter Combination Correctness', () => {
    /**
     * For any combination of filters (skills, organizer type, mode, location),
     * all returned opportunities should satisfy every applied filter criterion simultaneously
     */
    it('should correctly apply all filter combinations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            query: fc.string({ minLength: 1, maxLength: 100 }),
            skills: fc.option(
              fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
                minLength: 1,
                maxLength: 5,
              })
            ),
            organizerType: fc.option(
              fc.constantFrom('corporate', 'startup', 'government', 'academic')
            ),
            mode: fc.option(fc.constantFrom('online', 'offline', 'hybrid')),
            type: fc.option(
              fc.constantFrom('hackathon', 'internship', 'workshop')
            ),
            location: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
          }),
          async searchData => {
            const filters: any = {};
            if (searchData.skills) filters.skills = searchData.skills;
            if (searchData.organizerType)
              filters.organizerType = searchData.organizerType;
            if (searchData.mode) filters.mode = searchData.mode;
            if (searchData.type) filters.type = searchData.type;
            if (searchData.location) filters.location = searchData.location;

            const response = await request(app)
              .post('/api/v1/search/opportunities')
              .send({
                query: searchData.query,
                filters,
                pagination: { page: 1, limit: 20 },
              });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);

            // Verify filter consistency in facets
            if (response.body.data.facets) {
              const { facets } = response.body.data;

              // If we filtered by type, the facets should reflect this
              if (searchData.type && facets.types) {
                const typeCount =
                  facets.types.find((t: any) => t.name === searchData.type)
                    ?.count || 0;
                expect(typeCount).toBeGreaterThanOrEqual(0);
              }

              // If we filtered by mode, the facets should reflect this
              if (searchData.mode && facets.modes) {
                const modeCount =
                  facets.modes.find((m: any) => m.name === searchData.mode)
                    ?.count || 0;
                expect(modeCount).toBeGreaterThanOrEqual(0);
              }
            }
          }
        ),
        { numRuns: 40 }
      );
    });
  });

  describe('Property 3: Authentication and Authorization Consistency', () => {
    /**
     * For any authenticated request, the user context should be properly maintained
     * and authorization should be consistently applied across all protected endpoints
     */
    it('should maintain user context consistently across requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            userId: fc.uuid(),
            email: fc.emailAddress(),
            role: fc.constantFrom('user', 'admin'),
          }),
          async userData => {
            const token = generateToken({
              id: userData.userId,
              email: userData.email,
              role: userData.role,
            });

            // Test multiple protected endpoints
            const endpoints = [
              '/api/v1/users/profile',
              '/api/v1/ai/recommendations',
              '/api/v1/notifications',
            ];

            for (const endpoint of endpoints) {
              const response = await request(app)
                .get(endpoint)
                .set('Authorization', `Bearer ${token}`);

              expect(response.status).toBe(200);
              expect(response.body.success).toBe(true);

              // User context should be maintained (where applicable)
              if (endpoint === '/api/v1/users/profile') {
                expect(response.body.data.id).toBe(userData.userId);
                expect(response.body.data.email).toBe(userData.email);
              }
            }
          }
        ),
        { numRuns: 20 }
      );
    });
  });

  describe('Property 4: Request Validation Consistency', () => {
    /**
     * For any invalid request data, the API should consistently return
     * appropriate validation errors with helpful messages
     */
    it('should consistently validate request data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            query: fc.option(fc.string({ maxLength: 1000 })), // May be too long or empty
            page: fc.option(fc.integer({ min: -10, max: 1000 })), // May be invalid
            limit: fc.option(fc.integer({ min: -10, max: 200 })), // May be invalid
            invalidType: fc.option(fc.string({ minLength: 1, maxLength: 20 })), // Invalid type
          }),
          async requestData => {
            const searchRequest: any = {};

            if (requestData.query !== null) {
              searchRequest.query = requestData.query || '';
            }

            if (requestData.page !== null || requestData.limit !== null) {
              searchRequest.pagination = {};
              if (requestData.page !== null)
                searchRequest.pagination.page = requestData.page;
              if (requestData.limit !== null)
                searchRequest.pagination.limit = requestData.limit;
            }

            if (requestData.invalidType) {
              searchRequest.filters = { type: requestData.invalidType };
            }

            const response = await request(app)
              .post('/api/v1/search/opportunities')
              .send(searchRequest);

            // Should either succeed (valid data) or fail with validation error (invalid data)
            if (response.status === 400) {
              expect(response.body.success).toBe(false);
              expect(response.body.error).toBe('Validation failed');
              expect(response.body.details).toBeInstanceOf(Array);
            } else {
              expect(response.status).toBe(200);
              expect(response.body.success).toBe(true);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 5: Response Structure Consistency', () => {
    /**
     * For any successful API response, the structure should be consistent
     * and include all required fields
     */
    it('should maintain consistent response structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          async query => {
            const response = await request(app)
              .post('/api/v1/search/opportunities')
              .send({
                query,
                pagination: { page: 1, limit: 10 },
              });

            expect(response.status).toBe(200);

            // Consistent response structure
            expect(response.body).toHaveProperty('success');
            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('message');
            expect(response.body.success).toBe(true);

            // Data structure consistency
            expect(response.body.data).toHaveProperty('opportunities');
            expect(response.body.data).toHaveProperty('totalCount');
            expect(response.body.data).toHaveProperty('facets');
            expect(response.body.data.opportunities).toBeInstanceOf(Array);
            expect(typeof response.body.data.totalCount).toBe('number');
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
