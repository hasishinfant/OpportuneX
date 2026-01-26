/**
 * Global setup for Jest tests
 */

import * as dotenv from 'dotenv';

export default async function globalSetup() {
  console.log('🚀 Starting global test setup...');

  // Load test environment variables
  dotenv.config({ path: '.env.test' });

  // Set test environment
  process.env.NODE_ENV = 'test';

  // Wait for services to be ready (if running in CI)
  if (process.env.CI) {
    console.log('⏳ Waiting for CI services to be ready...');

    // Wait for PostgreSQL
    await waitForService('PostgreSQL', async () => {
      const { exec } = require('child_process');
      return new Promise(resolve => {
        exec('pg_isready -h localhost -p 5432 -U postgres', (error: any) => {
          resolve(!error);
        });
      });
    });

    // Wait for Redis
    await waitForService('Redis', async () => {
      const { exec } = require('child_process');
      return new Promise(resolve => {
        exec(
          'redis-cli -h localhost -p 6379 ping',
          (error: any, stdout: string) => {
            resolve(!error && stdout.trim() === 'PONG');
          }
        );
      });
    });

    // Wait for Elasticsearch
    await waitForService('Elasticsearch', async () => {
      try {
        const response = await fetch('http://localhost:9200/_cluster/health');
        return response.ok;
      } catch {
        return false;
      }
    });
  }

  console.log('✅ Global test setup completed');
}

async function waitForService(
  serviceName: string,
  healthCheck: () => Promise<boolean>,
  maxAttempts = 30,
  delayMs = 2000
) {
  console.log(`⏳ Waiting for ${serviceName}...`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const isHealthy = await healthCheck();
      if (isHealthy) {
        console.log(`✅ ${serviceName} is ready`);
        return;
      }
    } catch (error) {
      // Service not ready yet
    }

    if (attempt < maxAttempts) {
      console.log(
        `⏳ ${serviceName} not ready, attempt ${attempt}/${maxAttempts}, retrying in ${delayMs}ms...`
      );
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw new Error(
    `❌ ${serviceName} failed to become ready after ${maxAttempts} attempts`
  );
}
