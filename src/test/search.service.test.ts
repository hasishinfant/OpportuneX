/**
 * Unit tests for Search Service
 * Tests Elasticsearch operations, search functionality, and indexing
 */

import { PrismaClient } from '@prisma/client';
import { SearchService } from '../lib/services/search.service';
import type { Opportunity, SearchRequest } from '../types';

// Mock dependencies
jest.mock('@prisma/client');
jest.mock('../lib/elasticsearch', () => ({
  elasticsearch: {
    index: jest.fn(),
    search: jest.fn(),
    delete: jest.fn(),
  },
  esUtils: {
    createIndex: jest.fn(),
    bulkIndex: jest.fn(),
  },
  INDICES: {
    OPPORTUNITIES: 'test_opportunities',
  },
}));

const mockElasticsearch = require('../lib/elasticsearch').elasticsearch;
const mockEsUtils = require('../lib/elasticsearch').esUtils;
const mockPrisma = {
  opportunity: {
    findMany: jest.fn(),
  },
};

(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(
  () => mockPrisma as any
);

describe('SearchService', () => {
  let searchService: SearchService;

  beforeEach(() => {
    searchService = new SearchService();
    jest.clearAllMocks();
  });

  const mockOpportunity: Opportunity = {
    id: 'opp-123',
    title: 'AI Hackathon 2024',
    description: 'Build innovative AI solutions',
    type: 'hackathon',
    organizer: {
      name: 'TechCorp',
      type: 'corporate',
      logo: 'https://example.com/logo.png',
    },
    requirements: {
      skills: ['JavaScript', 'Python', 'Machine Learning'],
      experience: '1-2 years',
      education: "Bachelor's degree",
      eligibility: ['Students', 'Professionals'],
    },
    details: {
      mode: 'hybrid',
      location: 'Mumbai, India',
      duration: '48 hours',
      stipend: '₹50,000',
      prizes: ['₹1,00,000', '₹50,000', '₹25,000'],
    },
    timeline: {
      applicationDeadline: new Date('2024-03-01'),
      startDate: new Date('2024-03-15'),
      endDate: new Date('2024-03-17'),
    },
    externalUrl: 'https://example.com/hackathon',
    sourceId: 'source-1',
    tags: ['AI', 'Machine Learning', 'Innovation'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
    isActive: true,
  };

  describe('initializeIndices', () => {
    it('should successfully initialize Elasticsearch indices', async () => {
      mockEsUtils.createIndex.mockResolvedValue(true);

      const result = await searchService.initializeIndices();

      expect(result.success).toBe(true);
      expect(result.message).toBe('Indices initialized successfully');
      expect(mockEsUtils.createIndex).toHaveBeenCalledWith(
        'test_opportunities',
        expect.objectContaining({
          properties: expect.objectContaining({
            id: { type: 'keyword' },
            title: expect.objectContaining({
              type: 'text',
              analyzer: 'custom_text_analyzer',
            }),
            type: { type: 'keyword' },
            isActive: { type: 'boolean' },
          }),
        })
      );
    });

    it('should handle index creation failure', async () => {
      mockEsUtils.createIndex.mockResolvedValue(false);

      const result = await searchService.initializeIndices();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to initialize indices');
    });

    it('should handle Elasticsearch errors', async () => {
      const esError = new Error('Elasticsearch connection failed');
      mockEsUtils.createIndex.mockRejectedValue(esError);

      const result = await searchService.initializeIndices();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to initialize search indices');
    });
  });

  describe('indexOpportunity', () => {
    it('should successfully index a single opportunity', async () => {
      mockElasticsearch.index.mockResolvedValue({ _id: 'opp-123' });

      const result = await searchService.indexOpportunity(mockOpportunity);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Opportunity indexed successfully');
      expect(mockElasticsearch.index).toHaveBeenCalledWith({
        index: 'test_opportunities',
        id: 'opp-123',
        document: expect.objectContaining({
          id: 'opp-123',
          title: 'AI Hackathon 2024',
          description: 'Build innovative AI solutions',
          type: 'hackathon',
          organizerName: 'TechCorp',
          organizerType: 'corporate',
          requiredSkills: ['JavaScript', 'Python', 'Machine Learning'],
          mode: 'hybrid',
          location: 'Mumbai, India',
          isActive: true,
          qualityScore: 0,
        }),
      });
    });

    it('should handle indexing errors', async () => {
      const indexError = new Error('Index operation failed');
      mockElasticsearch.index.mockRejectedValue(indexError);

      const result = await searchService.indexOpportunity(mockOpportunity);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to index opportunity');
    });

    it('should properly transform opportunity data for indexing', async () => {
      mockElasticsearch.index.mockResolvedValue({ _id: 'opp-123' });

      await searchService.indexOpportunity(mockOpportunity);

      const indexCall = mockElasticsearch.index.mock.calls[0][0];
      const { document } = indexCall;

      expect(document.applicationDeadline).toBe('2024-03-01T00:00:00.000Z');
      expect(document.startDate).toBe('2024-03-15T00:00:00.000Z');
      expect(document.endDate).toBe('2024-03-17T00:00:00.000Z');
      expect(document.prizes).toEqual(['₹1,00,000', '₹50,000', '₹25,000']);
      expect(document.tags).toEqual(['AI', 'Machine Learning', 'Innovation']);
    });
  });

  describe('bulkIndexOpportunities', () => {
    const mockOpportunities = [
      mockOpportunity,
      { ...mockOpportunity, id: 'opp-456' },
    ];

    it('should successfully bulk index opportunities', async () => {
      mockEsUtils.bulkIndex.mockResolvedValue({
        success: true,
        indexed: 2,
        errors: [],
      });

      const result =
        await searchService.bulkIndexOpportunities(mockOpportunities);

      expect(result.success).toBe(true);
      expect(result.data?.indexed).toBe(2);
      expect(result.data?.errors).toEqual([]);
      expect(result.message).toBe(
        'Bulk indexing completed: 2 opportunities indexed'
      );
      expect(mockEsUtils.bulkIndex).toHaveBeenCalledWith(
        'test_opportunities',
        expect.arrayContaining([
          expect.objectContaining({ id: 'opp-123' }),
          expect.objectContaining({ id: 'opp-456' }),
        ])
      );
    });

    it('should handle bulk indexing with partial errors', async () => {
      mockEsUtils.bulkIndex.mockResolvedValue({
        success: false,
        indexed: 1,
        errors: [{ id: 'opp-456', error: 'Validation failed' }],
      });

      const result =
        await searchService.bulkIndexOpportunities(mockOpportunities);

      expect(result.success).toBe(false);
      expect(result.data?.indexed).toBe(1);
      expect(result.data?.errors).toHaveLength(1);
    });

    it('should handle bulk indexing errors', async () => {
      const bulkError = new Error('Bulk operation failed');
      mockEsUtils.bulkIndex.mockRejectedValue(bulkError);

      const result =
        await searchService.bulkIndexOpportunities(mockOpportunities);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to bulk index opportunities');
    });
  });

  describe('removeOpportunity', () => {
    it('should successfully remove opportunity from index', async () => {
      mockElasticsearch.delete.mockResolvedValue({ _id: 'opp-123' });

      const result = await searchService.removeOpportunity('opp-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe(
        'Opportunity removed from index successfully'
      );
      expect(mockElasticsearch.delete).toHaveBeenCalledWith({
        index: 'test_opportunities',
        id: 'opp-123',
      });
    });

    it('should handle removal errors', async () => {
      const deleteError = new Error('Delete operation failed');
      mockElasticsearch.delete.mockRejectedValue(deleteError);

      const result = await searchService.removeOpportunity('opp-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to remove opportunity from index');
    });
  });

  describe('searchOpportunities', () => {
    const mockSearchRequest: SearchRequest = {
      query: 'AI hackathon',
      filters: {
        type: 'hackathon',
        skills: ['JavaScript', 'Python'],
        mode: 'hybrid',
        location: 'Mumbai',
      },
      pagination: {
        page: 1,
        limit: 10,
      },
      userId: 'user-123',
    };

    const mockSearchResponse = {
      hits: {
        total: { value: 1 },
        hits: [
          {
            _source: {
              id: 'opp-123',
              title: 'AI Hackathon 2024',
              description: 'Build innovative AI solutions',
              type: 'hackathon',
              organizerName: 'TechCorp',
              organizerType: 'corporate',
              requiredSkills: ['JavaScript', 'Python', 'Machine Learning'],
              mode: 'hybrid',
              location: 'Mumbai, India',
              applicationDeadline: '2024-03-01T00:00:00.000Z',
              startDate: '2024-03-15T00:00:00.000Z',
              endDate: '2024-03-17T00:00:00.000Z',
              externalUrl: 'https://example.com/hackathon',
              sourceId: 'source-1',
              tags: ['AI', 'Machine Learning'],
              isActive: true,
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-15T00:00:00.000Z',
            },
          },
        ],
      },
      aggregations: {
        types: {
          buckets: [{ key: 'hackathon', doc_count: 5 }],
        },
        organizerTypes: {
          buckets: [{ key: 'corporate', doc_count: 3 }],
        },
        modes: {
          buckets: [{ key: 'hybrid', doc_count: 2 }],
        },
        locations: {
          buckets: [{ key: 'Mumbai', doc_count: 4 }],
        },
        skills: {
          buckets: [
            { key: 'JavaScript', doc_count: 8 },
            { key: 'Python', doc_count: 6 },
          ],
        },
      },
    };

    it('should successfully search opportunities with all filters', async () => {
      mockElasticsearch.search.mockResolvedValue(mockSearchResponse);

      const result = await searchService.searchOpportunities(mockSearchRequest);

      expect(result.success).toBe(true);
      expect(result.data?.opportunities).toHaveLength(1);
      expect(result.data?.totalCount).toBe(1);
      expect(result.data?.opportunities[0].id).toBe('opp-123');
      expect(result.data?.opportunities[0].title).toBe('AI Hackathon 2024');
      expect(result.data?.facets?.types).toEqual([
        { name: 'hackathon', count: 5 },
      ]);
      expect(result.message).toBe('Search completed successfully');

      const searchCall = mockElasticsearch.search.mock.calls[0][0];
      expect(searchCall.query.bool.must[0].multi_match.query).toBe(
        'AI hackathon'
      );
      expect(searchCall.query.bool.filter).toContainEqual({
        term: { type: 'hackathon' },
      });
      expect(searchCall.query.bool.filter).toContainEqual({
        term: { mode: 'hybrid' },
      });
      expect(searchCall.query.bool.filter).toContainEqual({
        terms: { requiredSkills: ['JavaScript', 'Python'] },
      });
    });

    it('should handle search without query (match all)', async () => {
      const requestWithoutQuery = { ...mockSearchRequest, query: '' };
      mockElasticsearch.search.mockResolvedValue(mockSearchResponse);

      await searchService.searchOpportunities(requestWithoutQuery);

      const searchCall = mockElasticsearch.search.mock.calls[0][0];
      expect(searchCall.query.bool.must[0]).toEqual({ match_all: {} });
    });

    it('should handle search without filters', async () => {
      const requestWithoutFilters = { query: 'AI hackathon' };
      mockElasticsearch.search.mockResolvedValue(mockSearchResponse);

      await searchService.searchOpportunities(requestWithoutFilters);

      const searchCall = mockElasticsearch.search.mock.calls[0][0];
      expect(searchCall.query.bool.filter).toEqual([
        { term: { isActive: true } },
        { range: { applicationDeadline: { gte: 'now' } } },
      ]);
    });

    it('should handle pagination correctly', async () => {
      const paginatedRequest = {
        ...mockSearchRequest,
        pagination: { page: 3, limit: 5 },
      };
      mockElasticsearch.search.mockResolvedValue(mockSearchResponse);

      await searchService.searchOpportunities(paginatedRequest);

      const searchCall = mockElasticsearch.search.mock.calls[0][0];
      expect(searchCall.from).toBe(10); // (3-1) * 5
      expect(searchCall.size).toBe(5);
    });

    it('should use default pagination when not provided', async () => {
      const requestWithoutPagination = { query: 'AI hackathon' };
      mockElasticsearch.search.mockResolvedValue(mockSearchResponse);

      await searchService.searchOpportunities(requestWithoutPagination);

      const searchCall = mockElasticsearch.search.mock.calls[0][0];
      expect(searchCall.from).toBe(0);
      expect(searchCall.size).toBe(20);
    });

    it('should handle search errors', async () => {
      const searchError = new Error('Search operation failed');
      mockElasticsearch.search.mockRejectedValue(searchError);

      const result = await searchService.searchOpportunities(mockSearchRequest);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to search opportunities');
    });

    it('should properly transform search results', async () => {
      mockElasticsearch.search.mockResolvedValue(mockSearchResponse);

      const result = await searchService.searchOpportunities(mockSearchRequest);

      const opportunity = result.data?.opportunities[0];
      expect(opportunity?.timeline.applicationDeadline).toBeInstanceOf(Date);
      expect(opportunity?.timeline.startDate).toBeInstanceOf(Date);
      expect(opportunity?.timeline.endDate).toBeInstanceOf(Date);
      expect(opportunity?.createdAt).toBeInstanceOf(Date);
      expect(opportunity?.updatedAt).toBeInstanceOf(Date);
    });

    it('should handle empty search results', async () => {
      const emptyResponse = {
        hits: { total: { value: 0 }, hits: [] },
        aggregations: {
          types: { buckets: [] },
          organizerTypes: { buckets: [] },
          modes: { buckets: [] },
          locations: { buckets: [] },
          skills: { buckets: [] },
        },
      };
      mockElasticsearch.search.mockResolvedValue(emptyResponse);

      const result = await searchService.searchOpportunities(mockSearchRequest);

      expect(result.success).toBe(true);
      expect(result.data?.opportunities).toEqual([]);
      expect(result.data?.totalCount).toBe(0);
      expect(result.data?.facets?.types).toEqual([]);
    });
  });

  describe('getSearchSuggestions', () => {
    const mockSuggestResponse = {
      suggest: {
        title_suggest: [
          {
            options: [
              { text: 'AI Hackathon 2024' },
              { text: 'AI Workshop Series' },
              { text: 'AI Internship Program' },
            ],
          },
        ],
      },
    };

    it('should successfully get search suggestions', async () => {
      mockElasticsearch.search.mockResolvedValue(mockSuggestResponse);

      const result = await searchService.getSearchSuggestions('AI', 5);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([
        'AI Hackathon 2024',
        'AI Workshop Series',
        'AI Internship Program',
      ]);
      expect(result.message).toBe('Search suggestions retrieved successfully');

      expect(mockElasticsearch.search).toHaveBeenCalledWith({
        index: 'test_opportunities',
        suggest: {
          title_suggest: {
            prefix: 'AI',
            completion: {
              field: 'title.suggest',
              size: 5,
            },
          },
        },
      });
    });

    it('should use default limit when not provided', async () => {
      mockElasticsearch.search.mockResolvedValue(mockSuggestResponse);

      await searchService.getSearchSuggestions('AI');

      const searchCall = mockElasticsearch.search.mock.calls[0][0];
      expect(searchCall.suggest.title_suggest.completion.size).toBe(10);
    });

    it('should handle empty suggestions', async () => {
      const emptySuggestResponse = {
        suggest: {
          title_suggest: [{ options: [] }],
        },
      };
      mockElasticsearch.search.mockResolvedValue(emptySuggestResponse);

      const result = await searchService.getSearchSuggestions('xyz');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should handle suggestion errors', async () => {
      const suggestError = new Error('Suggest operation failed');
      mockElasticsearch.search.mockRejectedValue(suggestError);

      const result = await searchService.getSearchSuggestions('AI');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to get search suggestions');
    });
  });

  describe('syncOpportunities', () => {
    const mockDbOpportunities = [
      {
        id: 'opp-123',
        title: 'AI Hackathon 2024',
        description: 'Build innovative AI solutions',
        type: 'hackathon',
        organizerName: 'TechCorp',
        organizerType: 'corporate',
        organizerLogo: null,
        requiredSkills: ['JavaScript', 'Python'],
        experienceRequired: '1-2 years',
        educationRequired: null,
        eligibilityCriteria: ['Students'],
        mode: 'hybrid',
        location: 'Mumbai',
        duration: '48 hours',
        stipend: null,
        prizes: ['₹1,00,000'],
        applicationDeadline: new Date('2024-03-01'),
        startDate: new Date('2024-03-15'),
        endDate: null,
        externalUrl: 'https://example.com/hackathon',
        sourceId: 'source-1',
        tags: ['AI'],
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
        source: { id: 'source-1', name: 'TechCorp' },
      },
    ];

    it('should successfully sync opportunities from database', async () => {
      mockPrisma.opportunity.findMany.mockResolvedValue(mockDbOpportunities);
      mockEsUtils.bulkIndex.mockResolvedValue({
        success: true,
        indexed: 1,
        errors: [],
      });

      const result = await searchService.syncOpportunities();

      expect(result.success).toBe(true);
      expect(result.data?.synced).toBe(1);
      expect(result.data?.errors).toEqual([]);
      expect(result.message).toBe('Sync completed: 1 opportunities synced');

      expect(mockPrisma.opportunity.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: { source: true },
      });
    });

    it('should handle database errors during sync', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.opportunity.findMany.mockRejectedValue(dbError);

      const result = await searchService.syncOpportunities();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to sync opportunities');
    });

    it('should handle empty database results', async () => {
      mockPrisma.opportunity.findMany.mockResolvedValue([]);
      mockEsUtils.bulkIndex.mockResolvedValue({
        success: true,
        indexed: 0,
        errors: [],
      });

      const result = await searchService.syncOpportunities();

      expect(result.success).toBe(true);
      expect(result.data?.synced).toBe(0);
    });

    it('should properly transform database records to Opportunity format', async () => {
      mockPrisma.opportunity.findMany.mockResolvedValue(mockDbOpportunities);
      mockEsUtils.bulkIndex.mockResolvedValue({
        success: true,
        indexed: 1,
        errors: [],
      });

      await searchService.syncOpportunities();

      // Check that bulkIndexOpportunities was called with properly transformed data
      expect(mockEsUtils.bulkIndex).toHaveBeenCalledWith(
        'test_opportunities',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'opp-123',
            title: 'AI Hackathon 2024',
            organizerName: 'TechCorp',
            organizerType: 'corporate',
            requiredSkills: ['JavaScript', 'Python'],
            mode: 'hybrid',
            isActive: true,
          }),
        ])
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle malformed opportunity data during indexing', async () => {
      const malformedOpportunity = {
        ...mockOpportunity,
        timeline: {
          applicationDeadline: null, // Invalid date
        },
      } as any;

      const result = await searchService.indexOpportunity(malformedOpportunity);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to index opportunity');
    });

    it('should handle very large search queries', async () => {
      const largeQuery = 'a'.repeat(10000);
      const requestWithLargeQuery = { query: largeQuery };

      mockElasticsearch.search.mockResolvedValue({
        hits: { total: { value: 0 }, hits: [] },
        aggregations: {},
      });

      const result = await searchService.searchOpportunities(
        requestWithLargeQuery
      );

      expect(result.success).toBe(true);
      expect(mockElasticsearch.search).toHaveBeenCalled();
    });

    it('should handle search with all possible filter combinations', async () => {
      const comprehensiveRequest: SearchRequest = {
        query: 'test',
        filters: {
          type: 'hackathon',
          organizerType: 'corporate',
          mode: 'online',
          location: 'Delhi',
          skills: ['React', 'Node.js', 'MongoDB'],
        },
        pagination: { page: 1, limit: 50 },
        userId: 'user-123',
      };

      mockElasticsearch.search.mockResolvedValue({
        hits: { total: { value: 0 }, hits: [] },
        aggregations: {},
      });

      const result =
        await searchService.searchOpportunities(comprehensiveRequest);

      expect(result.success).toBe(true);
      const searchCall = mockElasticsearch.search.mock.calls[0][0];
      expect(searchCall.query.bool.filter).toContainEqual({
        term: { type: 'hackathon' },
      });
      expect(searchCall.query.bool.filter).toContainEqual({
        term: { organizerType: 'corporate' },
      });
      expect(searchCall.query.bool.filter).toContainEqual({
        term: { mode: 'online' },
      });
      expect(searchCall.query.bool.filter).toContainEqual({
        terms: { requiredSkills: ['React', 'Node.js', 'MongoDB'] },
      });
    });
  });
});
