/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/*.smoke.test.ts',
    '**/smoke/**/*.test.ts'
  ],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test/smoke-setup.ts'],
  testTimeout: 30000,
  maxWorkers: 1, // Run smoke tests sequentially
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
};