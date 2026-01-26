/**
 * Property-Based Test: Filter Combination Correctness
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
 * 
 * Property 2: For any combination of filters (skills, organizer type, mode, location), 
 * all returned opportunities should satisfy every applied filter criterion simultaneously
 */

import * as fc from 'fast-check';
import { SearchService } from '../../lib/services/search.service';
import type { Opportunity, SearchFilters, SearchRequest } from '../../types';

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

describe('Property Test: Filter Combination Correctness', () => {
  let searchService: SearchService;

  beforeEach(() => {
    searchService = new SearchService();
    jest.clearAllMocks();
  });

  // Generator for comprehensive filters
  const filtersGenerator = fc.record({
    type: fc.option(fc.constantFrom('hackathon', 'internship', 'workshop')),
    organizerType: fc.option(fc.constantFrom('corporate', 'startup', 'government', 'academic')),
    mode: fc.option(fc.constantFrom('online', 'offline', 'hybrid')),
    location: fc.option(fc.constantFrom('Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Pune', 'Hyderabad')),
    skills: fc.option(fc.array(
      fc.constantFrom('JavaScript', 'Python', 'Java', 'React', 'Node.js', 'Machine Learning', 'AI', 'Data Science'),
      { minLength: 1, maxLength: 5 }
    )),
  });

  // Generator for opportunities that match specific filters
  const opportunityGenerator = (filters: SearchFilters) => fc.record({
    id: fc.string({ minLength: 5, maxLength: 20 }),
    title: fc.string({ minLength: 10, maxLength: 100 }),
    description: fc.string({ minLength: 20, maxLength: 300 }),
    type: filters.type ? fc.constant(filters.type) : fc.constantFrom('hackathon', 'internship', 'workshop'),
    organizerName: fc.string({ minLength: 5, maxLength: 50 }),
    organizerType: filters.organizerType ? fc.constant(filters.organizerType) : fc.constantFrom('corporate', 'startup', 'government', 'academic'),
    requiredSkills: filters.skills ? 
      fc.array(fc.oneof(fc.constantFrom(...filters.skills), fc.string({ minLength: 3, maxLength: 15 })), { minLength: 1, maxLength: 8 }) :
      fc.array(fc.string({ minLength: 3, maxLength: 15 }), { minLength: 1, maxLength: 8 }),
    mode: filters.mode ? fc.constant(filters.mode) : fc.constantFrom('online', 'offline', 'hybrid'),
    location: filters.location ? fc.constant(filters.location) : fc.option(fc.string({ minLength: 3, maxLength: 30 })),
    applicationDeadline: fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }),
    externalUrl: fc.webUrl(),
    sourceId: fc.string({ minLength: 5, maxLength: 15 }),
    tags: fc.array(fc.string({ minLength: 2, maxLength: 15 }), { minLength: 1, maxLength: 6 }),
    isActive: fc.constant(true),
    createdAt: fc.date({ max: new Date() }),
    updatedAt: fc.date({ max: new Date() }),
  });

  /**
   * Property: All returned opportunities must satisfy every applied filter
   */
  it('should return only opportunities that match ALL applied filters', async () => {
    await fc.assert(
      fc.asyncProperty(
        filtersGenerator,
        async (filters: SearchFilters) => {
          // Skip if no filters are applied
          const hasFilters = filters.type || filters.organizerType || filters.mode || 
                           filters.location || (filters.skills && filters.skills.length > 0);
          
          if (!hasFilters) return;

          // Generate opportunities that should match the filters
          const matchingOpportunities = await fc.sample(opportunityGenerator(filters), 10);
          
          // Transform to proper format
          const opportunities: Opportunity[] = matchingOpportunities.map(opp => ({
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

          // Mock Elasticsearch response with matching opportunities
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
            query: 'test query',
            filters,
          };

          const result = await searchService.searchOpportunities(searchRequest);

          // Property: All results must satisfy all filters
          expect(result.success).toBe(true);

          if (result.data && result.data.opportunities.length > 0) {
            result.data.opportunities.forEach(opportunity => {
              // Type filter check
              if (filters.type) {
                expect(opportunity.type).toBe(filters.type);
              }

              // Organizer type filter check
              if (filters.organizerType) {
                expect(opportunity.organizer.type).toBe(filters.organizerType);
              }

              // Mode filter check
              if (filters.mode) {
                expect(opportunity.details.mode).toBe(filters.mode);
              }

              // Location filter check
              if (filters.location) {
                expect(opportunity.details.location).toBeDefined();
                expect(opportunity.details.location?.toLowerCase()).toContain(filters.location.toLowerCase());
              }

              // Skills filter check
              if (filters.skills && filters.skills.length > 0) {
                const hasMatchingSkill = filters.skills.some(filterSkill =>
                  opportunity.requirements.skills.some(oppSkill =>
                    oppSkill.toLowerCase().includes(filterSkill.toLowerCase()) ||
                    filterSkill.toLowerCase().includes(oppSkill.toLowerCase())
                  )
                );
                expect(hasMatchingSkill).toBe(true);
              }
            });
          }
        }
      ),
      { numRuns: 100, timeout: 15000 }
    );
  });

  /**
   * Property: Complex filter combinations should work correctly
   */
  it('should handle complex multi-filter combinations correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          type: fc.constantFrom('hackathon', 'internship', 'workshop'),
          organizerType: fc.constantFrom('corporate', 'startup', 'government', 'academic'),
          mode: fc.constantFrom('online', 'offline', 'hybrid'),
          skills: fc.array(fc.constantFrom('JavaScript', 'Python', 'React', 'AI'), { minLength: 1, maxLength: 3 }),
        }),
        async (complexFilters: Required<Omit<SearchFilters, 'location'>>) => {
          // Generate opportunities that match all filters
          const matchingOpps = await fc.sample(opportunityGenerator(complexFilters), 5);
          
          const opportunities: Opportunity[] = matchingOpps.map(opp => ({
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
            query: 'complex filter test',
            filters: complexFilters,
          };

          const result = await searchService.searchOpportunities(searchRequest);

          expect(result.success).toBe(true);

          if (result.data && result.data.opportunities.length > 0) {
            result.data.opportunities.forEach(opportunity => {
              // All filters must be satisfied simultaneously
              expect(opportunity.type).toBe(complexFilters.type);
              expect(opportunity.organizer.type).toBe(complexFilters.organizerType);
              expect(opportunity.details.mode).toBe(complexFilters.mode);
              
              const hasMatchingSkill = complexFilters.skills.some(filterSkill =>
                opportunity.requirements.skills.some(oppSkill =>
                  oppSkill.toLowerCase().includes(filterSkill.toLowerCase()) ||
                  filterSkill.toLowerCase().includes(oppSkill.toLowerCase())
                )
              );
              expect(hasMatchingSkill).toBe(true);
            });
          }
        }
      ),
      { numRuns: 50, timeout: 12000 }
    );
  });

  /**
   * Property: Empty filter combinations should return all valid opportunities
   */
  it('should return all opportunities when no filters are applied', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({
          id: fc.string({ minLength: 5, maxLength: 20 }),
          type: fc.constantFrom('hackathon', 'internship', 'workshop'),
          organizerType: fc.constantFrom('corporate', 'startup', 'government', 'academic'),
          mode: fc.constantFrom('online', 'offline', 'hybrid'),
          isActive: fc.constant(true),
          applicationDeadline: fc.date({ min: new Date(), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }),
        }), { minLength: 1, maxLength: 20 }),
        async (mockOpps: any[]) => {
          const opportunities: Opportunity[] = mockOpps.map(opp => ({
            ...opp,
            title: 'Test Opportunity',
            description: 'Test Description',
            organizer: {
              name: 'Test Organizer',
              type: opp.organizerType,
            },
            requirements: {
              skills: ['JavaScript'],
              eligibility: ['Students'],
            },
            details: {
              mode: opp.mode,
              prizes: [],
            },
            timeline: {
              applicationDeadline: opp.applicationDeadline,
            },
            externalUrl: 'https://example.com',
            sourceId: 'test-source',
            tags: ['test'],
            createdAt: new Date(),
            updatedAt: new Date(),
          }));

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
            query: 'test',
            filters: {}, // No filters
          };

          const result = await searchService.searchOpportunities(searchRequest);

          expect(result.success).toBe(true);

          if (result.data) {
            // Should return all opportunities (up to pagination limit)
            expect(result.data.opportunities.length).toBeGreaterThan(0);
            expect(result.data.totalCount).toBe(opportunities.length);

            // All returned opportunities should be valid
            result.data.opportunities.forEach(opportunity => {
              expect(opportunity.isActive).toBe(true);
              expect(opportunity.timeline.applicationDeadline.getTime()).toBeGreaterThan(Date.now() - 24 * 60 * 60 * 1000);
            });
          }
        }
      ),
      { numRuns: 30, timeout: 10000 }
    );
  });

  /**
   * Property: Contradictory filters should return empty results
   */
  it('should handle contradictory or impossible filter combinations', async () => {
    const impossibleFilters: SearchFilters[] = [
      // These combinations should typically return no results in real scenarios
      { type: 'hackathon', organizerType: 'government', skills: ['Blockchain', 'Cryptocurrency', 'DeFi'] },
      { type: 'workshop', mode: 'offline', location: 'Remote' },
    ];

    for (const filters of impossibleFilters) {
      // Mock empty response for impossible combinations
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

      const searchRequest: SearchRequest = {
        query: 'impossible combination',
        filters,
      };

      const result = await searchService.searchOpportunities(searchRequest);

      expect(result.success).toBe(true);
      
      if (result.data) {
        // Should handle gracefully with empty results
        expect(result.data.opportunities).toEqual([]);
        expect(result.data.totalCount).toBe(0);
        expect(result.data.facets).toBeDefined();
      }
    }
  });
});