/**
 * Global teardown for Jest tests
 */

export default async function globalTeardown() {
  console.log('🧹 Starting global test teardown...');

  // Clean up any global resources
  // This is where you would close database connections,
  // stop test servers, clean up temporary files, etc.

  // Force exit to ensure all processes are terminated
  setTimeout(() => {
    console.log('🔚 Forcing process exit...');
    process.exit(0);
  }, 5000);

  console.log('✅ Global test teardown completed');
}
