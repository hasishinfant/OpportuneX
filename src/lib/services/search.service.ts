import { PrismaClient } from '@prisma/client';
import type {
  ApiResponse,
  Opportunity,
  SearchFacets,
  SearchRequest,
  SearchResponse,
} from '../../types';
import { elasticsearch, esUtils, INDICES } from '../elasticsearch';

const prisma = new PrismaClient();

export interface OpportunityDocument {
  id: string;
  title: string;
  description: string;
  type: string;
  organizerName: string;
  organizerType: string;
  requiredSkills: string[];
  experienceRequired?: string;
  educationRequired?: string;
  eligibilityCriteria: string[];
  mode: string;
  location?: string;
  duration?: string;
  stipend?: string;
  prizes: string[];
  applicationDeadline: string;
  startDate?: string;
  endDate?: string;
  externalUrl: string;
  sourceId: string;
  tags: string[];
  isActive: boolean;
  qualityScore: number;
  createdAt: string;
  updatedAt: string;
}

export class SearchService {
  private readonly opportunitiesIndex = INDICES.OPPORTUNITIES;

  /**
   * Initialize Elasticsearch indices
   */
  async initializeIndices(): Promise<ApiResponse<null>> {
    try {
      // Opportunities index mapping
      const opportunitiesMapping = {
        properties: {
          id: { type: 'keyword' },
          title: {
            type: 'text',
            analyzer: 'custom_text_analyzer',
            fields: {
              keyword: { type: 'keyword' },
              suggest: { type: 'completion' },
            },
          },
          description: {
            type: 'text',
            analyzer: 'custom_text_analyzer',
          },
          type: { type: 'keyword' },
          organizerName: {
            type: 'text',
            fields: { keyword: { type: 'keyword' } },
          },
          organizerType: { type: 'keyword' },
          requiredSkills: {
            type: 'keyword',
            fields: {
              text: { type: 'text', analyzer: 'custom_text_analyzer' },
            },
          },
          experienceRequired: { type: 'text' },
          educationRequired: { type: 'text' },
          eligibilityCriteria: { type: 'text' },
          mode: { type: 'keyword' },
          location: {
            type: 'text',
            fields: { keyword: { type: 'keyword' } },
          },
          duration: { type: 'keyword' },
          stipend: { type: 'keyword' },
          prizes: { type: 'text' },
          applicationDeadline: { type: 'date' },
          startDate: { type: 'date' },
          endDate: { type: 'date' },
          externalUrl: { type: 'keyword' },
          sourceId: { type: 'keyword' },
          tags: {
            type: 'keyword',
            fields: {
              text: { type: 'text', analyzer: 'custom_text_analyzer' },
            },
          },
          isActive: { type: 'boolean' },
          qualityScore: { type: 'integer' },
          createdAt: { type: 'date' },
          updatedAt: { type: 'date' },
        },
      };

      const success = await esUtils.createIndex(
        this.opportunitiesIndex,
        opportunitiesMapping
      );

      return {
        success,
        message: success
          ? 'Indices initialized successfully'
          : 'Failed to initialize indices',
      };
    } catch (error) {
      console.error('Initialize indices error:', error);
      return {
        success: false,
        error: 'Failed to initialize search indices',
      };
    }
  }

  /**
   * Index a single opportunity
   */
  async indexOpportunity(opportunity: Opportunity): Promise<ApiResponse<null>> {
    try {
      const document: OpportunityDocument = {
        id: opportunity.id,
        title: opportunity.title,
        description: opportunity.description,
        type: opportunity.type,
        organizerName: opportunity.organizer.name,
        organizerType: opportunity.organizer.type,
        requiredSkills: opportunity.requirements.skills,
        experienceRequired: opportunity.requirements.experience,
        educationRequired: opportunity.requirements.education,
        eligibilityCriteria: opportunity.requirements.eligibility,
        mode: opportunity.details.mode,
        location: opportunity.details.location,
        duration: opportunity.details.duration,
        stipend: opportunity.details.stipend,
        prizes: opportunity.details.prizes || [],
        applicationDeadline:
          opportunity.timeline.applicationDeadline.toISOString(),
        startDate: opportunity.timeline.startDate?.toISOString(),
        endDate: opportunity.timeline.endDate?.toISOString(),
        externalUrl: opportunity.externalUrl,
        sourceId: opportunity.sourceId,
        tags: opportunity.tags,
        isActive: opportunity.isActive,
        qualityScore: 0, // This would be calculated based on various factors
        createdAt: opportunity.createdAt.toISOString(),
        updatedAt: opportunity.updatedAt.toISOString(),
      };

      await elasticsearch.index({
        index: this.opportunitiesIndex,
        id: opportunity.id,
        document,
      });

      return {
        success: true,
        message: 'Opportunity indexed successfully',
      };
    } catch (error) {
      console.error('Index opportunity error:', error);
      return {
        success: false,
        error: 'Failed to index opportunity',
      };
    }
  }

  /**
   * Bulk index opportunities
   */
  async bulkIndexOpportunities(
    opportunities: Opportunity[]
  ): Promise<ApiResponse<{ indexed: number; errors: any[] }>> {
    try {
      const documents = opportunities.map(opportunity => ({
        id: opportunity.id,
        title: opportunity.title,
        description: opportunity.description,
        type: opportunity.type,
        organizerName: opportunity.organizer.name,
        organizerType: opportunity.organizer.type,
        requiredSkills: opportunity.requirements.skills,
        experienceRequired: opportunity.requirements.experience,
        educationRequired: opportunity.requirements.education,
        eligibilityCriteria: opportunity.requirements.eligibility,
        mode: opportunity.details.mode,
        location: opportunity.details.location,
        duration: opportunity.details.duration,
        stipend: opportunity.details.stipend,
        prizes: opportunity.details.prizes || [],
        applicationDeadline:
          opportunity.timeline.applicationDeadline.toISOString(),
        startDate: opportunity.timeline.startDate?.toISOString(),
        endDate: opportunity.timeline.endDate?.toISOString(),
        externalUrl: opportunity.externalUrl,
        sourceId: opportunity.sourceId,
        tags: opportunity.tags,
        isActive: opportunity.isActive,
        qualityScore: 0,
        createdAt: opportunity.createdAt.toISOString(),
        updatedAt: opportunity.updatedAt.toISOString(),
      }));

      const result = await esUtils.bulkIndex(
        this.opportunitiesIndex,
        documents
      );

      return {
        success: result.success,
        data: {
          indexed: result.indexed,
          errors: result.errors,
        },
        message: `Bulk indexing completed: ${result.indexed} opportunities indexed`,
      };
    } catch (error) {
      console.error('Bulk index opportunities error:', error);
      return {
        success: false,
        error: 'Failed to bulk index opportunities',
      };
    }
  }

  /**
   * Remove opportunity from index
   */
  async removeOpportunity(opportunityId: string): Promise<ApiResponse<null>> {
    try {
      await elasticsearch.delete({
        index: this.opportunitiesIndex,
        id: opportunityId,
      });

      return {
        success: true,
        message: 'Opportunity removed from index successfully',
      };
    } catch (error) {
      console.error('Remove opportunity error:', error);
      return {
        success: false,
        error: 'Failed to remove opportunity from index',
      };
    }
  }

  /**
   * Search opportunities with natural language processing
   */
  async searchOpportunities(
    searchRequest: SearchRequest
  ): Promise<ApiResponse<SearchResponse>> {
    try {
      const { query, filters, pagination, userId } = searchRequest;
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 20;
      const from = (page - 1) * limit;

      // Build Elasticsearch query
      const esQuery: any = {
        bool: {
          must: [],
          filter: [
            { term: { isActive: true } },
            { range: { applicationDeadline: { gte: 'now' } } },
          ],
        },
      };

      // Add text search
      if (query && query.trim()) {
        esQuery.bool.must.push({
          multi_match: {
            query: query.trim(),
            fields: [
              'title^3',
              'description^2',
              'organizerName^2',
              'requiredSkills.text^2',
              'tags.text',
              'location',
            ],
            type: 'best_fields',
            fuzziness: 'AUTO',
          },
        });
      } else {
        esQuery.bool.must.push({ match_all: {} });
      }

      // Apply filters
      if (filters) {
        if (filters.type) {
          esQuery.bool.filter.push({ term: { type: filters.type } });
        }
        if (filters.organizerType) {
          esQuery.bool.filter.push({
            term: { organizerType: filters.organizerType },
          });
        }
        if (filters.mode) {
          esQuery.bool.filter.push({ term: { mode: filters.mode } });
        }
        if (filters.location) {
          esQuery.bool.filter.push({
            match: {
              location: {
                query: filters.location,
                fuzziness: 'AUTO',
              },
            },
          });
        }
        if (filters.skills && filters.skills.length > 0) {
          esQuery.bool.filter.push({
            terms: { requiredSkills: filters.skills },
          });
        }
      }

      // Execute search
      const searchResponse = await elasticsearch.search({
        index: this.opportunitiesIndex,
        query: esQuery,
        from,
        size: limit,
        sort: [
          { qualityScore: { order: 'desc' } },
          { applicationDeadline: { order: 'asc' } },
          { _score: { order: 'desc' } },
        ],
        aggs: {
          types: {
            terms: { field: 'type', size: 10 },
          },
          organizerTypes: {
            terms: { field: 'organizerType', size: 10 },
          },
          modes: {
            terms: { field: 'mode', size: 10 },
          },
          locations: {
            terms: { field: 'location.keyword', size: 20 },
          },
          skills: {
            terms: { field: 'requiredSkills', size: 50 },
          },
        },
      });

      // Transform results
      const opportunities: Opportunity[] = searchResponse.hits.hits.map(
        (hit: any) => {
          const source = hit._source;
          return {
            id: source.id,
            title: source.title,
            description: source.description,
            type: source.type,
            organizer: {
              name: source.organizerName,
              type: source.organizerType,
              logo: undefined,
            },
            requirements: {
              skills: source.requiredSkills,
              experience: source.experienceRequired,
              education: source.educationRequired,
              eligibility: source.eligibilityCriteria,
            },
            details: {
              mode: source.mode,
              location: source.location,
              duration: source.duration,
              stipend: source.stipend,
              prizes: source.prizes,
            },
            timeline: {
              applicationDeadline: new Date(source.applicationDeadline),
              startDate: source.startDate
                ? new Date(source.startDate)
                : undefined,
              endDate: source.endDate ? new Date(source.endDate) : undefined,
            },
            externalUrl: source.externalUrl,
            sourceId: source.sourceId,
            tags: source.tags,
            createdAt: new Date(source.createdAt),
            updatedAt: new Date(source.updatedAt),
            isActive: source.isActive,
          };
        }
      );

      // Build facets
      const facets: SearchFacets = {
        types:
          searchResponse.aggregations?.types?.buckets?.map((bucket: any) => ({
            name: bucket.key,
            count: bucket.doc_count,
          })) || [],
        organizerTypes:
          searchResponse.aggregations?.organizerTypes?.buckets?.map(
            (bucket: any) => ({
              name: bucket.key,
              count: bucket.doc_count,
            })
          ) || [],
        modes:
          searchResponse.aggregations?.modes?.buckets?.map((bucket: any) => ({
            name: bucket.key,
            count: bucket.doc_count,
          })) || [],
        locations:
          searchResponse.aggregations?.locations?.buckets?.map(
            (bucket: any) => ({
              name: bucket.key,
              count: bucket.doc_count,
            })
          ) || [],
        skills:
          searchResponse.aggregations?.skills?.buckets?.map((bucket: any) => ({
            name: bucket.key,
            count: bucket.doc_count,
          })) || [],
      };

      // Track search if user is provided
      if (userId && query) {
        // This would be handled by analytics service
        console.log(`Search tracked for user ${userId}: "${query}"`);
      }

      const response: SearchResponse = {
        opportunities,
        totalCount: searchResponse.hits.total?.value || 0,
        facets,
      };

      return {
        success: true,
        data: response,
        message: 'Search completed successfully',
      };
    } catch (error) {
      console.error('Search opportunities error:', error);
      return {
        success: false,
        error: 'Failed to search opportunities',
      };
    }
  }

  /**
   * Get search suggestions
   */
  async getSearchSuggestions(
    query: string,
    limit = 10
  ): Promise<ApiResponse<string[]>> {
    try {
      const searchResponse = await elasticsearch.search({
        index: this.opportunitiesIndex,
        suggest: {
          title_suggest: {
            prefix: query,
            completion: {
              field: 'title.suggest',
              size: limit,
            },
          },
        },
      });

      const suggestions =
        searchResponse.suggest?.title_suggest?.[0]?.options?.map(
          (option: any) => option.text
        ) || [];

      return {
        success: true,
        data: suggestions,
        message: 'Search suggestions retrieved successfully',
      };
    } catch (error) {
      console.error('Get search suggestions error:', error);
      return {
        success: false,
        error: 'Failed to get search suggestions',
      };
    }
  }

  /**
   * Sync opportunities from database to Elasticsearch
   */
  async syncOpportunities(): Promise<
    ApiResponse<{ synced: number; errors: any[] }>
  > {
    try {
      // Get all active opportunities from database
      const opportunities = await prisma.opportunity.findMany({
        where: { isActive: true },
        include: {
          source: true,
        },
      });

      // Transform to Opportunity format
      const transformedOpportunities: Opportunity[] = opportunities.map(
        opp => ({
          id: opp.id,
          title: opp.title,
          description: opp.description || '',
          type: opp.type as 'hackathon' | 'internship' | 'workshop',
          organizer: {
            name: opp.organizerName,
            type: opp.organizerType as
              | 'corporate'
              | 'startup'
              | 'government'
              | 'academic',
            logo: opp.organizerLogo || undefined,
          },
          requirements: {
            skills: opp.requiredSkills,
            experience: opp.experienceRequired || undefined,
            education: opp.educationRequired || undefined,
            eligibility: opp.eligibilityCriteria,
          },
          details: {
            mode: opp.mode as 'online' | 'offline' | 'hybrid',
            location: opp.location || undefined,
            duration: opp.duration || undefined,
            stipend: opp.stipend || undefined,
            prizes: opp.prizes,
          },
          timeline: {
            applicationDeadline: opp.applicationDeadline,
            startDate: opp.startDate || undefined,
            endDate: opp.endDate || undefined,
          },
          externalUrl: opp.externalUrl,
          sourceId: opp.sourceId,
          tags: opp.tags,
          createdAt: opp.createdAt,
          updatedAt: opp.updatedAt,
          isActive: opp.isActive,
        })
      );

      const result = await this.bulkIndexOpportunities(
        transformedOpportunities
      );

      return {
        success: result.success,
        data: {
          synced: result.data?.indexed || 0,
          errors: result.data?.errors || [],
        },
        message: `Sync completed: ${result.data?.indexed || 0} opportunities synced`,
      };
    } catch (error) {
      console.error('Sync opportunities error:', error);
      return {
        success: false,
        error: 'Failed to sync opportunities',
      };
    }
  }
}

export const searchService = new SearchService();
