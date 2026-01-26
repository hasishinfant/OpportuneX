#!/usr/bin/env node

import { ApiGateway, defaultApiGatewayConfig } from '../lib/api-gateway';
import { generateToken } from '../lib/middleware/auth';

async function testApiGateway() {
  console.log('🧪 Starting API Gateway manual test...');

  // Set up environment
  process.env.JWT_SECRET = 'test-jwt-secret-for-manual-testing';

  // Create API Gateway
  const config = {
    ...defaultApiGatewayConfig,
    port: 3002, // Use different port for testing
    enableLogging: true,
  };

  const apiGateway = new ApiGateway(config);

  try {
    // Start the server
    await apiGateway.start();
    console.log('✅ API Gateway started successfully');

    // Test basic endpoints
    const baseUrl = `http://localhost:${config.port}/api/${config.apiVersion}`;

    console.log('\n📋 Testing endpoints:');
    console.log(`Health: ${baseUrl}/health`);
    console.log(`Docs: ${baseUrl}/docs`);
    console.log(`Search: ${baseUrl}/search/popular`);

    // Generate test token
    const token = generateToken({
      id: 'test-user-123',
      email: 'test@example.com',
      role: 'user',
    });

    console.log('\n🔑 Generated test JWT token');
    console.log(`Protected endpoint example: ${baseUrl}/users/profile`);
    console.log(`Authorization: Bearer ${token.substring(0, 20)}...`);

    console.log('\n✅ API Gateway is ready for testing!');
    console.log('Press Ctrl+C to stop the server');

    // Keep the server running
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down API Gateway...');
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Failed to start API Gateway:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testApiGateway();
}

export { testApiGateway };
