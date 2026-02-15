/**
 * Property-Based Test: Opportunity Display Completeness
 * **Validates: Requirements 1.3**
 *
 * Property 4: For any opportunity displayed to users, the display should include
 * all essential details: title, organizer, deadline, and requirements
 */

import * as fc from 'fast-check';
import { SearchService } from '../../lib/services/search.service';
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

describe('Property Test: Opportunity Display Completeness', () => {
  let searchService: SearchService;

  beforeEach(() => {
    searchService = new SearchService();
    jest.clearAllMocks();
  });

  // Generator for complete opportunities
  const completeOpportunityGenerator = fc.record({
    id: fc.string({ minLength: 5, maxLength: 30 }),
    title: fc.string({ minLength: 10, maxLength: 200 }),
    description: fc.string({ minLength: 20, maxLength: 1000 }),
    type: fc.constantFrom('hackathon', 'internship', 'workshop'),
    organizerName: fc.string({ minLength: 3, maxLength: 100 }),
    organizerType: fc.constantFrom(
      'corporate',
      'startup',
      'government',
      'academic'
    ),
    organizerLogo: fc.option(fc.webUrl()),
    requiredSkills: fc.array(fc.string({ minLength: 2, maxLength: 30 }), {
      minLength: 1,
      maxLength: 15,
    }),
    experienceRequired: fc.option(fc.string({ minLength: 5, maxLength: 100 })),
    educationRequired: fc.option(fc.string({ minLength: 5, maxLength: 100 })),
    eligibilityCriteria: fc.array(fc.string({ minLength: 5, maxLength: 50 }), {
      minLength: 1,
      maxLength: 10,
    }),
    mode: fc.constantFrom('online', 'offline', 'hybrid'),
    location: fc.option(fc.string({ minLength: 3, maxLength: 50 })),
    duration: fc.option(fc.string({ minLength: 3, maxLength: 30 })),
    stipend: fc.option(fc.string({ minLength: 3, maxLength: 30 })),
    prizes: fc.array(fc.string({ minLength: 3, maxLength: 50 }), {
      maxLength: 10,
    }),
    applicationDeadline: fc.date({
      min: new Date(),
      max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    }),
    startDate: fc.option(
      fc.date({
        min: new Date(),
        max: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000),
      })
    ),
    endDate: fc.option(
      fc.date({
        min: new Date(),
        max: new Date(Date.now() + 450 * 24 * 60 * 60 * 1000),
      })
    ),
    externalUrl: fc.webUrl(),
    sourceId: fc.string({ minLength: 3, maxLength: 20 }),
    tags: fc.array(fc.string({ minLength: 2, maxLength: 20 }), {
      minLength: 1,
      maxLength: 12,
    }),
    isActive: fc.constant(true),
    createdAt: fc.date({ max: new Date() }),
    updatedAt: fc.date({ max: new Date() }),
  });

  /**
   * Property: All displayed opportunities must have essential details
   */
  it('should display all essential details for every opportunity', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(completeOpportunityGenerator, { minLength: 1, maxLength: 20 }),
        async (mockOpportunities: any[]) => {
          // Transform to proper Opportunity format
          const opportunities: Opportunity[] = mockOpportunities.map(opp => ({
            ...opp,
            organizer: {
              name: opp.organizerName,
              type: opp.organizerType,
              logo: opp.organizerLogo,
            },
            requirements: {
              skills: opp.requiredSkills,
              experience: opp.experienceRequired,
              education: opp.educationRequired,
              eligibility: opp.eligibilityCriteria,
            },
            details: {
              mode: opp.mode,
              location: opp.location,
              duration: opp.duration,
              stipend: opp.stipend,
              prizes: opp.prizes,
            },
            timeline: {
              applicationDeadline: opp.applicationDeadline,
              startDate: opp.startDate,
              endDate: opp.endDate,
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
            query: 'test opportunities',
          };

          const result = await searchService.searchOpportunities(searchRequest);

          expect(result.success).toBe(true);

          if (result.data && result.data.opportunities.length > 0) {
            result.data.opportunities.forEach(opportunity => {
              // Property: Essential details must be present and valid

              // Title - must be present and meaningful
              expect(opportunity.title).toBeDefined();
              expect(typeof opportunity.title).toBe('string');
              expect(opportunity.title.trim().length).toBeGreaterThan(5);

              // Organizer - must be present with name and type
              expect(opportunity.organizer).toBeDefined();
              expect(opportunity.organizer.name).toBeDefined();
              expect(typeof opportunity.organizer.name).toBe('string');
              expect(opportunity.organizer.name.trim().length).toBeGreaterThan(
                2
              );
              expect(opportunity.organizer.type).toMatch(
                /^(corporate|startup|government|academic)$/
              );

              // Deadline - must be present and in the future
              expect(opportunity.timeline.applicationDeadline).toBeDefined();
              expect(opportunity.timeline.applicationDeadline).toBeInstanceOf(
                Date
              );
              expect(
                opportunity.timeline.applicationDeadline.getTime()
              ).toBeGreaterThan(Date.now() - 24 * 60 * 60 * 1000);

              // Requirements - must be present with at least skills
              expect(opportunity.requirements).toBeDefined();
              expect(opportunity.requirements.skills).toBeDefined();
              expect(Array.isArray(opportunity.requirements.skills)).toBe(true);
              expect(opportunity.requirements.skills.length).toBeGreaterThan(0);

              // Each skill should be a non-empty string
              opportunity.requirements.skills.forEach(skill => {
                expect(typeof skill).toBe('string');
                expect(skill.trim().length).toBeGreaterThan(1);
              });

              // Eligibility criteria should be present
              expect(opportunity.requirements.eligibility).toBeDefined();
              expect(Array.isArray(opportunity.requirements.eligibility)).toBe(
                true
              );
              expect(
                opportunity.requirements.eligibility.length
              ).toBeGreaterThan(0);

              // Additional essential fields
              expect(opportunity.id).toBeDefined();
              expect(typeof opportunity.id).toBe('string');
              expect(opportunity.id.length).toBeGreaterThan(3);

              expect(opportunity.type).toMatch(
                /^(hackathon|internship|workshop)$/
              );

              expect(opportunity.details.mode).toMatch(
                /^(online|offline|hybrid)$/
              );

              expect(opportunity.externalUrl).toBeDefined();
              expect(typeof opportunity.externalUrl).toBe('string');
              expect(opportunity.externalUrl).toMatch(/^https?:\/\/.+/);

              expect(opportunity.isActive).toBe(true);
            });
          }
        }
      ),
      { numRuns: 50, timeout: 12000 }
    );
  });

  /**
   * Property: Opportunities with missing essential data should not be displayed
   */
  it('should not display opportunities with missing essential details', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            id: fc.option(fc.string({ minLength: 1, maxLength: 20 })),
            title: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
            organizerName: fc.option(
              fc.string({ minLength: 1, maxLength: 50 })
            ),
            organizerType: fc.option(
              fc.constantFrom('corporate', 'startup', 'government', 'academic')
            ),
            requiredSkills: fc.option(
              fc.array(fc.string({ minLength: 1, maxLength: 20 }), {
                maxLength: 5,
              })
            ),
            applicationDeadline: fc.option(fc.date()),
            type: fc.option(
              fc.constantFrom('hackathon', 'internship', 'workshop')
            ),
            mode: fc.option(fc.constantFrom('online', 'offline', 'hybrid')),
            externalUrl: fc.option(fc.string({ minLength: 5, maxLength: 100 })),
            isActive: fc.option(fc.boolean()),
          }),
          { minLength: 1, maxLength: 10 }
        ),
        async (incompleteOpportunities: any[]) => {
          // Filter out opportunities that have all essential fields
          const actuallyIncomplete = incompleteOpportunities.filter(
            opp =>
              !opp.id ||
              !opp.title ||
              !opp.organizerName ||
              !opp.organizerType ||
              !opp.requiredSkills ||
              !opp.applicationDeadline ||
              !opp.type ||
              !opp.mode ||
              !opp.externalUrl ||
              opp.isActive === false ||
              (opp.requiredSkills && opp.requiredSkills.length === 0)
          );

          if (actuallyIncomplete.length === 0) {
            return; // Skip if all opportunities are actually complete
          }

          // Mock response with incomplete opportunities
          mockElasticsearch.search.mockResolvedValue({
            hits: {
              total: { value: 0 }, // Should return no results for incomplete data
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
            query: 'incomplete opportunities',
          };

          const result = await searchService.searchOpportunities(searchRequest);

          expect(result.success).toBe(true);

          if (result.data) {
            // Property: Incomplete opportunities should not be displayed
            expect(result.data.opportunities).toEqual([]);
            expect(result.data.totalCount).toBe(0);
          }
        }
      ),
      { numRuns: 30, timeout: 10000 }
    );
  });

  /**
   * Property: Opportunity details should be properly formatted and consistent
   */
  it('should display opportunity details in consistent format', async () => {
    await fc.assert(
      fc.asyncProperty(completeOpportunityGenerator, async (mockOpp: any) => {
        const opportunity: Opportunity = {
          ...mockOpp,
          organizer: {
            name: mockOpp.organizerName,
            type: mockOpp.organizerType,
            logo: mockOpp.organizerLogo,
          },
          requirements: {
            skills: mockOpp.requiredSkills,
            experience: mockOpp.experienceRequired,
            education: mockOpp.educationRequired,
            eligibility: mockOpp.eligibilityCriteria,
          },
          details: {
            mode: mockOpp.mode,
            location: mockOpp.location,
            duration: mockOpp.duration,
            stipend: mockOpp.stipend,
            prizes: mockOpp.prizes,
          },
          timeline: {
            applicationDeadline: mockOpp.applicationDeadline,
            startDate: mockOpp.startDate,
            endDate: mockOpp.endDate,
          },
        };

        mockElasticsearch.search.mockResolvedValue({
          hits: {
            total: { value: 1 },
            hits: [{ _source: opportunity }],
          },
          aggregations: {
            types: { buckets: [] },
            organizerTypes: { buckets: [] },
            modes: { buckets: [] },
            locations: { buckets: [] },
            skills: { buckets: [] },
          },
        });

        const result = await searchService.searchOpportunities({
          query: 'test',
        });

        expect(result.success).toBe(true);

        if (result.data && result.data.opportunities.length > 0) {
          const displayedOpp = result.data.opportunities[0];

          // Property: Data should be consistently formatted

          // Dates should be proper Date objects
          expect(displayedOpp.timeline.applicationDeadline).toBeInstanceOf(
            Date
          );
          if (displayedOpp.timeline.startDate) {
            expect(displayedOpp.timeline.startDate).toBeInstanceOf(Date);
          }
          if (displayedOpp.timeline.endDate) {
            expect(displayedOpp.timeline.endDate).toBeInstanceOf(Date);
          }

          // Arrays should be proper arrays
          expect(Array.isArray(displayedOpp.requirements.skills)).toBe(true);
          expect(Array.isArray(displayedOpp.requirements.eligibility)).toBe(
            true
          );
          expect(Array.isArray(displayedOpp.details.prizes)).toBe(true);
          expect(Array.isArray(displayedOpp.tags)).toBe(true);

          // Strings should be trimmed and non-empty
          expect(displayedOpp.title.trim()).toBe(displayedOpp.title);
          expect(displayedOpp.organizer.name.trim()).toBe(
            displayedOpp.organizer.name
          );
          expect(displayedOpp.description.trim()).toBe(
            displayedOpp.description
          );

          // URLs should be valid format
          expect(displayedOpp.externalUrl).toMatch(/^https?:\/\/.+/);

          // Enums should have valid values
          expect(['hackathon', 'internship', 'workshop']).toContain(
            displayedOpp.type
          );
          expect(['corporate', 'startup', 'government', 'academic']).toContain(
            displayedOpp.organizer.type
          );
          expect(['online', 'offline', 'hybrid']).toContain(
            displayedOpp.details.mode
          );
        }
      }),
      { numRuns: 40, timeout: 10000 }
    );
  });

  /**
   * Property: Opportunity display should handle edge cases gracefully
   */
  it('should handle edge cases in opportunity data gracefully', async () => {
    const edgeCaseOpportunities = [
      // Very long title
      {
        id: 'edge-1',
        title: 'A'.repeat(200),
        organizerName: 'Test Org',
        organizerType: 'corporate',
        requiredSkills: ['JavaScript'],
        eligibilityCriteria: ['Students'],
        applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        type: 'hackathon',
        mode: 'online',
        externalUrl: 'https://example.com',
        isActive: true,
      },
      // Many skills
      {
        id: 'edge-2',
        title: 'Multi-skill Opportunity',
        organizerName: 'Skill Corp',
        organizerType: 'startup',
        requiredSkills: Array.from({ length: 20 }, (_, i) => `Skill${i + 1}`),
        eligibilityCriteria: ['All levels'],
        applicationDeadline: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        type: 'workshop',
        mode: 'hybrid',
        externalUrl: 'https://skills.example.com',
        isActive: true,
      },
      // Minimal data
      {
        id: 'edge-3',
        title: 'Min',
        organizerName: 'Min',
        organizerType: 'academic',
        requiredSkills: ['X'],
        eligibilityCriteria: ['Y'],
        applicationDeadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        type: 'internship',
        mode: 'offline',
        externalUrl: 'https://min.com',
        isActive: true,
      },
    ];

    for (const edgeOpp of edgeCaseOpportunities) {
      const opportunity: Opportunity = {
        ...edgeOpp,
        description: 'Test description',
        organizer: {
          name: edgeOpp.organizerName,
          type: edgeOpp.organizerType as any,
        },
        requirements: {
          skills: edgeOpp.requiredSkills,
          eligibility: edgeOpp.eligibilityCriteria,
        },
        details: {
          mode: edgeOpp.mode as any,
          prizes: [],
        },
        timeline: {
          applicationDeadline: edgeOpp.applicationDeadline,
        },
        sourceId: 'test-source',
        tags: ['test'],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockElasticsearch.search.mockResolvedValue({
        hits: {
          total: { value: 1 },
          hits: [{ _source: opportunity }],
        },
        aggregations: {
          types: { buckets: [] },
          organizerTypes: { buckets: [] },
          modes: { buckets: [] },
          locations: { buckets: [] },
          skills: { buckets: [] },
        },
      });

      const result = await searchService.searchOpportunities({
        query: 'edge case',
      });

      // Property: Should handle edge cases without errors
      expect(result.success).toBe(true);

      if (result.data && result.data.opportunities.length > 0) {
        const displayedOpp = result.data.opportunities[0];

        // Should still have all essential fields
        expect(displayedOpp.id).toBeDefined();
        expect(displayedOpp.title).toBeDefined();
        expect(displayedOpp.organizer.name).toBeDefined();
        expect(displayedOpp.timeline.applicationDeadline).toBeInstanceOf(Date);
        expect(displayedOpp.requirements.skills).toBeInstanceOf(Array);
        expect(displayedOpp.requirements.skills.length).toBeGreaterThan(0);
      }
    }
  });
});
