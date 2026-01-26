import { esUtils, INDICES } from './elasticsearch';

// Opportunities index mapping
export const OPPORTUNITIES_MAPPING = {
  properties: {
    id: {
      type: 'keyword',
    },
    title: {
      type: 'text',
      analyzer: 'custom_text_analyzer',
      fields: {
        keyword: {
          type: 'keyword',
        },
        suggest: {
          type: 'completion',
        },
      },
    },
    description: {
      type: 'text',
      analyzer: 'custom_text_analyzer',
    },
    type: {
      type: 'keyword',
    },
    organizer: {
      properties: {
        name: {
          type: 'text',
          analyzer: 'custom_text_analyzer',
          fields: {
            keyword: {
              type: 'keyword',
            },
          },
        },
        type: {
          type: 'keyword',
        },
        logo: {
          type: 'keyword',
          index: false,
        },
      },
    },
    requirements: {
      properties: {
        skills: {
          type: 'keyword',
        },
        experience: {
          type: 'text',
          analyzer: 'custom_text_analyzer',
        },
        education: {
          type: 'text',
          analyzer: 'custom_text_analyzer',
        },
        eligibility: {
          type: 'text',
          analyzer: 'custom_text_analyzer',
        },
      },
    },
    details: {
      properties: {
        mode: {
          type: 'keyword',
        },
        location: {
          type: 'text',
          analyzer: 'custom_text_analyzer',
          fields: {
            keyword: {
              type: 'keyword',
            },
          },
        },
        duration: {
          type: 'text',
          analyzer: 'custom_text_analyzer',
        },
        stipend: {
          type: 'text',
          analyzer: 'custom_text_analyzer',
        },
        prizes: {
          type: 'text',
          analyzer: 'custom_text_analyzer',
        },
      },
    },
    timeline: {
      properties: {
        applicationDeadline: {
          type: 'date',
        },
        startDate: {
          type: 'date',
        },
        endDate: {
          type: 'date',
        },
      },
    },
    externalUrl: {
      type: 'keyword',
      index: false,
    },
    sourceId: {
      type: 'keyword',
    },
    tags: {
      type: 'keyword',
    },
    createdAt: {
      type: 'date',
    },
    updatedAt: {
      type: 'date',
    },
    isActive: {
      type: 'boolean',
    },
    // Additional fields for search optimization
    searchText: {
      type: 'text',
      analyzer: 'custom_text_analyzer',
    },
    popularity: {
      type: 'float',
    },
    relevanceScore: {
      type: 'float',
    },
  },
};

// User behavior index mapping for analytics and recommendations
export const USER_BEHAVIOR_MAPPING = {
  properties: {
    id: {
      type: 'keyword',
    },
    userId: {
      type: 'keyword',
    },
    sessionId: {
      type: 'keyword',
    },
    action: {
      type: 'keyword', // search, view, favorite, apply, etc.
    },
    opportunityId: {
      type: 'keyword',
    },
    searchQuery: {
      type: 'text',
      analyzer: 'custom_text_analyzer',
    },
    filters: {
      properties: {
        skills: {
          type: 'keyword',
        },
        organizerType: {
          type: 'keyword',
        },
        mode: {
          type: 'keyword',
        },
        location: {
          type: 'keyword',
        },
        type: {
          type: 'keyword',
        },
      },
    },
    resultCount: {
      type: 'integer',
    },
    clickPosition: {
      type: 'integer',
    },
    timestamp: {
      type: 'date',
    },
    userAgent: {
      type: 'text',
      index: false,
    },
    ipAddress: {
      type: 'ip',
    },
    location: {
      type: 'geo_point',
    },
    duration: {
      type: 'integer', // time spent in milliseconds
    },
  },
};

// Search index management class
export class SearchIndexManager {
  /**
   * Initialize all search indices
   */
  static async initializeIndices(): Promise<{
    success: boolean;
    results: { [key: string]: boolean };
    errors: string[];
  }> {
    const results: { [key: string]: boolean } = {};
    const errors: string[] = [];

    try {
      // Create opportunities index
      const opportunitiesResult = await esUtils.createIndex(
        INDICES.OPPORTUNITIES,
        OPPORTUNITIES_MAPPING
      );
      results[INDICES.OPPORTUNITIES] = opportunitiesResult;

      // Create user behavior index
      const userBehaviorResult = await esUtils.createIndex(
        INDICES.USER_BEHAVIOR,
        USER_BEHAVIOR_MAPPING
      );
      results[INDICES.USER_BEHAVIOR] = userBehaviorResult;

      const success = Object.values(results).every(result => result === true);

      return {
        success,
        results,
        errors,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      return {
        success: false,
        results,
        errors,
      };
    }
  }

  /**
   * Delete all search indices
   */
  static async deleteAllIndices(): Promise<{
    success: boolean;
    results: { [key: string]: boolean };
    errors: string[];
  }> {
    const results: { [key: string]: boolean } = {};
    const errors: string[] = [];

    try {
      // Delete opportunities index
      const opportunitiesResult = await esUtils.deleteIndex(
        INDICES.OPPORTUNITIES
      );
      results[INDICES.OPPORTUNITIES] = opportunitiesResult;

      // Delete user behavior index
      const userBehaviorResult = await esUtils.deleteIndex(
        INDICES.USER_BEHAVIOR
      );
      results[INDICES.USER_BEHAVIOR] = userBehaviorResult;

      const success = Object.values(results).every(result => result === true);

      return {
        success,
        results,
        errors,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      return {
        success: false,
        results,
        errors,
      };
    }
  }

  /**
   * Recreate all indices (delete and create)
   */
  static async recreateIndices(): Promise<{
    success: boolean;
    results: { [key: string]: boolean };
    errors: string[];
  }> {
    // First delete all indices
    const deleteResult = await this.deleteAllIndices();

    // Then create them again
    const createResult = await this.initializeIndices();

    return {
      success: deleteResult.success && createResult.success,
      results: { ...deleteResult.results, ...createResult.results },
      errors: [...deleteResult.errors, ...createResult.errors],
    };
  }

  /**
   * Check the health of all indices
   */
  static async checkIndicesHealth(): Promise<{
    healthy: boolean;
    indices: { [key: string]: { exists: boolean; stats?: any } };
    errors: string[];
  }> {
    const indices: { [key: string]: { exists: boolean; stats?: any } } = {};
    const errors: string[] = [];

    try {
      // Check opportunities index
      const opportunitiesExists = await esUtils.indexExists(
        INDICES.OPPORTUNITIES
      );
      indices[INDICES.OPPORTUNITIES] = { exists: opportunitiesExists };

      if (opportunitiesExists) {
        indices[INDICES.OPPORTUNITIES].stats = await esUtils.getIndexStats(
          INDICES.OPPORTUNITIES
        );
      }

      // Check user behavior index
      const userBehaviorExists = await esUtils.indexExists(
        INDICES.USER_BEHAVIOR
      );
      indices[INDICES.USER_BEHAVIOR] = { exists: userBehaviorExists };

      if (userBehaviorExists) {
        indices[INDICES.USER_BEHAVIOR].stats = await esUtils.getIndexStats(
          INDICES.USER_BEHAVIOR
        );
      }

      const healthy = Object.values(indices).every(index => index.exists);

      return {
        healthy,
        indices,
        errors,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);

      return {
        healthy: false,
        indices,
        errors,
      };
    }
  }
}

// Export index configurations
export const INDEX_CONFIGS = {
  [INDICES.OPPORTUNITIES]: {
    mapping: OPPORTUNITIES_MAPPING,
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
      analysis: {
        analyzer: {
          custom_text_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase', 'stop', 'snowball'],
          },
        },
      },
    },
  },
  [INDICES.USER_BEHAVIOR]: {
    mapping: USER_BEHAVIOR_MAPPING,
    settings: {
      number_of_shards: 1,
      number_of_replicas: 0,
      analysis: {
        analyzer: {
          custom_text_analyzer: {
            type: 'custom',
            tokenizer: 'standard',
            filter: ['lowercase', 'stop', 'snowball'],
          },
        },
      },
    },
  },
} as const;
