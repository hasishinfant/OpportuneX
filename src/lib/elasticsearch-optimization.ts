import type { Client } from '@elastic/elasticsearch';
import { elasticsearch, INDICES } from './elasticsearch';

/**
 * Elasticsearch Optimization Service
 * Provides optimized indexing, querying, and performance monitoring for OpportuneX
 */

interface SearchMetrics {
  query: string;
  duration: number;
  resultCount: number;
  timestamp: Date;
  indexName: string;
}

class ElasticsearchPerformanceMonitor {
  private metrics: SearchMetrics[] = [];
  private readonly maxMetrics = 1000;

  logSearch(
    query: string,
    duration: number,
    resultCount: number,
    indexName: string
  ) {
    this.metrics.push({
      query,
      duration,
      resultCount,
      timestamp: new Date(),
      indexName,
    });

    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  getSlowQueries(thresholdMs = 1000): SearchMetrics[] {
    return this.metrics.filter(m => m.duration > thresholdMs);
  }

  getAverageSearchTime(): number {
    if (this.metrics.length === 0) return 0;
    const total = this.metrics.reduce((sum, m) => sum + m.duration, 0);
    return total / this.metrics.length;
  }

  getSearchStats(): {
    totalSearches: number;
    averageTime: number;
    slowQueries: number;
    averageResults: number;
  } {
    const totalSearches = this.metrics.length;
    const averageTime = this.getAverageSearchTime();
    const slowQueries = this.getSlowQueries().length;
    const averageResults =
      totalSearches > 0
        ? this.metrics.reduce((sum, m) => sum + m.resultCount, 0) /
          totalSearches
        : 0;

    return {
      totalSearches,
      averageTime: Math.round(averageTime * 100) / 100,
      slowQueries,
      averageResults: Math.round(averageResults * 100) / 100,
    };
  }

  clearMetrics() {
    this.metrics = [];
  }
}

export const searchMonitor = new ElasticsearchPerformanceMonitor();

/**
 * Optimized Elasticsearch mappings and settings
 */
export const OptimizedMappings = {
  opportunities: {
    properties: {
      id: { type: 'keyword' },
      title: {
        type: 'text',
        analyzer: 'english',
        fields: {
          keyword: { type: 'keyword' },
          suggest: {
            type: 'completion',
            analyzer: 'simple',
            preserve_separators: true,
            preserve_position_increments: true,
            max_input_length: 50,
          },
        },
      },
      description: {
        type: 'text',
        analyzer: 'english',
        fields: {
          raw: { type: 'text', analyzer: 'keyword' },
        },
      },
      type: { type: 'keyword' },
      organizerName: {
        type: 'text',
        analyzer: 'english',
        fields: {
          keyword: { type: 'keyword' },
        },
      },
      organizerType: { type: 'keyword' },
      requiredSkills: {
        type: 'keyword',
        fields: {
          text: { type: 'text', analyzer: 'english' },
        },
      },
      mode: { type: 'keyword' },
      location: {
        type: 'text',
        analyzer: 'english',
        fields: {
          keyword: { type: 'keyword' },
          geo: { type: 'geo_point', ignore_malformed: true },
        },
      },
      duration: { type: 'keyword' },
      stipend: { type: 'keyword' },
      prizes: { type: 'keyword' },
      applicationDeadline: { type: 'date' },
      startDate: { type: 'date' },
      endDate: { type: 'date' },
      externalUrl: { type: 'keyword', index: false },
      sourceId: { type: 'keyword' },
      tags: {
        type: 'keyword',
        fields: {
          text: { type: 'text', analyzer: 'english' },
        },
      },
      isActive: { type: 'boolean' },
      qualityScore: { type: 'integer' },
      createdAt: { type: 'date' },
      updatedAt: { type: 'date' },
      // Computed fields for better search
      searchText: {
        type: 'text',
        analyzer: 'english',
        store: false,
      },
      popularityScore: { type: 'float' },
      relevanceBoost: { type: 'float' },
    },
  },

  userBehavior: {
    properties: {
      userId: { type: 'keyword' },
      sessionId: { type: 'keyword' },
      action: { type: 'keyword' },
      opportunityId: { type: 'keyword' },
      query: {
        type: 'text',
        analyzer: 'english',
        fields: {
          keyword: { type: 'keyword' },
        },
      },
      filters: { type: 'object', enabled: false },
      resultCount: { type: 'integer' },
      clickPosition: { type: 'integer' },
      timeSpent: { type: 'integer' },
      timestamp: { type: 'date' },
      userAgent: { type: 'keyword', index: false },
      ipAddress: { type: 'ip' },
      location: { type: 'geo_point', ignore_malformed: true },
    },
  },
};

/**
 * Optimized index settings
 */
export const OptimizedSettings = {
  opportunities: {
    number_of_shards: 1,
    number_of_replicas: 0,
    refresh_interval: '30s', // Reduce refresh frequency for better indexing performance
    max_result_window: 50000, // Allow deep pagination if needed
    analysis: {
      analyzer: {
        english_analyzer: {
          type: 'english',
          stopwords: '_english_',
        },
        skill_analyzer: {
          type: 'custom',
          tokenizer: 'keyword',
          filter: ['lowercase', 'trim'],
        },
        location_analyzer: {
          type: 'custom',
          tokenizer: 'standard',
          filter: ['lowercase', 'stop'],
        },
      },
      normalizer: {
        lowercase_normalizer: {
          type: 'custom',
          filter: ['lowercase', 'trim'],
        },
      },
    },
    // Index sorting for better performance
    sort: {
      field: ['qualityScore', 'applicationDeadline'],
      order: ['desc', 'asc'],
    },
  },

  userBehavior: {
    number_of_shards: 1,
    number_of_replicas: 0,
    refresh_interval: '5s',
    // Lifecycle policy for automatic cleanup
    'index.lifecycle.name': 'user_behavior_policy',
    'index.lifecycle.rollover_alias': 'user_behavior',
  },
};

/**
 * Optimized Elasticsearch queries
 */
export class OptimizedElasticsearchQueries {
  private client: Client;

  constructor() {
    this.client = elasticsearch;
  }

  /**
   * Optimized opportunity search with advanced scoring
   */
  async searchOpportunities({
    query,
    filters = {},
    page = 1,
    size = 20,
    userId,
    userProfile,
  }: {
    query?: string;
    filters?: any;
    page?: number;
    size?: number;
    userId?: string;
    userProfile?: any;
  }) {
    const startTime = Date.now();
    const from = (page - 1) * size;

    try {
      // Build the search query
      const searchQuery: any = {
        bool: {
          must: [],
          filter: [
            { term: { isActive: true } },
            { range: { applicationDeadline: { gte: 'now' } } },
          ],
          should: [],
          minimum_should_match: 0,
        },
      };

      // Add text search if query provided
      if (query && query.trim()) {
        searchQuery.bool.must.push({
          multi_match: {
            query: query.trim(),
            fields: [
              'title^3',
              'description^2',
              'organizerName^2',
              'requiredSkills^2',
              'tags^1.5',
              'searchText',
            ],
            type: 'best_fields',
            fuzziness: 'AUTO',
            prefix_length: 2,
            max_expansions: 50,
          },
        });

        // Add phrase matching for exact matches
        searchQuery.bool.should.push({
          multi_match: {
            query: query.trim(),
            fields: ['title^5', 'description^3'],
            type: 'phrase',
            boost: 2,
          },
        });
      }

      // Add filters
      if (filters.type) {
        searchQuery.bool.filter.push({ term: { type: filters.type } });
      }
      if (filters.organizerType) {
        searchQuery.bool.filter.push({
          term: { organizerType: filters.organizerType },
        });
      }
      if (filters.mode) {
        searchQuery.bool.filter.push({ term: { mode: filters.mode } });
      }
      if (filters.location) {
        searchQuery.bool.should.push({
          match: {
            location: {
              query: filters.location,
              boost: 1.5,
            },
          },
        });
        searchQuery.bool.minimum_should_match = Math.max(
          searchQuery.bool.minimum_should_match,
          1
        );
      }
      if (filters.skills && filters.skills.length > 0) {
        searchQuery.bool.should.push({
          terms: {
            requiredSkills: filters.skills,
            boost: 2,
          },
        });
        searchQuery.bool.minimum_should_match = Math.max(
          searchQuery.bool.minimum_should_match,
          1
        );
      }

      // Add personalization if user profile available
      if (userProfile) {
        // Boost opportunities matching user's preferred types
        if (userProfile.preferredOpportunityTypes?.length > 0) {
          searchQuery.bool.should.push({
            terms: {
              type: userProfile.preferredOpportunityTypes,
              boost: 1.5,
            },
          });
        }

        // Boost opportunities matching user's skills
        if (userProfile.technicalSkills?.length > 0) {
          searchQuery.bool.should.push({
            terms: {
              requiredSkills: userProfile.technicalSkills,
              boost: 2,
            },
          });
        }

        // Boost opportunities matching user's domains
        if (userProfile.domains?.length > 0) {
          searchQuery.bool.should.push({
            terms: {
              tags: userProfile.domains,
              boost: 1.5,
            },
          });
        }

        // Location preference
        if (userProfile.city) {
          searchQuery.bool.should.push({
            match: {
              location: {
                query: userProfile.city,
                boost: 1.2,
              },
            },
          });
        }
      }

      // Execute search
      const searchBody: any = {
        query: searchQuery,
        sort: [
          { _score: { order: 'desc' } },
          { qualityScore: { order: 'desc' } },
          { applicationDeadline: { order: 'asc' } },
        ],
        from,
        size,
        highlight: {
          fields: {
            title: { fragment_size: 150, number_of_fragments: 1 },
            description: { fragment_size: 200, number_of_fragments: 2 },
          },
          pre_tags: ['<mark>'],
          post_tags: ['</mark>'],
        },
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
          topSkills: {
            terms: { field: 'requiredSkills', size: 20 },
          },
        },
        _source: {
          excludes: ['searchText'], // Don't return computed fields
        },
      };

      const response = await this.client.search({
        index: INDICES.OPPORTUNITIES,
        body: searchBody,
      } as any);

      const duration = Date.now() - startTime;
      const totalHits =
        typeof response.hits.total === 'number'
          ? response.hits.total
          : response.hits.total?.value || 0;

      searchMonitor.logSearch(
        query || 'filter_only',
        duration,
        totalHits,
        INDICES.OPPORTUNITIES
      );

      // Log user behavior if userId provided
      if (userId) {
        await this.logUserBehavior({
          userId,
          action: 'search',
          query,
          filters,
          resultCount: totalHits,
        });
      }

      return {
        opportunities: response.hits.hits.map((hit: any) => ({
          ...hit._source,
          _score: hit._score,
          highlight: hit.highlight,
        })),
        total: totalHits,
        page,
        size,
        totalPages: Math.ceil(totalHits / size),
        aggregations: response.aggregations,
        searchTime: duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      searchMonitor.logSearch(
        query || 'filter_only',
        duration,
        0,
        INDICES.OPPORTUNITIES
      );
      console.error('Elasticsearch search error:', error);
      throw error;
    }
  }

  /**
   * Get search suggestions with autocomplete
   */
  async getSearchSuggestions(query: string, size = 10) {
    const startTime = Date.now();

    try {
      const response = await this.client.search({
        index: INDICES.OPPORTUNITIES,
        body: {
          suggest: {
            title_suggest: {
              prefix: query,
              completion: {
                field: 'title.suggest',
                size,
                skip_duplicates: true,
              },
            },
            skill_suggest: {
              prefix: query,
              completion: {
                field: 'requiredSkills',
                size: size / 2,
                skip_duplicates: true,
              },
            },
          },
          _source: false,
        },
      });

      const duration = Date.now() - startTime;
      const totalSuggestions =
        response.suggest?.title_suggest?.[0]?.options?.length || 0;

      searchMonitor.logSearch(
        `suggestions:${query}`,
        duration,
        totalSuggestions,
        INDICES.OPPORTUNITIES
      );

      const titleSuggestions =
        response.suggest?.title_suggest?.[0]?.options || [];
      const skillSuggestions =
        response.suggest?.skill_suggest?.[0]?.options || [];

      return {
        suggestions: [
          ...titleSuggestions.map((s: any) => ({
            text: s.text,
            type: 'title',
            score: s._score,
          })),
          ...skillSuggestions.map((s: any) => ({
            text: s.text,
            type: 'skill',
            score: s._score,
          })),
        ].slice(0, size),
        searchTime: duration,
      };
    } catch (error) {
      console.error('Elasticsearch suggestions error:', error);
      return { suggestions: [], searchTime: Date.now() - startTime };
    }
  }

  /**
   * Get similar opportunities using More Like This query
   */
  async getSimilarOpportunities(opportunityId: string, size = 5) {
    const startTime = Date.now();

    try {
      const response = await this.client.search({
        index: INDICES.OPPORTUNITIES,
        body: {
          query: {
            bool: {
              must: [
                {
                  more_like_this: {
                    fields: ['title', 'description', 'requiredSkills', 'tags'],
                    like: [
                      {
                        _index: INDICES.OPPORTUNITIES,
                        _id: opportunityId,
                      },
                    ],
                    min_term_freq: 1,
                    max_query_terms: 12,
                    min_doc_freq: 1,
                  },
                },
              ],
              filter: [
                { term: { isActive: true } },
                { range: { applicationDeadline: { gte: 'now' } } },
              ],
              must_not: [{ term: { id: opportunityId } }],
            },
          },
          size,
          sort: [
            { _score: { order: 'desc' } },
            { qualityScore: { order: 'desc' } },
          ],
        },
      } as any);

      const duration = Date.now() - startTime;
      searchMonitor.logSearch(
        `similar:${opportunityId}`,
        duration,
        response.hits.hits.length,
        INDICES.OPPORTUNITIES
      );

      return {
        opportunities: response.hits.hits.map((hit: any) => ({
          ...hit._source,
          _score: hit._score,
        })),
        searchTime: duration,
      };
    } catch (error) {
      console.error('Elasticsearch similar opportunities error:', error);
      return { opportunities: [], searchTime: Date.now() - startTime };
    }
  }

  /**
   * Log user behavior for analytics
   */
  async logUserBehavior(behavior: {
    userId: string;
    sessionId?: string;
    action: string;
    opportunityId?: string;
    query?: string;
    filters?: any;
    resultCount?: number;
    clickPosition?: number;
    timeSpent?: number;
    userAgent?: string;
    ipAddress?: string;
  }) {
    try {
      await this.client.index({
        index: INDICES.USER_BEHAVIOR,
        body: {
          ...behavior,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to log user behavior:', error);
    }
  }

  /**
   * Bulk index opportunities with optimized settings
   */
  async bulkIndexOpportunities(opportunities: any[]) {
    const startTime = Date.now();

    try {
      // Prepare documents with computed fields
      const documentsWithComputedFields = opportunities.map(opp => ({
        ...opp,
        searchText: [
          opp.title,
          opp.description,
          opp.organizerName,
          ...(opp.requiredSkills || []),
          ...(opp.tags || []),
        ]
          .filter(Boolean)
          .join(' '),
        popularityScore: this.calculatePopularityScore(opp),
        relevanceBoost: this.calculateRelevanceBoost(opp),
      }));

      const body = documentsWithComputedFields.flatMap(doc => [
        { index: { _index: INDICES.OPPORTUNITIES, _id: doc.id } },
        doc,
      ]);

      const response = await this.client.bulk({
        body,
        refresh: false, // Don't refresh immediately for better performance
      });

      const duration = Date.now() - startTime;
      const errors = response.items.filter((item: any) => item.index?.error);

      console.log(
        `✅ Bulk indexed ${opportunities.length} opportunities in ${duration}ms`
      );

      if (errors.length > 0) {
        console.error(`❌ ${errors.length} indexing errors:`, errors);
      }

      return {
        success: !response.errors,
        indexed: opportunities.length - errors.length,
        errors,
        duration,
      };
    } catch (error) {
      console.error('Bulk indexing error:', error);
      throw error;
    }
  }

  /**
   * Calculate popularity score based on various factors
   */
  private calculatePopularityScore(opportunity: any): number {
    let score = 0;

    // Base score from quality score
    score += (opportunity.qualityScore || 0) * 0.1;

    // Boost for recent opportunities
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(opportunity.createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (daysSinceCreated <= 7) score += 10;
    else if (daysSinceCreated <= 30) score += 5;

    // Boost for opportunities with prizes
    if (opportunity.prizes && opportunity.prizes.length > 0) score += 5;

    // Boost for opportunities with stipend
    if (opportunity.stipend) score += 3;

    // Boost for well-known organizers
    if (opportunity.organizerType === 'corporate') score += 2;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Calculate relevance boost based on opportunity characteristics
   */
  private calculateRelevanceBoost(opportunity: any): number {
    let boost = 1.0;

    // Boost high-quality opportunities
    if (opportunity.qualityScore > 80) boost += 0.3;
    else if (opportunity.qualityScore > 60) boost += 0.2;
    else if (opportunity.qualityScore > 40) boost += 0.1;

    // Boost opportunities with detailed descriptions
    if (opportunity.description && opportunity.description.length > 200)
      boost += 0.1;

    // Boost opportunities with multiple skills
    if (opportunity.requiredSkills && opportunity.requiredSkills.length > 3)
      boost += 0.1;

    return boost;
  }

  /**
   * Optimize index performance
   */
  async optimizeIndex(indexName: string) {
    try {
      // Force merge to optimize segments
      await this.client.indices.forcemerge({
        index: indexName,
        max_num_segments: 1,
        wait_for_completion: false,
      });

      // Update index settings for better performance
      await this.client.indices.putSettings({
        index: indexName,
        body: {
          refresh_interval: '30s',
          'index.translog.flush_threshold_size': '1gb',
          'index.translog.sync_interval': '30s',
        },
      });

      console.log(`✅ Index ${indexName} optimized successfully`);
    } catch (error) {
      console.error(`❌ Failed to optimize index ${indexName}:`, error);
    }
  }

  /**
   * Get search performance statistics
   */
  getPerformanceStats() {
    return {
      searchStats: searchMonitor.getSearchStats(),
      slowQueries: searchMonitor.getSlowQueries(500),
    };
  }
}

/**
 * Index lifecycle management
 */
export class IndexLifecycleManager {
  private client: Client;

  constructor() {
    this.client = elasticsearch;
  }

  /**
   * Create index lifecycle policy for user behavior data
   */
  async createUserBehaviorPolicy() {
    try {
      await this.client.ilm.putLifecycle({
        name: 'user_behavior_policy',
        body: {
          policy: {
            phases: {
              hot: {
                actions: {
                  rollover: {
                    max_size: '50gb',
                    max_age: '30d',
                  },
                },
              },
              warm: {
                min_age: '30d',
                actions: {
                  allocate: {
                    number_of_replicas: 0,
                  },
                  forcemerge: {
                    max_num_segments: 1,
                  },
                },
              },
              cold: {
                min_age: '90d',
                actions: {
                  allocate: {
                    number_of_replicas: 0,
                  },
                },
              },
              delete: {
                min_age: '365d',
              },
            },
          },
        },
      } as any);

      console.log('✅ User behavior lifecycle policy created');
    } catch (error) {
      console.error('❌ Failed to create lifecycle policy:', error);
    }
  }

  /**
   * Setup index templates
   */
  async setupIndexTemplates() {
    try {
      // Opportunities index template
      await this.client.indices.putIndexTemplate({
        name: 'opportunities_template',
        body: {
          index_patterns: ['opportunities*'],
          template: {
            settings: OptimizedSettings.opportunities,
            mappings: OptimizedMappings.opportunities,
          },
        },
      } as any);

      // User behavior index template
      await this.client.indices.putIndexTemplate({
        name: 'user_behavior_template',
        body: {
          index_patterns: ['user_behavior*'],
          template: {
            settings: OptimizedSettings.userBehavior,
            mappings: OptimizedMappings.userBehavior,
          },
        },
      } as any);

      console.log('✅ Index templates created successfully');
    } catch (error) {
      console.error('❌ Failed to create index templates:', error);
    }
  }
}

// Export singleton instances
export const optimizedESQueries = new OptimizedElasticsearchQueries();
export const indexLifecycleManager = new IndexLifecycleManager();
