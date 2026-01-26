import { Client } from '@elastic/elasticsearch';
import { elasticsearchConfig, env } from './env';

// Global variable to store the Elasticsearch client instance
declare global {
  // eslint-disable-next-line no-var
  var elasticsearch: Client | undefined;
}

// Create Elasticsearch client configuration
const createElasticsearchClient = (): Client => {
  if (!elasticsearchConfig) {
    throw new Error(
      'Elasticsearch configuration is missing. Please set ELASTICSEARCH_URL in your environment variables.'
    );
  }

  const clientConfig: any = {
    node: elasticsearchConfig.node,
    requestTimeout: elasticsearchConfig.requestTimeout,
    maxRetries: elasticsearchConfig.maxRetries,
  };

  // Add authentication if provided
  // For now, we'll skip auth since it's not in our simple config

  return new Client(clientConfig);
};

// Create a single instance of Elasticsearch client
// In development, use global variable to prevent multiple instances
// In production, create a new instance each time
export const elasticsearch =
  globalThis.elasticsearch || createElasticsearchClient();

// In development, store the instance globally to prevent multiple connections
if (env.NODE_ENV === 'development') {
  globalThis.elasticsearch = elasticsearch;
}

// Elasticsearch connection utility class
export class ElasticsearchConnection {
  private static instance: ElasticsearchConnection;
  private client: Client;

  private constructor() {
    this.client = elasticsearch;
  }

  public static getInstance(): ElasticsearchConnection {
    if (!ElasticsearchConnection.instance) {
      ElasticsearchConnection.instance = new ElasticsearchConnection();
    }
    return ElasticsearchConnection.instance;
  }

  public getClient(): Client {
    return this.client;
  }

  public async connect(): Promise<void> {
    try {
      const response = await this.client.ping();
      if (response) {
        console.log('✅ Elasticsearch connected successfully');
      }
    } catch (error) {
      console.error('❌ Elasticsearch connection failed:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.close();
      console.log('✅ Elasticsearch disconnected successfully');
    } catch (error) {
      console.error('❌ Elasticsearch disconnection failed:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.cluster.health();
      return response.status === 'green' || response.status === 'yellow';
    } catch (error) {
      console.error('❌ Elasticsearch health check failed:', error);
      return false;
    }
  }

  public async testConnection(): Promise<{
    connected: boolean;
    status?: string;
    version?: string;
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const [pingResponse, infoResponse] = await Promise.all([
        this.client.ping(),
        this.client.info(),
      ]);

      const latency = Date.now() - startTime;

      return {
        connected: true,
        status: 'healthy',
        version: infoResponse.version?.number,
        latency,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export the default instance
export const esClient = ElasticsearchConnection.getInstance();

// Index names constants
export const INDICES = {
  OPPORTUNITIES: 'opportunities',
  USER_BEHAVIOR: 'user_behavior',
} as const;

// Elasticsearch utility functions
export const esUtils = {
  /**
   * Check if an index exists
   */
  async indexExists(indexName: string): Promise<boolean> {
    try {
      const response = await elasticsearch.indices.exists({ index: indexName });
      return response;
    } catch (error) {
      console.error(`Error checking if index ${indexName} exists:`, error);
      return false;
    }
  },

  /**
   * Create an index with mapping
   */
  async createIndex(indexName: string, mapping: any): Promise<boolean> {
    try {
      const exists = await this.indexExists(indexName);
      if (exists) {
        console.log(`Index ${indexName} already exists`);
        return true;
      }

      await elasticsearch.indices.create({
        index: indexName,
        mappings: mapping,
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
      });

      console.log(`✅ Index ${indexName} created successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to create index ${indexName}:`, error);
      return false;
    }
  },

  /**
   * Delete an index
   */
  async deleteIndex(indexName: string): Promise<boolean> {
    try {
      const exists = await this.indexExists(indexName);
      if (!exists) {
        console.log(`Index ${indexName} does not exist`);
        return true;
      }

      await elasticsearch.indices.delete({ index: indexName });
      console.log(`✅ Index ${indexName} deleted successfully`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to delete index ${indexName}:`, error);
      return false;
    }
  },

  /**
   * Refresh an index
   */
  async refreshIndex(indexName: string): Promise<boolean> {
    try {
      await elasticsearch.indices.refresh({ index: indexName });
      return true;
    } catch (error) {
      console.error(`❌ Failed to refresh index ${indexName}:`, error);
      return false;
    }
  },

  /**
   * Get index statistics
   */
  async getIndexStats(indexName: string): Promise<any> {
    try {
      const response = await elasticsearch.indices.stats({ index: indexName });
      return response;
    } catch (error) {
      console.error(`❌ Failed to get stats for index ${indexName}:`, error);
      return null;
    }
  },

  /**
   * Bulk index documents
   */
  async bulkIndex(
    indexName: string,
    documents: any[]
  ): Promise<{
    success: boolean;
    indexed: number;
    errors: any[];
  }> {
    try {
      const body = documents.flatMap(doc => [
        { index: { _index: indexName, _id: doc.id } },
        doc,
      ]);

      const response = await elasticsearch.bulk({
        operations: body,
      });

      const errors = response.items
        .filter((item: any) => item.index?.error)
        .map((item: any) => item.index.error);

      return {
        success: !response.errors,
        indexed: documents.length - errors.length,
        errors,
      };
    } catch (error) {
      console.error(`❌ Bulk indexing failed for ${indexName}:`, error);
      return {
        success: false,
        indexed: 0,
        errors: [error],
      };
    }
  },

  /**
   * Search documents
   */
  async search(indexName: string, query: any): Promise<any> {
    try {
      const response = await elasticsearch.search({
        index: indexName,
        ...query,
      });
      return response;
    } catch (error) {
      console.error(`❌ Search failed for index ${indexName}:`, error);
      throw error;
    }
  },

  /**
   * Count documents
   */
  async count(indexName: string, query?: any): Promise<number> {
    try {
      const response = await elasticsearch.count({
        index: indexName,
        ...(query ? { query } : {}),
      });
      return response.count;
    } catch (error) {
      console.error(`❌ Count failed for index ${indexName}:`, error);
      return 0;
    }
  },
};

// Export Elasticsearch client for direct use
export { elasticsearch as default };
