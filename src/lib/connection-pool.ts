import { Pool, PoolClient } from 'pg';
import { prisma } from './database';

/**
 * Database Connection Pool Manager
 * Provides optimized connection pooling for high-performance database operations
 */

interface PoolConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max: number;
  min: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  maxUses: number;
}

class ConnectionPoolManager {
  private pool: Pool | null = null;
  private config: PoolConfig;

  constructor() {
    this.config = this.parseConnectionString();
  }

  private parseConnectionString(): PoolConfig {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    const url = new URL(connectionString);
    
    return {
      host: url.hostname,
      port: parseInt(url.port) || 5432,
      database: url.pathname.slice(1),
      user: url.username,
      password: url.password,
      max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum connections
      min: parseInt(process.env.DB_POOL_MIN || '5'),  // Minimum connections
      idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'), // 30 seconds
      connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || '10000'), // 10 seconds
      maxUses: parseInt(process.env.DB_MAX_USES || '7500'), // Max uses per connection
    };
  }

  /**
   * Initialize the connection pool
   */
  public async initialize(): Promise<void> {
    if (this.pool) {
      return; // Already initialized
    }

    this.pool = new Pool({
      ...this.config,
      // Additional pool configuration
      application_name: 'opportunex-api',
      statement_timeout: 30000, // 30 seconds
      query_timeout: 30000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    });

    // Handle pool events
    this.pool.on('connect', (client: PoolClient) => {
      console.log('✅ New database connection established');
      
      // Set session configuration for optimal performance
      client.query(`
        SET search_path TO public;
        SET timezone TO 'UTC';
        SET statement_timeout TO '30s';
        SET lock_timeout TO '10s';
        SET idle_in_transaction_session_timeout TO '60s';
      `).catch(err => {
        console.error('❌ Failed to configure database session:', err);
      });
    });

    this.pool.on('error', (err: Error) => {
      console.error('❌ Database pool error:', err);
    });

    this.pool.on('remove', () => {
      console.log('🔄 Database connection removed from pool');
    });

    // Test the connection
    try {
      const client = await this.pool.connect();
      await client.query('SELECT 1');
      client.release();
      console.log('✅ Database connection pool initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database connection pool:', error);
      throw error;
    }
  }

  /**
   * Get a client from the pool
   */
  public async getClient(): Promise<PoolClient> {
    if (!this.pool) {
      await this.initialize();
    }
    return this.pool!.connect();
  }

  /**
   * Execute a query with automatic connection management
   */
  public async query<T = any>(text: string, params?: any[]): Promise<T> {
    const client = await this.getClient();
    try {
      const start = Date.now();
      const result = await client.query(text, params);
      const duration = Date.now() - start;
      
      // Log slow queries
      if (duration > 1000) {
        console.warn(`🐌 Slow query detected (${duration}ms):`, text.substring(0, 100));
      }
      
      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a transaction with automatic rollback on error
   */
  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get pool statistics
   */
  public getStats() {
    if (!this.pool) {
      return null;
    }

    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
      maxConnections: this.config.max,
      minConnections: this.config.min,
    };
  }

  /**
   * Close all connections in the pool
   */
  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      console.log('✅ Database connection pool closed');
    }
  }

  /**
   * Health check for the connection pool
   */
  public async healthCheck(): Promise<{
    healthy: boolean;
    stats?: any;
    error?: string;
  }> {
    try {
      if (!this.pool) {
        await this.initialize();
      }

      const client = await this.getClient();
      const start = Date.now();
      await client.query('SELECT 1');
      const latency = Date.now() - start;
      client.release();

      return {
        healthy: true,
        stats: {
          ...this.getStats(),
          latency,
        },
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Singleton instance
export const connectionPool = new ConnectionPoolManager();

// Graceful shutdown handler
process.on('SIGINT', async () => {
  console.log('🔄 Gracefully shutting down database connections...');
  await connectionPool.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🔄 Gracefully shutting down database connections...');
  await connectionPool.close();
  await prisma.$disconnect();
  process.exit(0);
});

// Optimized query helpers using the connection pool
export const poolQueries = {
  /**
   * Execute a raw SQL query with connection pooling
   */
  async raw<T = any>(query: string, params?: any[]): Promise<T> {
    return connectionPool.query<T>(query, params);
  },

  /**
   * Execute multiple queries in a transaction
   */
  async batch(queries: Array<{ query: string; params?: any[] }>): Promise<any[]> {
    return connectionPool.transaction(async (client) => {
      const results = [];
      for (const { query, params } of queries) {
        const result = await client.query(query, params);
        results.push(result.rows);
      }
      return results;
    });
  },

  /**
   * Bulk insert with optimized performance
   */
  async bulkInsert(
    table: string,
    columns: string[],
    values: any[][],
    onConflict?: string
  ): Promise<void> {
    if (values.length === 0) return;

    const placeholders = values
      .map((_, i) => 
        `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')})`
      )
      .join(', ');

    const flatValues = values.flat();
    const conflictClause = onConflict ? `ON CONFLICT ${onConflict}` : '';
    
    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${placeholders}
      ${conflictClause}
    `;

    await connectionPool.query(query, flatValues);
  },

  /**
   * Optimized count query with conditions
   */
  async count(table: string, conditions?: string, params?: any[]): Promise<number> {
    const whereClause = conditions ? `WHERE ${conditions}` : '';
    const query = `SELECT COUNT(*) as count FROM ${table} ${whereClause}`;
    const result = await connectionPool.query<{ count: string }>(query, params);
    return parseInt(result[0].count);
  },

  /**
   * Execute VACUUM and ANALYZE for table maintenance
   */
  async maintenance(tables?: string[]): Promise<void> {
    const tablesToMaintain = tables || [
      'opportunities',
      'users',
      'user_searches',
      'user_favorites',
      'notifications',
      'sources',
      'roadmaps',
    ];

    for (const table of tablesToMaintain) {
      try {
        await connectionPool.query(`VACUUM ANALYZE ${table}`);
        console.log(`✅ Maintenance completed for table: ${table}`);
      } catch (error) {
        console.error(`❌ Maintenance failed for table ${table}:`, error);
      }
    }
  },
};

export default connectionPool;