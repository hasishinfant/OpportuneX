#!/usr/bin/env node

import { config } from 'dotenv';
import { ApiGateway, defaultApiGatewayConfig } from '../lib/api-gateway';

// Load environment variables
config();

/**
 * Start the API Gateway server
 */
async function startServer() {
  try {
    // Create API Gateway instance
    const apiGateway = new ApiGateway(defaultApiGatewayConfig);

    // Start the server
    await apiGateway.start();

    console.log('✅ API Gateway started successfully');
    console.log(`🌐 Server running on port ${defaultApiGatewayConfig.port}`);
    console.log(
      `📖 API Documentation: http://localhost:${defaultApiGatewayConfig.port}/api/${defaultApiGatewayConfig.apiVersion}/docs`
    );
    console.log(
      `🏥 Health Check: http://localhost:${defaultApiGatewayConfig.port}/api/${defaultApiGatewayConfig.apiVersion}/health`
    );

    // Handle graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);
  } catch (error) {
    console.error('❌ Failed to start API Gateway:', error);
    process.exit(1);
  }
}

/**
 * Graceful shutdown handler
 */
function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

  // TODO: Close database connections, cleanup resources, etc.

  console.log('✅ Graceful shutdown completed');
  process.exit(0);
}

// Start the server if this file is run directly
if (require.main === module) {
  startServer();
}

export { startServer };
