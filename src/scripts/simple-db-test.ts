#!/usr/bin/env tsx

/**
 * Simple database connection test
 */

import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

async function testConnection() {
  console.log('🔍 Testing database connection...');
  console.log(
    `🔗 Database URL: ${process.env.DATABASE_URL?.replace(/:[^:@]*@/, ':****@') || 'Not set'}`
  );

  try {
    // Test basic connection
    console.log('\n1️⃣ Testing basic connection...');
    const startTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;
    console.log(`✅ Database connected successfully (${latency}ms)`);

    // Get PostgreSQL version
    console.log('\n2️⃣ Getting PostgreSQL version...');
    const result = await prisma.$queryRaw`SELECT version() as version`;
    console.log(
      `✅ PostgreSQL Version: ${(result as any)[0]?.version?.split(' ')[0] || 'Unknown'}`
    );

    // List tables
    console.log('\n3️⃣ Listing database tables...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;

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

    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED')) {
        console.log(
          '\n💡 Suggestion: Make sure PostgreSQL is running on the specified host and port'
        );
      } else if (error.message.includes('authentication failed')) {
        console.log(
          '\n💡 Suggestion: Check your database credentials in .env.local'
        );
      } else if (
        error.message.includes('database') &&
        error.message.includes('does not exist')
      ) {
        console.log(
          '\n💡 Suggestion: Create the database or check the database name in DATABASE_URL'
        );
      }
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testConnection().catch(error => {
  console.error('❌ Test script failed:', error);
  process.exit(1);
});
