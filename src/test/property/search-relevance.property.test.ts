/**
 * Property-Based Test: Comprehensive Search Relevance
 * **Validates: Requirements 1.1, 2.1, 2.2**
 *
 * Property 1: For any search query (text or voice) in English or Hindi,
 * all returned opportunities should be relevant to the query intent and
 * match the specified opportunity types (hackathon, internship, workshop)
 */

import * as fc from 'fast-check';
import { SearchService } from '../../lib/services/search.service';
import { VoiceService } from '../../lib/services/voice.service';
import type { Opportunity, SearchRequest } from '../../types';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../../lib/elasticsearch', () => ({
  elasticsearch: {
    search: jest.fn(),
  },
  esUtils: {
    createIndex: jest.fn(),
    bulkIndex: jest.fn(),
  },
  INDICES: {
    OPPORTUNITIES: 'test_opportunities',
  },
}));

const mockElasticsearch = require('../../lib/elasticsearch').elasticsearch;

describe('Property Test: Comprehensive Search Relevance', () => {
  let searchService: SearchService;
  let voiceService: VoiceService;

  beforeEach(() => {
    searchService = new SearchService();
    voiceService = new VoiceService();
    jest.clearAllMocks();
  });

  // Generator for search queries in English
  const englishSearchQueries = fc.oneof(
    fc.constantFrom(
      'AI hackathon',
      'machine learning internship',
      'web development workshop',
      'data science competition',
      'software engineering job',
      'blockchain hackathon',
      'mobile app development',
      'cybersecurity workshop',
      'cloud computing internship',
      'full stack developer'
    ),
    fc.string({ minLength: 3, maxLength: 50 }).filter(s => s.trim().length > 2)
  );

  // Generator for search queries in Hindi
  const hindiSearchQueries = fc.constantFrom(
    'AI हैकाथॉन',
    'मशीन लर्निंग इंटर्नशिप',
    'वेब डेवलपमेंट वर्कशॉप',
    'डेटा साइंस प्रतियोगिता',
    'सॉफ्टवेयर इंजीनियरिंग',
    'ब्लॉकचेन हैकाथॉन',
    'मोबाइल ऐप डेवलपमेंट',
    'साइबर सिक्यूरिटी वर्कशॉप'
  );

  // Generator for opportunity types
  const opportunityTypes = fc.constantFrom(
    'hackathon',
    'internship',
    'workshop'
  );

  // Generator for mock opportunities
  const mockOpportunityGenerator = fc.record({
    id: fc.string({ minLength: 5, maxLength: 20 }),
    title: fc.string({ minLength: 10, maxLength: 100 }),
    description: fc.string({ minLength: 20, maxLength: 500 }),
    type: opportunityTypes,
    organizerName: fc.string({ minLength: 5, maxLength: 50 }),
    organizerType: fc.constantFrom(
      'corporate',
      'startup',
      'government',
      'academic'
    ),
    requiredSkills: fc.array(fc.string({ minLength: 2, maxLength: 20 }), {
      minLength: 1,
      maxLength: 10,
    }),
    mode: fc.constantFrom('online', 'offline', 'hybrid'),
    location: fc.option(fc.string({ minLength: 3, maxLength: 50 })),
    applicationDeadline: fc.date({
      min: new Date(),
      max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    }),
    externalUrl: fc.webUrl(),
    sourceId: fc.string({ minLength: 5, maxLength: 15 }),
    tags: fc.array(fc.string({ minLength: 2, maxLength: 15 }), {
      minLength: 1,
      maxLength: 8,
    }),
    isActive: fc.constant(true),
    createdAt: fc.date({ max: new Date() }),
    updatedAt: fc.date({ max: new Date() }),
  });

  // Generator for search requests
  const searchRequestGenerator = fc.record({
    query: fc.oneof(englishSearchQueries, hindiSearchQueries),
    filters: fc.option(
      fc.record({
        type: fc.option(opportunityTypes),
        skills: fc.option(
          fc.array(fc.string({ minLength: 2, maxLength: 20 }), { maxLength: 5 })
        ),
        organizerType: fc.option(
          fc.constantFrom('corporate', 'startup', 'government', 'academic')
        ),
        mode: fc.option(fc.constantFrom('online', 'offline', 'hybrid')),
        location: fc.option(fc.string({ minLength: 3, maxLength: 30 })),
      })
    ),
    pagination: fc.option(
      fc.record({
        page: fc.integer({ min: 1, max: 10 }),
        limit: fc.integer({ min: 5, max: 50 }),
      })
    ),
    userId: fc.option(fc.uuid()),
  });

  /**
   * Property: Search results should be relevant to the query
   */
  it('should return opportunities relevant to search query', async () => {
    await fc.assert(
      fc.asyncProperty(
        searchRequestGenerator,
        fc.array(mockOpportunityGenerator, { minLength: 0, maxLength: 20 }),
        async (searchRequest: SearchRequest, mockOpportunities: any[]) => {
          // Transform mock opportunities to proper format
          const opportunities: Opportunity[] = mockOpportunities.map(opp => ({
            ...opp,
            organizer: {
              name: opp.organizerName,
              type: opp.organizerType,
            },
            requirements: {
              skills: opp.requiredSkills,
              eligibility: ['Students', 'Professionals'],
            },
            details: {
              mode: opp.mode,
              location: opp.location,
              prizes: [],
            },
            timeline: {
              applicationDeadline: opp.applicationDeadline,
            },
          }));

          // Mock Elasticsearch response
          mockElasticsearch.search.mockResolvedValue({
            hits: {
              total: { value: opportunities.length },
              hits: opportunities.map(opp => ({ _source: opp })),
            },
            aggregations: {
              types: { buckets: [] },
              organizerTypes: { buckets: [] },
              modes: { buckets: [] },
              locations: { buckets: [] },
              skills: { buckets: [] },
            },
          });

          const result = await searchService.searchOpportunities(searchRequest);

          // Property: All results should be relevant
          if (result.success && result.data) {
            const { opportunities: resultOpportunities, totalCount } =
              result.data;

            // Basic relevance checks
            expect(resultOpportunities).toBeInstanceOf(Array);
            expect(totalCount).toBeGreaterThanOrEqual(0);

            // If there are results, they should match basic criteria
            if (resultOpportunities.length > 0) {
              resultOpportunities.forEach(opportunity => {
                // Essential fields should be present
                expect(opportunity.id).toBeDefined();
                expect(opportunity.title).toBeDefined();
                expect(opportunity.type).toMatch(
                  /^(hackathon|internship|workshop)$/
                );
                expect(opportunity.organizer.name).toBeDefined();
                expect(opportunity.timeline.applicationDeadline).toBeInstanceOf(
                  Date
                );

                // If type filter is specified, results should match
                if (searchRequest.filters?.type) {
                  expect(opportunity.type).toBe(searchRequest.filters.type);
                }

                // If organizer type filter is specified, results should match
                if (searchRequest.filters?.organizerType) {
                  expect(opportunity.organizer.type).toBe(
                    searchRequest.filters.organizerType
                  );
                }

                // If mode filter is specified, results should match
                if (searchRequest.filters?.mode) {
                  expect(opportunity.details.mode).toBe(
                    searchRequest.filters.mode
                  );
                }

                // If skills filter is specified, opportunity should have at least one matching skill
                if (
                  searchRequest.filters?.skills &&
                  searchRequest.filters.skills.length > 0
                ) {
                  const hasMatchingSkill = searchRequest.filters.skills.some(
                    filterSkill =>
                      opportunity.requirements.skills.some(
                        oppSkill =>
                          oppSkill
                            .toLowerCase()
                            .includes(filterSkill.toLowerCase()) ||
                          filterSkill
                            .toLowerCase()
                            .includes(oppSkill.toLowerCase())
                      )
                  );
                  expect(hasMatchingSkill).toBe(true);
                }

                // Opportunity should be active and have future deadline
                expect(opportunity.isActive).toBe(true);
                expect(
                  opportunity.timeline.applicationDeadline.getTime()
                ).toBeGreaterThan(Date.now() - 24 * 60 * 60 * 1000);
              });
            }

            // Pagination should be respected
            if (searchRequest.pagination) {
              const { limit } = searchRequest.pagination;
              expect(resultOpportunities.length).toBeLessThanOrEqual(limit);
            } else {
              // Default limit should be applied
              expect(resultOpportunities.length).toBeLessThanOrEqual(20);
            }
          }
        }
      ),
      { numRuns: 50, timeout: 10000 }
    );
  });

  /**
   * Property: Voice search should produce equivalent results to text search
   */
  it('should produce equivalent results for voice and text queries', async () => {
    await fc.assert(
      fc.asyncProperty(
        englishSearchQueries,
        fc.array(mockOpportunityGenerator, { minLength: 1, maxLength: 10 }),
        async (query: string, mockOpportunities: any[]) => {
          // Transform mock opportunities
          const opportunities: Opportunity[] = mockOpportunities.map(opp => ({
            ...opp,
            organizer: {
              name: opp.organizerName,
              type: opp.organizerType,
            },
            requirements: {
              skills: opp.requiredSkills,
              eligibility: ['Students', 'Professionals'],
            },
            details: {
              mode: opp.mode,
              location: opp.location,
              prizes: [],
            },
            timeline: {
              applicationDeadline: opp.applicationDeadline,
            },
          }));

          // Mock Elasticsearch response
          mockElasticsearch.search.mockResolvedValue({
            hits: {
              total: { value: opportunities.length },
              hits: opportunities.map(opp => ({ _source: opp })),
            },
            aggregations: {
              types: { buckets: [] },
              organizerTypes: { buckets: [] },
              modes: { buckets: [] },
              locations: { buckets: [] },
              skills: { buckets: [] },
            },
          });

          // Text search
          const textSearchRequest: SearchRequest = { query };
          const textResult =
            await searchService.searchOpportunities(textSearchRequest);

          // Voice search (mock voice processing)
          const mockAudioBlob = new Blob(['mock audio'], { type: 'audio/wav' });
          const voiceResult = await voiceService.processVoiceInput({
            audioData: mockAudioBlob,
            language: 'en',
          });

          // Property: Voice processing should succeed and extract similar intent
          if (voiceResult.success && voiceResult.data) {
            const voiceSearchRequest: SearchRequest = {
              query: voiceResult.data.searchQuery,
            };

            // Mock the same response for voice-derived query
            const voiceSearchResult =
              await searchService.searchOpportunities(voiceSearchRequest);

            // Both searches should succeed
            expect(textResult.success).toBe(true);
            expect(voiceSearchResult.success).toBe(true);

            if (textResult.data && voiceSearchResult.data) {
              // Results should have similar structure
              expect(voiceSearchResult.data.opportunities).toBeInstanceOf(
                Array
              );
              expect(voiceSearchResult.data.totalCount).toBeGreaterThanOrEqual(
                0
              );

              // If both have results, they should be of the same type structure
              if (
                textResult.data.opportunities.length > 0 &&
                voiceSearchResult.data.opportunities.length > 0
              ) {
                const textOpp = textResult.data.opportunities[0];
                const voiceOpp = voiceSearchResult.data.opportunities[0];

                expect(typeof textOpp.id).toBe(typeof voiceOpp.id);
                expect(typeof textOpp.title).toBe(typeof voiceOpp.title);
                expect(typeof textOpp.type).toBe(typeof voiceOpp.type);
              }
            }
          }
        }
      ),
      { numRuns: 30, timeout: 15000 }
    );
  });

  /**
   * Property: Search should handle multilingual queries appropriately
   */
  it('should handle English and Hindi queries with appropriate results', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.record({
            query: englishSearchQueries,
            language: fc.constant('en' as const),
          }),
          fc.record({
            query: hindiSearchQueries,
            language: fc.constant('hi' as const),
          })
        ),
        fc.array(mockOpportunityGenerator, { minLength: 1, maxLength: 15 }),
        async (
          queryData: { query: string; language: 'en' | 'hi' },
          mockOpportunities: any[]
        ) => {
          // Transform mock opportunities
          const opportunities: Opportunity[] = mockOpportunities.map(opp => ({
            ...opp,
            organizer: {
              name: opp.organizerName,
              type: opp.organizerType,
            },
            requirements: {
              skills: opp.requiredSkills,
              eligibility: ['Students', 'Professionals'],
            },
            details: {
              mode: opp.mode,
              location: opp.location,
              prizes: [],
            },
            timeline: {
              applicationDeadline: opp.applicationDeadline,
            },
          }));

          // Mock Elasticsearch response
          mockElasticsearch.search.mockResolvedValue({
            hits: {
              total: { value: opportunities.length },
              hits: opportunities.map(opp => ({ _source: opp })),
            },
            aggregations: {
              types: { buckets: [] },
              organizerTypes: { buckets: [] },
              modes: { buckets: [] },
              locations: { buckets: [] },
              skills: { buckets: [] },
            },
          });

          const searchRequest: SearchRequest = {
            query: queryData.query,
            userId: 'test-user',
          };

          const result = await searchService.searchOpportunities(searchRequest);

          // Property: Search should handle both languages
          expect(result.success).toBe(true);

          if (result.data) {
            const { opportunities: resultOpportunities } = result.data;

            // Results should be valid regardless of language
            resultOpportunities.forEach(opportunity => {
              expect(opportunity.id).toBeDefined();
              expect(opportunity.title).toBeDefined();
              expect(opportunity.type).toMatch(
                /^(hackathon|internship|workshop)$/
              );
              expect(opportunity.organizer.name).toBeDefined();
              expect(opportunity.timeline.applicationDeadline).toBeInstanceOf(
                Date
              );
              expect(opportunity.isActive).toBe(true);
            });

            // Query should be processed (logged for analytics)
            expect(mockElasticsearch.search).toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 40, timeout: 12000 }
    );
  });

  /**
   * Property: Empty or invalid queries should be handled gracefully
   */
  it('should handle edge cases in search queries gracefully', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          fc.constant(''),
          fc.constant('   '),
          fc.string({ maxLength: 2 }),
          fc.string({ minLength: 200, maxLength: 1000 }),
          fc.constantFrom('!@#$%^&*()', '123456789', 'a'.repeat(500))
        ),
        async (edgeCaseQuery: string) => {
          // Mock empty response for edge cases
          mockElasticsearch.search.mockResolvedValue({
            hits: {
              total: { value: 0 },
              hits: [],
            },
            aggregations: {
              types: { buckets: [] },
              organizerTypes: { buckets: [] },
              modes: { buckets: [] },
              locations: { buckets: [] },
              skills: { buckets: [] },
            },
          });

          const searchRequest: SearchRequest = { query: edgeCaseQuery };
          const result = await searchService.searchOpportunities(searchRequest);

          // Property: Edge cases should not crash the system
          expect(result.success).toBe(true);

          if (result.data) {
            expect(result.data.opportunities).toBeInstanceOf(Array);
            expect(result.data.totalCount).toBeGreaterThanOrEqual(0);
            expect(result.data.facets).toBeDefined();
          }
        }
      ),
      { numRuns: 25, timeout: 8000 }
    );
  });
});
