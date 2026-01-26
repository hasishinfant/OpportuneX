#!/usr/bin/env node

/**
 * Health check script for API Gateway
 * Used by Docker HEALTHCHECK instruction
 */

const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 8080,
  path: '/health',
  method: 'GET',
  timeout: 3000,
};

const request = http.request(options, (res) => {
  if (res.statusCode === 200) {
    console.log('API Gateway health check passed');
    process.exit(0);
  } else {
    console.error(`API Gateway health check failed with status: ${res.statusCode}`);
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.error(`API Gateway health check failed: ${err.message}`);
  process.exit(1);
});

request.on('timeout', () => {
  console.error('API Gateway health check timed out');
  request.destroy();
  process.exit(1);
});

request.end();