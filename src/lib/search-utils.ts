import { elasticsearch, esUtils, INDICES } from './elasticsearch';
import type {
  SearchRequest,
  SearchResponse,
  SearchFilters,
  SearchFacets,
  Opportunity,
} from '../types';

// Search query builder class
export class SearchQueryBuilder {
  private query: any = {};
  private filters: any[] = [];
  private sort: any[] = [];
  private aggregations: any = {};
  private size = 20;
  private from = 0;

  /**
   * Set the main search query
   */
  setQuery(searchText: string): this {
    if (!searchText || searchText.trim() === '') {
      this.query = { match_all: {} };
      return this;
    }

    // Multi-match query across multiple fields with different boosts
    this.query = {
      multi_match: {
        query: searchText,
        fields: [
          'title^3', // Title gets highest boost
          'description^2', // Description gets medium boost
          'organizer.name^2', // Organizer name gets medium boost
          'requirements.skills^1.5',
          'tags^1.5',
          'searchText', // Combined search text
          'requirements.experience',
          'requirements.education',
          'details.location',
        ],
        type: 'best_fields',
        fuzziness: 'AUTO',
        operator: 'or',
      },
    };

    return this;
  }

  /**
   * Add filters based on search criteria
   */
  addFilters(filters: SearchFilters): this {
    if (filters.skills && filters.skills.length > 0) {
      this.filters.push({
        terms: {
          'requirements.skills': filters.skills,
        },
      });
    }

    if (filters.organizerType) {
      this.filters.push({
        term: {
          'organizer.type': filters.organizerType,
        },
      });
    }

    if (filters.mode) {
      this.filters.push({
        term: {
          'details.mode': filters.mode,
        },
      });
    }

    if (filters.type) {
      this.filters.push({
        term: {
          type: filters.type,
        },
      });
    }

    if (filters.location) {
      this.filters.push({
        multi_match: {
          query: filters.location,
          fields: ['details.location'],
          fuzziness: 'AUTO',
        },
      });
    }

    // Always filter for active opportunities
    this.filters.push({
      term: {
        isActive: true,
      },
    });

    // Filter out expired opportunities
    this.filters.push({
      range: {
        'timeline.applicationDeadline': {
          gte: 'now',
        },
      },
    });

    return this;
  }

  /**
   * Set sorting options
   */
  setSorting(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc'): this {
    switch (sortBy) {
      case 'deadline':
        this.sort.push({
          'timeline.applicationDeadline': { order: sortOrder },
        });
        break;
      case 'created':
        this.sort.push({
          createdAt: { order: sortOrder },
        });
        break;
      case 'popularity':
        this.sort.push({
          popularity: { order: sortOrder },
        });
        break;
      case 'relevance':
      default:
        // Default relevance sorting with secondary sort by deadline
        this.sort.push(
          { _score: { order: 'desc' } },
          { 'timeline.applicationDeadline': { order: 'asc' } }
        );
        break;
    }

    return this;
  }

  /**
   * Set pagination
   */
  setPagination(page = 1, limit = 20): this {
    this.size = Math.min(limit, 100); // Cap at 100 results per page
    this.from = (page - 1) * this.size;
    return this;
  }

  /**
   * Add aggregations for faceted search
   */
  addAggregations(): this {
    this.aggregations = {
      skills: {
        terms: {
          field: 'requirements.skills',
          size: 20,
        },
      },
      organizer_types: {
        terms: {
          field: 'organizer.type',
          size: 10,
        },
      },
      modes: {
        terms: {
          field: 'details.mode',
          size: 5,
        },
      },
      types: {
        terms: {
          field: 'type',
          size: 5,
        },
      },
      locations: {
        terms: {
          field: 'details.location.keyword',
          size: 20,
        },
      },
    };

    return this;
  }

  /**
   * Build the final Elasticsearch query
   */
  build(): any {
    const esQuery: any = {
      size: this.size,
      from: this.from,
      query: {
        bool: {
          must: [this.query],
          filter: this.filters,
        },
      },
    };

    if (this.sort.length > 0) {
      esQuery.sort = this.sort;
    }

    if (Object.keys(this.aggregations).length > 0) {
      esQuery.aggs = this.aggregations;
    }

    return esQuery;
  }
}

// Main search service class
export class SearchService {
  /**
   * Search for opportunities
   */
  static async searchOpportunities(
    request: SearchRequest
  ): Promise<SearchResponse> {
    try {
      const queryBuilder = new SearchQueryBuilder()
        .setQuery(request.query)
        .addFilters(request.filters || {})
        .setPagination(
          request.pagination?.page || 1,
          request.pagination?.limit || 20
        )
        .setSorting()
        .addAggregations();

      const esQuery = queryBuilder.build();
      const response = await esUtils.search(INDICES.OPPORTUNITIES, esQuery);

      // Transform Elasticsearch response to our format
      const opportunities: Opportunity[] = response.hits.hits.map(
        (hit: any) => ({
          ...hit._source,
          _score: hit._score,
        })
      );

      // Extract facets from aggregations
      const facets: SearchFacets = {
        skills:
          response.aggregations?.skills?.buckets?.map((bucket: any) => ({
            name: bucket.key,
            count: bucket.doc_count,
          })) || [],
        organizerTypes:
          response.aggregations?.organizer_types?.buckets?.map(
            (bucket: any) => ({
              name: bucket.key,
              count: bucket.doc_count,
            })
          ) || [],
        modes:
          response.aggregations?.modes?.buckets?.map((bucket: any) => ({
            name: bucket.key,
            count: bucket.doc_count,
          })) || [],
        types:
          response.aggregations?.types?.buckets?.map((bucket: any) => ({
            name: bucket.key,
            count: bucket.doc_count,
          })) || [],
        locations:
          response.aggregations?.locations?.buckets?.map((bucket: any) => ({
            name: bucket.key,
            count: bucket.doc_count,
          })) || [],
      };

      return {
        opportunities,
        totalCount: response.hits.total.value,
        facets,
        suggestions: await this.generateSuggestions(request.query),
      };
    } catch (error) {
      console.error('Search error:', error);
      throw new Error('Search service unavailable');
    }
  }

  /**
   * Get search suggestions based on query
   */
  static async getSuggestions(query: string, limit = 5): Promise<string[]> {
    try {
      if (!query || query.length < 2) {
        return [];
      }

      const esQuery = {
        suggest: {
          title_suggest: {
            prefix: query,
            completion: {
              field: 'title.suggest',
              size: limit,
            },
          },
        },
      };

      const response = await esUtils.search(INDICES.OPPORTUNITIES, esQuery);

      return (
        response.suggest?.title_suggest?.[0]?.options?.map(
          (option: any) => option.text
        ) || []
      );
    } catch (error) {
      console.error('Suggestions error:', error);
      return [];
    }
  }

  /**
   * Generate search suggestions based on query
   */
  private static async generateSuggestions(query: string): Promise<string[]> {
    if (!query || query.length < 3) {
      return [];
    }

    try {
      // Get suggestions from title completions
      const suggestions = await this.getSuggestions(query, 5);

      // Add some common search refinements
      const refinements = [
        `${query} internship`,
        `${query} hackathon`,
        `${query} workshop`,
        `${query} online`,
        `${query} remote`,
      ].filter(
        suggestion => !suggestion.toLowerCase().includes(query.toLowerCase())
      );

      return [...suggestions, ...refinements].slice(0, 5);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      return [];
    }
  }

  /**
   * Index a single opportunity
   */
  static async indexOpportunity(opportunity: Opportunity): Promise<boolean> {
    try {
      // Prepare the document for indexing
      const document = {
        ...opportunity,
        searchText: this.buildSearchText(opportunity),
        popularity: 0, // Will be updated based on user interactions
        relevanceScore: this.calculateRelevanceScore(opportunity),
      };

      await elasticsearch.index({
        index: INDICES.OPPORTUNITIES,
        id: opportunity.id,
        document,
      });

      return true;
    } catch (error) {
      console.error('Error indexing opportunity:', error);
      return false;
    }
  }

  /**
   * Index multiple opportunities in bulk
   */
  static async bulkIndexOpportunities(opportunities: Opportunity[]): Promise<{
    success: boolean;
    indexed: number;
    errors: any[];
  }> {
    try {
      // Prepare documents for bulk indexing
      const documents = opportunities.map(opportunity => ({
        ...opportunity,
        searchText: this.buildSearchText(opportunity),
        popularity: 0,
        relevanceScore: this.calculateRelevanceScore(opportunity),
      }));

      return await esUtils.bulkIndex(INDICES.OPPORTUNITIES, documents);
    } catch (error) {
      console.error('Error bulk indexing opportunities:', error);
      return {
        success: false,
        indexed: 0,
        errors: [error],
      };
    }
  }

  /**
   * Update opportunity in search index
   */
  static async updateOpportunity(opportunity: Opportunity): Promise<boolean> {
    try {
      const document = {
        ...opportunity,
        searchText: this.buildSearchText(opportunity),
        relevanceScore: this.calculateRelevanceScore(opportunity),
      };

      await elasticsearch.update({
        index: INDICES.OPPORTUNITIES,
        id: opportunity.id,
        doc: document,
      });

      return true;
    } catch (error) {
      console.error('Error updating opportunity:', error);
      return false;
    }
  }

  /**
   * Delete opportunity from search index
   */
  static async deleteOpportunity(opportunityId: string): Promise<boolean> {
    try {
      await elasticsearch.delete({
        index: INDICES.OPPORTUNITIES,
        id: opportunityId,
      });

      return true;
    } catch (error) {
      console.error('Error deleting opportunity:', error);
      return false;
    }
  }

  /**
   * Build combined search text for better full-text search
   */
  private static buildSearchText(opportunity: Opportunity): string {
    const parts = [
      opportunity.title,
      opportunity.description,
      opportunity.organizer.name,
      opportunity.requirements.skills.join(' '),
      opportunity.tags.join(' '),
      opportunity.requirements.experience || '',
      opportunity.requirements.education || '',
      opportunity.details.location || '',
      opportunity.details.duration || '',
      opportunity.details.stipend || '',
    ];

    return parts.filter(Boolean).join(' ');
  }

  /**
   * Calculate relevance score based on opportunity characteristics
   */
  private static calculateRelevanceScore(opportunity: Opportunity): number {
    let score = 1.0;

    // Boost recent opportunities
    const daysSinceCreated =
      (Date.now() - opportunity.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 7) {
      score += 0.5;
    } else if (daysSinceCreated < 30) {
      score += 0.2;
    }

    // Boost opportunities with longer application windows
    const daysUntilDeadline =
      (opportunity.timeline.applicationDeadline.getTime() - Date.now()) /
      (1000 * 60 * 60 * 24);
    if (daysUntilDeadline > 30) {
      score += 0.3;
    } else if (daysUntilDeadline > 7) {
      score += 0.1;
    }

    // Boost opportunities with detailed descriptions
    if (opportunity.description.length > 500) {
      score += 0.2;
    }

    // Boost opportunities with multiple skills
    if (opportunity.requirements.skills.length > 3) {
      score += 0.1;
    }

    return Math.min(score, 3.0); // Cap at 3.0
  }
}

// User behavior tracking for search analytics
export class UserBehaviorTracker {
  /**
   * Track search behavior
   */
  static async trackSearch(data: {
    userId?: string;
    sessionId: string;
    query: string;
    filters?: SearchFilters;
    resultCount: number;
    timestamp?: Date;
  }): Promise<boolean> {
    try {
      const document = {
        id: `search_${data.sessionId}_${Date.now()}`,
        userId: data.userId,
        sessionId: data.sessionId,
        action: 'search',
        searchQuery: data.query,
        filters: data.filters,
        resultCount: data.resultCount,
        timestamp: data.timestamp || new Date(),
      };

      await elasticsearch.index({
        index: INDICES.USER_BEHAVIOR,
        document,
      });

      return true;
    } catch (error) {
      console.error('Error tracking search behavior:', error);
      return false;
    }
  }

  /**
   * Track opportunity view
   */
  static async trackOpportunityView(data: {
    userId?: string;
    sessionId: string;
    opportunityId: string;
    clickPosition?: number;
    timestamp?: Date;
  }): Promise<boolean> {
    try {
      const document = {
        id: `view_${data.sessionId}_${data.opportunityId}_${Date.now()}`,
        userId: data.userId,
        sessionId: data.sessionId,
        action: 'view',
        opportunityId: data.opportunityId,
        clickPosition: data.clickPosition,
        timestamp: data.timestamp || new Date(),
      };

      await elasticsearch.index({
        index: INDICES.USER_BEHAVIOR,
        document,
      });

      return true;
    } catch (error) {
      console.error('Error tracking opportunity view:', error);
      return false;
    }
  }

  /**
   * Track opportunity favorite
   */
  static async trackOpportunityFavorite(data: {
    userId: string;
    sessionId: string;
    opportunityId: string;
    timestamp?: Date;
  }): Promise<boolean> {
    try {
      const document = {
        id: `favorite_${data.userId}_${data.opportunityId}_${Date.now()}`,
        userId: data.userId,
        sessionId: data.sessionId,
        action: 'favorite',
        opportunityId: data.opportunityId,
        timestamp: data.timestamp || new Date(),
      };

      await elasticsearch.index({
        index: INDICES.USER_BEHAVIOR,
        document,
      });

      return true;
    } catch (error) {
      console.error('Error tracking opportunity favorite:', error);
      return false;
    }
  }
}

// Export search utilities
export const searchUtils = {
  SearchService,
  SearchQueryBuilder,
  UserBehaviorTracker,
};
