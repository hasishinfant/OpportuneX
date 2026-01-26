#!/usr/bin/env tsx

/**
 * Database connection test script
 * This script tests the database connection and displays basic information
 */

import { db, dbUtils } from '../lib/database';
import { env } from '../lib/env';

async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  console.log(`📍 Environment: ${env.NODE_ENV}`);
  console.log(
    `🔗 Database URL: ${env.DATABASE_URL.replace(/:[^:@]*@/, ':****@')}`
  );

  try {
    // Test basic connection
    console.log('\n1️⃣ Testing basic connection...');
    const connectionTest = await db.testConnection();

    if (connectionTest.connected) {
      console.log(
        `✅ Database connected successfully (${connectionTest.latency}ms)`
      );
    } else {
      console.log(`❌ Database connection failed: ${connectionTest.error}`);
      return;
    }

    // Test health check
    console.log('\n2️⃣ Running health check...');
    const isHealthy = await db.healthCheck();
    console.log(
      `${isHealthy ? '✅' : '❌'} Health check: ${isHealthy ? 'PASSED' : 'FAILED'}`
    );

    // Get database statistics
    console.log('\n3️⃣ Fetching database statistics...');
    const stats = await dbUtils.getStats();
    console.log('📊 Database Statistics:');
    console.log(`   Users: ${stats.users}`);
    console.log(`   Opportunities: ${stats.opportunities}`);
    console.log(`   Sources: ${stats.sources}`);
    console.log(`   Searches: ${stats.searches}`);
    console.log(`   Notifications: ${stats.notifications}`);

    // Test raw query
    console.log('\n4️⃣ Testing raw query...');
    const result = await dbUtils.rawQuery('SELECT version() as version');
    console.log(
      `✅ PostgreSQL Version: ${(result as any)[0]?.version?.split(' ')[0] || 'Unknown'}`
    );

    // List all tables
    console.log('\n5️⃣ Listing database tables...');
    const tables = await dbUtils.rawQuery(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    if (Array.isArray(tables) && tables.length > 0) {
      console.log('📋 Tables found:');
      tables.forEach((table: any) => {
        console.log(`   - ${table.table_name}`);
      });
    } else {
      console.log('⚠️ No tables found - database may need to be migrated');
    }

    console.log('\n✅ Database connection test completed successfully!');
  } catch (error) {
    console.error('\n❌ Database connection test failed:', error);
    process.exit(1);
  } finally {
    await db.disconnect();
  }
}

// Run the test
testDatabaseConnection().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
