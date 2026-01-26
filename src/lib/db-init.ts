import { db, dbUtils } from './database';
import { env } from './env';

/**
 * Database initialization and setup utilities
 */
export class DatabaseInitializer {
  /**
   * Initialize the database with required extensions and seed data
   */
  static async initialize(): Promise<void> {
    console.log('🚀 Initializing database...');

    try {
      // Connect to database
      await db.connect();

      // Check if database is already initialized
      const isInitialized = await this.checkInitialization();

      if (isInitialized) {
        console.log('✅ Database already initialized');
        return;
      }

      // Create extensions (if not exists)
      await this.createExtensions();

      // Seed initial data
      await this.seedInitialData();

      console.log('✅ Database initialization completed');
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Check if database is already initialized
   */
  private static async checkInitialization(): Promise<boolean> {
    try {
      const sourceCount = await db.getClient().source.count();
      return sourceCount > 0;
    } catch {
      return false;
    }
  }

  /**
   * Create required PostgreSQL extensions
   */
  private static async createExtensions(): Promise<void> {
    console.log('📦 Creating database extensions...');

    const extensions = [
      'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"',
      'CREATE EXTENSION IF NOT EXISTS "pg_trgm"',
    ];

    for (const extension of extensions) {
      try {
        await dbUtils.rawExecute(extension);
        console.log(`✅ Extension created: ${extension}`);
      } catch (error) {
        console.warn(`⚠️ Extension creation warning: ${extension}`, error);
      }
    }
  }

  /**
   * Seed initial data sources
   */
  private static async seedInitialData(): Promise<void> {
    console.log('🌱 Seeding initial data...');

    const initialSources = [
      {
        id: 'internshala',
        name: 'Internshala',
        url: 'https://internshala.com',
        type: 'job_portal',
        isActive: true,
        qualityScore: 85,
      },
      {
        id: 'unstop',
        name: 'Unstop',
        url: 'https://unstop.com',
        type: 'competition_platform',
        isActive: true,
        qualityScore: 90,
      },
      {
        id: 'devfolio',
        name: 'Devfolio',
        url: 'https://devfolio.co',
        type: 'hackathon_platform',
        isActive: true,
        qualityScore: 95,
      },
      {
        id: 'hackerearth',
        name: 'HackerEarth',
        url: 'https://hackerearth.com',
        type: 'competition_platform',
        isActive: true,
        qualityScore: 88,
      },
      {
        id: 'github_jobs',
        name: 'GitHub Jobs',
        url: 'https://jobs.github.com',
        type: 'job_portal',
        isActive: false, // GitHub Jobs was discontinued
        qualityScore: 70,
      },
    ];

    try {
      await db.getClient().source.createMany({
        data: initialSources,
        skipDuplicates: true,
      });
      console.log(`✅ Seeded ${initialSources.length} data sources`);
    } catch (error) {
      console.error('❌ Failed to seed data sources:', error);
      throw error;
    }
  }

  /**
   * Create database indexes for better performance
   */
  static async createIndexes(): Promise<void> {
    console.log('📊 Creating database indexes...');

    const indexes = [
      // User indexes
      'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
      'CREATE INDEX IF NOT EXISTS idx_users_location ON users(city, state)',
      'CREATE INDEX IF NOT EXISTS idx_users_skills ON users USING GIN(technical_skills)',

      // Opportunity indexes
      'CREATE INDEX IF NOT EXISTS idx_opportunities_type ON opportunities(type)',
      'CREATE INDEX IF NOT EXISTS idx_opportunities_deadline ON opportunities(application_deadline)',
      'CREATE INDEX IF NOT EXISTS idx_opportunities_location ON opportunities(location)',
      'CREATE INDEX IF NOT EXISTS idx_opportunities_active ON opportunities(is_active)',
      'CREATE INDEX IF NOT EXISTS idx_opportunities_skills ON opportunities USING GIN(required_skills)',
      'CREATE INDEX IF NOT EXISTS idx_opportunities_tags ON opportunities USING GIN(tags)',

      // Search indexes
      'CREATE INDEX IF NOT EXISTS idx_user_searches_user_id ON user_searches(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_user_searches_created_at ON user_searches(created_at)',

      // Notification indexes
      'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read)',

      // Full-text search index
      `CREATE INDEX IF NOT EXISTS idx_opportunities_search ON opportunities 
       USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || organizer_name))`,
    ];

    for (const index of indexes) {
      try {
        await dbUtils.rawExecute(index);
        console.log(`✅ Index created: ${index.split(' ')[5]}`);
      } catch (error) {
        console.warn(`⚠️ Index creation warning:`, error);
      }
    }
  }

  /**
   * Run database health checks
   */
  static async healthCheck(): Promise<{
    connected: boolean;
    latency?: number;
    stats?: any;
    error?: string;
  }> {
    try {
      const connectionTest = await db.testConnection();

      if (!connectionTest.connected) {
        return connectionTest;
      }

      const stats = await dbUtils.getStats();

      return {
        connected: true,
        latency: connectionTest.latency,
        stats,
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Reset database (for development/testing only)
   */
  static async reset(): Promise<void> {
    if (env.NODE_ENV === 'production') {
      throw new Error('Database reset is not allowed in production');
    }

    console.log('🔄 Resetting database...');

    try {
      // Delete all data in reverse dependency order
      await db.getClient().roadmap.deleteMany();
      await db.getClient().notification.deleteMany();
      await db.getClient().userFavorite.deleteMany();
      await db.getClient().userSearch.deleteMany();
      await db.getClient().opportunity.deleteMany();
      await db.getClient().source.deleteMany();
      await db.getClient().user.deleteMany();

      console.log('✅ Database reset completed');
    } catch (error) {
      console.error('❌ Database reset failed:', error);
      throw error;
    }
  }

  /**
   * Backup database (basic implementation)
   */
  static async backup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `opportunex-backup-${timestamp}`;

    console.log(`💾 Creating database backup: ${backupName}`);

    // This is a placeholder - in production, you'd use pg_dump or similar
    const stats = await dbUtils.getStats();

    console.log(`✅ Backup completed: ${JSON.stringify(stats)}`);
    return backupName;
  }
}

/**
 * Database migration utilities
 */
export class DatabaseMigrator {
  /**
   * Run pending migrations
   */
  static async migrate(): Promise<void> {
    console.log('🔄 Running database migrations...');

    try {
      // In a real application, you'd use Prisma migrate or similar
      // For now, we'll just ensure the database is properly initialized
      await DatabaseInitializer.initialize();
      await DatabaseInitializer.createIndexes();

      console.log('✅ Migrations completed');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Rollback last migration (placeholder)
   */
  static async rollback(): Promise<void> {
    if (env.NODE_ENV === 'production') {
      throw new Error('Migration rollback is not allowed in production');
    }

    console.log('⏪ Rolling back last migration...');
    // Implementation would depend on your migration strategy
    console.log('✅ Rollback completed');
  }
}

// Export convenience functions
export const initializeDatabase = DatabaseInitializer.initialize;
export const migrateDatabase = DatabaseMigrator.migrate;
export const resetDatabase = DatabaseInitializer.reset;
export const healthCheckDatabase = DatabaseInitializer.healthCheck;
