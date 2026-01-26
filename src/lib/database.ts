import { PrismaClient } from '@prisma/client';

// Global variable to store the Prisma client instance
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Create a single instance of PrismaClient with optimized configuration
// In development, use global variable to prevent multiple instances
// In production, create a new instance each time
export const prisma =
  globalThis.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
    // Connection pooling configuration
    __internal: {
      engine: {
        // Connection pool settings for better performance
        connection_limit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
        pool_timeout: parseInt(process.env.DB_POOL_TIMEOUT || '10'),
        schema_cache_size: parseInt(process.env.DB_SCHEMA_CACHE_SIZE || '1000'),
      },
    },
  });

// In development, store the instance globally to prevent multiple connections
if (process.env.NODE_ENV === 'development') {
  globalThis.prisma = prisma;
}

// Database connection utility functions
export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private client: PrismaClient;

  private constructor() {
    this.client = prisma;
  }

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public getClient(): PrismaClient {
    return this.client;
  }

  public async connect(): Promise<void> {
    try {
      await this.client.$connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    try {
      await this.client.$disconnect();
      console.log('✅ Database disconnected successfully');
    } catch (error) {
      console.error('❌ Database disconnection failed:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      await this.client.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('❌ Database health check failed:', error);
      return false;
    }
  }

  public async testConnection(): Promise<{
    connected: boolean;
    latency?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      await this.client.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;

      return {
        connected: true,
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
export const db = DatabaseConnection.getInstance();

// Database utility functions
export const dbUtils = {
  /**
   * Execute a transaction with automatic rollback on error
   */
  async transaction<T>(
    callback: (
      tx: Omit<
        PrismaClient,
        '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends'
      >
    ) => Promise<T>
  ): Promise<T> {
    return await prisma.$transaction(callback);
  },

  /**
   * Execute raw SQL query
   */
  async rawQuery<T = unknown>(query: string, ...params: unknown[]): Promise<T> {
    return await prisma.$queryRawUnsafe(query, ...params);
  },

  /**
   * Execute raw SQL command (INSERT, UPDATE, DELETE)
   */
  async rawExecute(query: string, ...params: unknown[]): Promise<number> {
    return await prisma.$executeRawUnsafe(query, ...params);
  },

  /**
   * Get database statistics
   */
  async getStats(): Promise<{
    users: number;
    opportunities: number;
    sources: number;
    searches: number;
    notifications: number;
  }> {
    const [users, opportunities, sources, searches, notifications] =
      await Promise.all([
        prisma.user.count(),
        prisma.opportunity.count(),
        prisma.source.count(),
        prisma.userSearch.count(),
        prisma.notification.count(),
      ]);

    return {
      users,
      opportunities,
      sources,
      searches,
      notifications,
    };
  },

  /**
   * Clean up expired data
   */
  async cleanup(): Promise<{
    expiredOpportunities: number;
    oldSearches: number;
    readNotifications: number;
  }> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [expiredOpportunities, oldSearches, readNotifications] =
      await Promise.all([
        // Mark opportunities as inactive if deadline has passed
        prisma.opportunity.updateMany({
          where: {
            applicationDeadline: {
              lt: new Date(),
            },
            isActive: true,
          },
          data: {
            isActive: false,
          },
        }),
        // Delete old search records (older than 30 days)
        prisma.userSearch.deleteMany({
          where: {
            createdAt: {
              lt: thirtyDaysAgo,
            },
          },
        }),
        // Delete read notifications older than 7 days
        prisma.notification.deleteMany({
          where: {
            isRead: true,
            createdAt: {
              lt: sevenDaysAgo,
            },
          },
        }),
      ]);

    return {
      expiredOpportunities: expiredOpportunities.count,
      oldSearches: oldSearches.count,
      readNotifications: readNotifications.count,
    };
  },
};

// Export Prisma client for direct use
export { prisma as default };
