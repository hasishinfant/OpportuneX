/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.property.test.ts',
    '**/property/**/*.test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/property-setup.ts'],
  testTimeout: 120000, // 2 minutes for property tests
  maxWorkers: '25%', // Use fewer workers for property tests
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  globalSetup: '<rootDir>/src/test/global-setup.ts',
  globalTeardown: '<rootDir>/src/test/global-teardown.ts',
  // Property-based testing specific configuration
  testEnvironmentOptions: {
    PBT_ITERATIONS: process.env.PBT_ITERATIONS || '100',
  },
};