/**
 * Jest setup file for smoke tests
 */

import * as dotenv from 'dotenv';

// Load environment variables based on test environment
const testEnv = process.env.TEST_ENV || 'local';
dotenv.config({ path: `.env.${testEnv}` });

// Set test environment
process.env.NODE_ENV = 'test';

// Smoke test configuration
const SMOKE_TEST_CONFIG = {
  local: {
    baseUrl: 'http://localhost:3000',
    timeout: 30000,
  },
  staging: {
    baseUrl: 'https://staging.opportunex.com',
    timeout: 60000,
  },
  production: {
    baseUrl: 'https://opportunex.com',
    timeout: 60000,
  },
};

const config =
  SMOKE_TEST_CONFIG[testEnv as keyof typeof SMOKE_TEST_CONFIG] ||
  SMOKE_TEST_CONFIG.local;

// Global configuration for smoke tests
global.SMOKE_CONFIG = config;

console.log(`🔥 Smoke tests configured for ${testEnv} environment`);
console.log(`Base URL: ${config.baseUrl}`);

// Set global timeout
jest.setTimeout(config.timeout);

// Helper function for making HTTP requests in smoke tests
export const makeRequest = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const url = `${config.baseUrl}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    return {
      status: response.status,
      ok: response.ok,
      data: await response.json().catch(() => null),
      headers: response.headers,
    };
  } catch (error) {
    throw new Error(`Request to ${url} failed: ${error}`);
  }
};

// Helper function for checking service health
export const checkServiceHealth = async (
  serviceName: string,
  endpoint: string
) => {
  try {
    const response = await makeRequest(endpoint);

    if (response.ok) {
      console.log(`✅ ${serviceName} is healthy`);
      return true;
    } else {
      console.error(
        `❌ ${serviceName} health check failed: ${response.status}`
      );
      return false;
    }
  } catch (error) {
    console.error(`❌ ${serviceName} health check error:`, error);
    return false;
  }
};

// Export configuration for use in tests
export { config as SMOKE_CONFIG };
