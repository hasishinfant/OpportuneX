/**
 * Jest setup file for property-based tests
 */

import * as dotenv from 'dotenv';
import * as fc from 'fast-check';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';

// Configure fast-check for property-based testing
const PBT_ITERATIONS = parseInt(process.env.PBT_ITERATIONS || '100', 10);

// Global fast-check configuration
fc.configureGlobal({
  numRuns: PBT_ITERATIONS,
  verbose: true,
  seed: process.env.PBT_SEED ? parseInt(process.env.PBT_SEED, 10) : undefined,
  path: process.env.PBT_PATH || undefined,
  endOnFailure: true,
});

console.log(
  `🧪 Property-based testing configured with ${PBT_ITERATIONS} iterations`
);

// Custom property test wrapper with better error reporting
export const propertyTest = (
  name: string,
  property: fc.Property<any>,
  params?: fc.Parameters<any>
) => {
  return test(name, async () => {
    try {
      await fc.assert(property, {
        ...params,
        numRuns: PBT_ITERATIONS,
        verbose: true,
      });
    } catch (error) {
      console.error(`Property test failed: ${name}`);
      console.error('Error details:', error);
      throw error;
    }
  });
};

// Export fast-check for use in tests
export { fc };

// Global test timeout for property tests
jest.setTimeout(120000); // 2 minutes

// Property test result tracking
const propertyTestResults: Array<{
  name: string;
  status: 'passed' | 'failed';
  iterations: number;
  counterExample?: any;
  error?: string;
}> = [];

// Track property test results
const originalTest = global.test;
global.test = (name: string, fn: any, timeout?: number) => {
  return originalTest(
    name,
    async () => {
      const startTime = Date.now();
      try {
        await fn();
        propertyTestResults.push({
          name,
          status: 'passed',
          iterations: PBT_ITERATIONS,
        });
      } catch (error) {
        propertyTestResults.push({
          name,
          status: 'failed',
          iterations: PBT_ITERATIONS,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    },
    timeout
  );
};

// Report property test results after all tests
afterAll(() => {
  console.log('\n📊 Property-Based Testing Results:');
  console.log('=====================================');

  const passed = propertyTestResults.filter(r => r.status === 'passed').length;
  const failed = propertyTestResults.filter(r => r.status === 'failed').length;

  console.log(`Total tests: ${propertyTestResults.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Iterations per test: ${PBT_ITERATIONS}`);

  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    propertyTestResults
      .filter(r => r.status === 'failed')
      .forEach(result => {
        console.log(`  - ${result.name}: ${result.error}`);
      });
  }

  console.log('=====================================\n');
});
